<?php

namespace App\Services;

use App\Models\FollowupCampaign;
use App\Models\FollowupStep;
use App\Models\MessageLog;
use App\Models\TelegramConversation;
use App\Models\TelegramConversationState;
use App\Models\TelegramFollowupQueue;
use App\Models\TelegramMessage;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SequentialFollowupSchedulerService
{
    public function __construct(
        protected VariableReplacerService $variableReplacer,
        protected TelegramBridgeClient $bridgeClient
    ) {}

    /**
     * Enroll a conversation into a sequential follow-up campaign and schedule Step 1.
     */
    public function enrollContact(FollowupCampaign $campaign, TelegramConversation $conversation): array
    {
        $firstStep = $campaign->steps()->orderBy('step_order', 'asc')->first();
        if (!$firstStep) {
            return ['status' => 'error', 'message' => 'Campaign has no configured follow-up steps'];
        }

        $idempotencyKey = "{$campaign->id}:{$conversation->id}:{$firstStep->id}";

        // Prevent duplicate enrollment
        $existing = TelegramFollowupQueue::where('idempotency_key', $idempotencyKey)->first();
        if ($existing) {
            return ['status' => 'already_enrolled', 'queue_id' => $existing->id];
        }

        // Calculate scheduled time
        $scheduledAt = $this->calculateStepExecutionTime($firstStep, Carbon::now(), $campaign->timezone ?: 'UTC');
        $scheduledAt = $this->adjustForWorkingAndQuietHours($scheduledAt, $campaign);

        $queueItem = TelegramFollowupQueue::create([
            'idempotency_key' => $idempotencyKey,
            'campaign_id' => $campaign->id,
            'conversation_id' => $conversation->id,
            'telegram_user_id' => $conversation->telegramUser->telegram_id,
            'step_id' => $firstStep->id,
            'step_order' => $firstStep->step_order,
            'scheduled_at' => $scheduledAt,
            'status' => 'pending',
        ]);

        // Update state
        $state = TelegramConversationState::firstOrCreate(
            ['conversation_id' => $conversation->id],
            ['current_auto_reply_step' => 0]
        );
        $state->followup_campaign_id = $campaign->id;
        $state->current_followup_step = 1;
        $state->is_followup_stopped = false;
        $state->save();

        $campaign->increment('total_users');
        $campaign->increment('active_users');

        return [
            'status' => 'enrolled',
            'queue_id' => $queueItem->id,
            'queue_item' => $queueItem,
            'step_order' => 1,
            'scheduled_at' => $scheduledAt->toISOString(),
        ];
    }

    /**
     * Convenient helper returning the TelegramFollowupQueue model directly
     */
    public function enrollConversation(FollowupCampaign $campaign, TelegramConversation $conversation): ?TelegramFollowupQueue
    {
        $res = $this->enrollContact($campaign, $conversation);
        if (isset($res['queue_item'])) {
            return $res['queue_item'];
        }
        if (isset($res['queue_id'])) {
            return TelegramFollowupQueue::find($res['queue_id']);
        }
        return null;
    }

    /**
     * Process pending queue items due for dispatch.
     */
    public function processDueQueue(int $limit = 25): int
    {
        $now = Carbon::now();

        $dueItems = TelegramFollowupQueue::with(['campaign', 'conversation.telegramUser', 'conversation.account', 'step'])
            ->where('status', 'pending')
            ->where('scheduled_at', '<=', $now)
            ->orderBy('scheduled_at', 'asc')
            ->limit($limit)
            ->get();

        $processedCount = 0;

        foreach ($dueItems as $item) {
            $campaign = $item->campaign;
            $conversation = $item->conversation;
            $step = $item->step;

            if (!$campaign || !$conversation || !$step || $campaign->status !== 'active') {
                continue;
            }

            // Check if campaign has stop_on_reply and user has sent an inbound message
            if ($campaign->stop_on_reply) {
                $lastUserMsg = TelegramMessage::where('conversation_id', $conversation->id)
                    ->where('direction', 'inbound')
                    ->where('created_at', '>', $item->created_at)
                    ->exists();

                if ($lastUserMsg) {
                    $item->status = 'cancelled';
                    $item->error_message = 'Cancelled automatically because user replied to conversation';
                    $item->save();
                    continue;
                }
            }

            // Check working hours and quiet hours
            $adjustedTime = $this->adjustForWorkingAndQuietHours(Carbon::now(), $campaign);
            if ($adjustedTime->isAfter(Carbon::now())) {
                $item->scheduled_at = $adjustedTime;
                $item->save();
                continue;
            }

            // Mark as sending (lock)
            $item->status = 'sending';
            $item->save();

            try {
                $this->executeSendFollowup($item);
                $processedCount++;

                // Automatically schedule the subsequent follow-up step
                $this->scheduleNextStep($campaign, $conversation, $item);
            } catch (Exception $e) {
                Log::error("Follow-up dispatch failed for queue item {$item->id}: " . $e->getMessage());
                $item->retry_count++;
                if ($item->retry_count >= ($campaign->max_retries ?: 3)) {
                    $item->status = 'failed';
                    $item->error_message = $e->getMessage();
                } else {
                    $item->status = 'pending';
                    $item->scheduled_at = Carbon::now()->addMinutes($item->retry_count * 5); // exponential backoff
                    $item->error_message = 'Retry attempt: ' . $e->getMessage();
                }
                $item->save();
            }
        }

        return $processedCount;
    }

    /**
     * Dispatch the message to Telegram and log.
     */
    protected function executeSendFollowup(TelegramFollowupQueue $item): void
    {
        $conversation = $item->conversation;
        $account = $conversation->account;
        $user = $conversation->telegramUser;
        $step = $item->step;

        $rawText = $step->message_text ?: ($step->template?->message_body ?: '');
        $renderedText = $this->variableReplacer->replace($rawText, $user, ['campaign_name' => $item->campaign->name]);

        // Links
        if (!empty($step->links) && is_array($step->links)) {
            $linksBlock = "\n\n🔗 Links:";
            foreach ($step->links as $link) {
                if (!empty($link['url'])) {
                    $lbl = $link['label'] ?? $link['url'];
                    $linksBlock .= "\n• [{$lbl}]({$link['url']})";
                }
            }
            $renderedText .= $linksBlock;
        }

        $mediaPath = $step->media_url ?: ($step->template?->media?->file_path ? storage_path('app/public/' . $step->template->media->file_path) : null);
        $mediaType = $step->media_type ?: ($step->template?->reply_type ?: 'text');

        // Send via MTProto bridge client
        $this->bridgeClient->sendMessage(
            accountId: (string)$account->id,
            recipientId: (int)$user->telegram_id,
            content: $renderedText,
            mediaPath: $mediaPath,
            messageType: $mediaType
        );

        // Update queue item
        $item->status = 'sent';
        $item->sent_at = now();
        $item->save();

        // Create outbound chat message
        TelegramMessage::create([
            'conversation_id' => $conversation->id,
            'direction' => 'outbound',
            'sender_id' => (int)$account->telegram_id,
            'message_type' => $mediaType,
            'content' => $renderedText,
            'media_path' => $mediaPath,
            'status' => 'sent',
        ]);

        MessageLog::create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'event_type' => 'sequential_followup_sent',
            'payload' => [
                'campaign_id' => $item->campaign_id,
                'step_order' => $item->step_order,
                'content' => $renderedText,
            ],
            'status' => 'sent',
        ]);
    }

    /**
     * Schedule the next sequential step once current step has been successfully dispatched.
     */
    protected function scheduleNextStep(FollowupCampaign $campaign, TelegramConversation $conversation, TelegramFollowupQueue $currentItem): void
    {
        $nextOrder = $currentItem->step_order + 1;
        $nextStep = $campaign->steps()->where('step_order', $nextOrder)->first();

        if (!$nextStep) {
            // Reached the end of campaign!
            $campaign->decrement('active_users');
            $campaign->increment('completed_users');
            return;
        }

        $idempotencyKey = "{$campaign->id}:{$conversation->id}:{$nextStep->id}";

        // Idempotency check: guarantee never double scheduled
        if (TelegramFollowupQueue::where('idempotency_key', $idempotencyKey)->exists()) {
            return;
        }

        $scheduledAt = $this->calculateStepExecutionTime($nextStep, Carbon::now(), $campaign->timezone ?: 'UTC');
        $scheduledAt = $this->adjustForWorkingAndQuietHours($scheduledAt, $campaign);

        TelegramFollowupQueue::create([
            'idempotency_key' => $idempotencyKey,
            'campaign_id' => $campaign->id,
            'conversation_id' => $conversation->id,
            'telegram_user_id' => $conversation->telegramUser->telegram_id,
            'step_id' => $nextStep->id,
            'step_order' => $nextStep->step_order,
            'scheduled_at' => $scheduledAt,
            'status' => 'pending',
        ]);

        // Update conversation state
        $state = TelegramConversationState::where('conversation_id', $conversation->id)->first();
        if ($state) {
            $state->current_followup_step = $nextOrder;
            $state->last_followup_sent_at = now();
            $state->save();
        }
    }

    /**
     * Calculate step execution time based on relative delay or exact date/time with timezone.
     */
    public function calculateStepExecutionTime(FollowupStep $step, Carbon $baseTime, ?string $timezone = 'UTC'): Carbon
    {
        $timezone = $timezone ?: 'UTC';
        if ($step->time_type === 'exact_datetime' && $step->exact_datetime) {
            return Carbon::parse($step->exact_datetime, $timezone)->setTimezone('UTC');
        }

        $val = max(1, (int)$step->delay_value);
        $unit = $step->delay_unit ?: 'minutes';

        return match ($unit) {
            'seconds' => $baseTime->copy()->addSeconds($val),
            'minutes' => $baseTime->copy()->addMinutes($val),
            'hours' => $baseTime->copy()->addHours($val),
            'days' => $baseTime->copy()->addDays($val),
            'weeks' => $baseTime->copy()->addWeeks($val),
            'months' => $baseTime->copy()->addMonths($val),
            default => $baseTime->copy()->addMinutes($val),
        };
    }

    /**
     * Adjust time forward if falls inside Quiet Hours or outside Working Hours.
     */
    public function adjustForWorkingAndQuietHours(Carbon $time, FollowupCampaign $campaign): Carbon
    {
        $tz = $campaign->timezone ?: 'UTC';
        $local = $time->copy()->setTimezone($tz);

        // 1. Check Quiet Hours (e.g. 23:00 - 08:00)
        if ($campaign->quiet_hours_enabled) {
            $qStart = Carbon::parse($local->toDateString() . ' ' . ($campaign->quiet_hours_start ?: '23:00'), $tz);
            $qEnd = Carbon::parse($local->toDateString() . ' ' . ($campaign->quiet_hours_end ?: '08:00'), $tz);

            if ($qStart->gt($qEnd)) {
                // Spans midnight: e.g. 23:00 to 08:00
                if ($local->gte($qStart) || $local->lt($qEnd)) {
                    $local = $local->gte($qStart) ? $qEnd->copy()->addDay() : $qEnd->copy();
                }
            } else {
                if ($local->gte($qStart) && $local->lt($qEnd)) {
                    $local = $qEnd->copy();
                }
            }
        }

        // 2. Check Working Hours (e.g. 09:00 - 21:00)
        if ($campaign->working_hours_enabled) {
            $wStart = Carbon::parse($local->toDateString() . ' ' . ($campaign->working_hours_start ?: '09:00'), $tz);
            $wEnd = Carbon::parse($local->toDateString() . ' ' . ($campaign->working_hours_end ?: '21:00'), $tz);

            if ($local->lt($wStart)) {
                $local = $wStart->copy();
            } elseif ($local->gte($wEnd)) {
                $local = $wStart->copy()->addDay();
            }
        }

        return $local->setTimezone('UTC');
    }
}
