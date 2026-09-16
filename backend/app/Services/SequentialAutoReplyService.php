<?php

namespace App\Services;

use App\Models\MessageLog;
use App\Models\ScheduledMessage;
use App\Models\TelegramAutoReplySequence;
use App\Models\TelegramAutoReplyStep;
use App\Models\TelegramConversation;
use App\Models\TelegramConversationState;
use App\Models\TelegramFollowupQueue;
use App\Models\TelegramMessage;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class SequentialAutoReplyService
{
    public function __construct(
        protected VariableReplacerService $variableReplacer,
        protected TelegramBridgeClient $bridgeClient
    ) {}

    /**
     * Process an inbound reply from a traffic contact and advance sequential auto reply step.
     */
    public function processReply(TelegramConversation $conversation, string $text = ''): array
    {
        // 1. Get or create conversation state
        $state = TelegramConversationState::firstOrCreate(
            ['conversation_id' => $conversation->id],
            ['current_auto_reply_step' => 0, 'current_followup_step' => 0]
        );

        // 2. Cancel pending follow-ups if stop_on_reply is enabled
        $this->cancelFollowupsOnReplyIfConfigured($conversation, $state);

        // 3. Find active auto reply sequence
        $sequence = null;
        if ($state->auto_reply_sequence_id) {
            $sequence = TelegramAutoReplySequence::with(['steps' => fn($q) => $q->where('is_active', true)->orderBy('step_number', 'asc')])
                ->find($state->auto_reply_sequence_id);
        }

        if (!$sequence || $sequence->status !== 'active') {
            $sequence = TelegramAutoReplySequence::where('status', 'active')
                ->where(function ($q) use ($conversation) {
                    $q->where('account_id', $conversation->account_id)
                      ->orWhereNull('account_id');
                })
                ->with(['steps' => fn($q) => $q->where('is_active', true)->orderBy('step_number', 'asc')])
                ->latest()
                ->first();

            if ($sequence) {
                $state->auto_reply_sequence_id = $sequence->id;
                $state->save();
            }
        }

        if (!$sequence || $sequence->steps->isEmpty()) {
            return ['status' => 'no_active_auto_reply_sequence'];
        }

        // 4. Calculate next step: current + 1
        $currentStepNum = $state->current_auto_reply_step;
        $nextStepNum = $currentStepNum + 1;

        $stepToSend = $sequence->steps->firstWhere('step_number', $nextStepNum);

        if (!$stepToSend) {
            // Sequence reached the end
            return [
                'status' => 'sequence_completed',
                'sequence_id' => $sequence->id,
                'total_steps_executed' => $currentStepNum,
            ];
        }

        // 5. Update state
        $state->current_auto_reply_step = $nextStepNum;
        $state->last_auto_reply_sent_at = now();
        $state->save();

        // 6. Compute delay and personalize text
        $delaySeconds = $stepToSend->getDelayInSeconds();
        $user = $conversation->telegramUser;
        $renderedText = $this->variableReplacer->replace($stepToSend->message_text, $user);

        // Append Links if any
        if (!empty($stepToSend->links) && is_array($stepToSend->links)) {
            $linksBlock = "\n\n🔗 Helpful Links:";
            foreach ($stepToSend->links as $link) {
                if (!empty($link['url'])) {
                    $lbl = $link['label'] ?? $link['url'];
                    $linksBlock .= "\n• [{$lbl}]({$link['url']})";
                }
            }
            $renderedText .= $linksBlock;
        }

        // 7. Dispatch or schedule
        if ($delaySeconds <= 0) {
            $this->dispatchStepDirectly($conversation, $stepToSend, $renderedText);
            $stepToSend->increment('sent_count');
            $sequence->increment('total_contacts');

            return [
                'status' => 'step_sent_immediately',
                'step_number' => $nextStepNum,
                'sequence_name' => $sequence->name,
                'rendered_text' => $renderedText,
            ];
        } else {
            // Scheduled via queue
            $scheduledAt = Carbon::now()->addSeconds($delaySeconds);
            ScheduledMessage::create([
                'conversation_id' => $conversation->id,
                'campaign_id' => null,
                'step_id' => null,
                'template_id' => $stepToSend->id, // reference step
                'scheduled_at' => $scheduledAt,
                'status' => 'pending',
                'error_log' => json_encode([
                    'type' => 'sequential_auto_reply',
                    'step_id' => $stepToSend->id,
                    'step_number' => $nextStepNum,
                    'rendered_text' => $renderedText,
                ]),
            ]);

            return [
                'status' => 'step_scheduled',
                'step_number' => $nextStepNum,
                'sequence_name' => $sequence->name,
                'delay_seconds' => $delaySeconds,
                'scheduled_at' => $scheduledAt->toISOString(),
            ];
        }
    }

    /**
     * Cancel pending follow-up timers if campaign has stop_on_reply = true
     */
    protected function cancelFollowupsOnReplyIfConfigured(TelegramConversation $conversation, TelegramConversationState $state): void
    {
        // Check active followup campaigns
        $campaigns = \App\Models\FollowupCampaign::where('status', 'active')
            ->where(function ($q) use ($conversation) {
                $q->where('account_id', $conversation->account_id)->orWhereNull('account_id');
            })
            ->where('stop_on_reply', true)
            ->get();

        if ($campaigns->isNotEmpty()) {
            // 1. Cancel in telegram_followup_queue
            TelegramFollowupQueue::where('conversation_id', $conversation->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'cancelled',
                    'error_message' => 'User replied; follow-up sequence terminated per stop_on_reply rule',
                ]);

            // 2. Cancel in scheduled_messages
            ScheduledMessage::where('conversation_id', $conversation->id)
                ->where('status', 'pending')
                ->whereNotNull('campaign_id')
                ->update([
                    'status' => 'cancelled',
                    'error_log' => 'User replied; follow-up sequence terminated per stop_on_reply rule',
                ]);

            $state->is_followup_stopped = true;
            $state->save();

            MessageLog::create([
                'account_id' => $conversation->account_id,
                'conversation_id' => $conversation->id,
                'event_type' => 'followup_stopped_on_reply',
                'payload' => ['reason' => 'User replied to conversation'],
                'status' => 'cancelled',
            ]);
        }
    }

    /**
     * Dispatch auto reply step message directly via MTProto bridge
     */
    protected function dispatchStepDirectly(TelegramConversation $conversation, TelegramAutoReplyStep $step, string $content): void
    {
        $account = $conversation->account;
        $user = $conversation->telegramUser;

        if (!$account || !$user) {
            return;
        }

        try {
            $mediaPath = $step->media_url ?: ($step->media?->file_path ? storage_path('app/public/' . $step->media->file_path) : null);

            $this->bridgeClient->sendMessage(
                accountId: (string)$account->id,
                recipientId: (int)$user->telegram_id,
                content: $content,
                mediaPath: $mediaPath,
                messageType: $step->media_type ?: 'text'
            );

            // Record outbound message in chat log
            TelegramMessage::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'sender_id' => (int)$account->telegram_id,
                'message_type' => $step->media_type ?: 'text',
                'content' => $content,
                'media_path' => $mediaPath,
                'status' => 'sent',
            ]);

            MessageLog::create([
                'account_id' => $account->id,
                'conversation_id' => $conversation->id,
                'event_type' => 'sequential_auto_reply_sent',
                'payload' => [
                    'step_number' => $step->step_number,
                    'content' => $content,
                ],
                'status' => 'sent',
            ]);
        } catch (Exception $e) {
            Log::error('Failed to dispatch sequential auto reply: ' . $e->getMessage());
        }
    }
}
