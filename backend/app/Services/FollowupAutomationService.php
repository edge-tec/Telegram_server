<?php

namespace App\Services;

use App\Models\BlacklistUser;
use App\Models\FollowupCampaign;
use App\Models\FollowupStep;
use App\Models\MessageLog;
use App\Models\ReplyTemplate;
use App\Models\ScheduledMessage;
use App\Models\TelegramAccount;
use App\Models\TelegramConversation;
use App\Models\TelegramMessage;
use App\Models\TelegramUser;
use App\Jobs\SendTelegramMessageJob;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FollowupAutomationService
{
    public function __construct(
        protected KeywordMatcherService $keywordMatcher,
        protected VariableReplacerService $variableReplacer,
        protected TelegramBridgeClient $bridgeClient,
        protected SequentialAutoReplyService $sequentialAutoReplyService
    ) {}

    /**
     * Process incoming message event forwarded by Python bridge
     */
    public function processInbound(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $accountId = $data['account_id'];
            $telegramId = $data['telegram_id'];
            $username = $data['username'] ?? null;
            $firstName = $data['first_name'] ?? null;
            $lastName = $data['last_name'] ?? null;
            $phone = $data['phone'] ?? null;
            $msgText = $data['text'] ?? '';
            $msgType = $data['message_type'] ?? 'text';
            $mediaPath = $data['media_path'] ?? null;
            $tgMessageId = (string)($data['message_id'] ?? '');

            $account = TelegramAccount::findOrFail($accountId);

            // 1. Find or create TelegramUser
            $user = TelegramUser::firstOrNew(['telegram_id' => $telegramId]);
            $user->fill([
                'username' => $username ?: $user->username,
                'first_name' => $firstName ?: $user->first_name,
                'last_name' => $lastName ?: $user->last_name,
                'phone' => $phone ?: $user->phone,
            ]);
            $user->save();

            // 2. Find or create Conversation
            $conversation = TelegramConversation::firstOrCreate(
                ['account_id' => $account->id, 'telegram_user_id' => $user->id],
                ['status' => 'new']
            );

            // Update conversation activity
            $conversation->update([
                'last_message_at' => now(),
                'unread_count' => $conversation->unread_count + 1,
            ]);

            // 3. Record incoming message
            $incomingMessage = TelegramMessage::create([
                'conversation_id' => $conversation->id,
                'direction' => 'inbound',
                'sender_id' => $telegramId,
                'message_type' => $msgType,
                'content' => $msgText,
                'media_path' => $mediaPath,
                'status' => 'received',
                'telegram_message_id' => $tgMessageId,
            ]);

            // 4. Check if user is already blacklisted
            if ($user->is_blacklisted) {
                Log::info("Ignored message from blacklisted user: {$telegramId}");
                return ['status' => 'ignored_blacklisted'];
            }

            // 5. Check Stop/Unsubscribe Trigger
            if ($this->keywordMatcher->isStopTrigger($msgText)) {
                $this->handleBlacklist($user, $conversation, 'User initiated STOP trigger');
                return ['status' => 'blacklisted'];
            }

            // 6. Check Keyword Rules (highest priority custom triggers)
            $matchedRule = $this->keywordMatcher->findMatchingRule($msgText, $account->id);
            if ($matchedRule && $matchedRule->template) {
                $this->scheduleOrSendTemplate($conversation, $matchedRule->template, null, null);
                return ['status' => 'keyword_auto_replied', 'rule_id' => $matchedRule->id];
            }

            // 6b. Sequential Auto Reply Engine (Step 1 -> Traffic Reply -> Step 2 -> Traffic Reply -> Step 3...)
            $autoReplyResult = $this->sequentialAutoReplyService->processReply($conversation, $msgText);
            if (in_array($autoReplyResult['status'] ?? '', ['step_sent_immediately', 'step_scheduled'])) {
                return [
                    'status' => 'sequential_auto_replied',
                    'details' => $autoReplyResult,
                ];
            }

            // 7. Sequential Conversational Sequence (Campaign Follow-up)
            return $this->advanceConversationCampaign($conversation, $account, $user);
        });
    }

    /**
     * Advance conversation through the campaign steps sequentially:
     * - Traffic sends Message 1 -> Bot sends Step 1, schedules Step 2 for user-set delay.
     * - Traffic sends Message 2 -> Bot cancels Step 2 delay timer, sends Step 2 immediately, schedules Step 3.
     * - Traffic sends Message 3 -> Bot cancels Step 3 delay timer, sends Step 3 immediately, schedules Step 4.
     * - Traffic sends Message 4 -> Bot sends Step 4, schedules Step 5.
     * - If traffic does not reply, the background worker automatically sends the next step
     *   at the exact scheduled time configured by the user.
     */
    public function advanceConversationCampaign(
        TelegramConversation $conversation,
        TelegramAccount $account,
        TelegramUser $user
    ): array {
        // 1. Find active campaign for this account or global
        $campaign = FollowupCampaign::where('status', 'active')
            ->where('account_id', $account->id)
            ->with(['steps' => fn($q) => $q->orderBy('step_order', 'asc')->with('template.media')])
            ->first();

        if (!$campaign) {
            $campaign = FollowupCampaign::where('status', 'active')
                ->whereNull('account_id')
                ->with(['steps' => fn($q) => $q->orderBy('step_order', 'asc')->with('template.media')])
                ->first();
        }

        if (!$campaign) {
            $campaign = FollowupCampaign::where('status', 'active')
                ->with(['steps' => fn($q) => $q->orderBy('step_order', 'asc')->with('template.media')])
                ->first();
        }

        if (!$campaign || $campaign->steps->isEmpty()) {
            // Fallback to default template if no campaign found
            $defaultTemplate = ReplyTemplate::where('is_active', true)
                ->where('trigger_type', 'auto_reply')
                ->with('media')
                ->first();

            if ($defaultTemplate) {
                $this->scheduleOrSendTemplate($conversation, $defaultTemplate, null, null);
                return ['status' => 'default_auto_replied'];
            }

            return ['status' => 'no_campaign_or_default_template'];
        }

        $allSteps = $campaign->steps;

        // Read last completed step order from conversation notes
        $notes = json_decode($conversation->notes ?? '', true) ?: [];
        $lastStepOrder = (int)($notes['current_step'] ?? 0);

        // Also check if any step was logged in ScheduledMessage
        $sentStepOrders = ScheduledMessage::where('conversation_id', $conversation->id)
            ->where('campaign_id', $campaign->id)
            ->where('status', 'sent')
            ->with('step')
            ->get()
            ->map(fn($s) => $s->step?->step_order ?? 0)
            ->filter();

        if ($sentStepOrders->isNotEmpty()) {
            $lastStepOrder = max($lastStepOrder, (int)$sentStepOrders->max());
        }

        // If no step was logged yet, but prior outbound message was already sent (e.g. from previous test),
        // treat Step 1 as completed so traffic's next message advances to Step 2!
        if ($lastStepOrder === 0) {
            $hasOutbound = TelegramMessage::where('conversation_id', $conversation->id)
                ->where('direction', 'outbound')
                ->exists();
            if ($hasOutbound) {
                $lastStepOrder = 1;
            }
        }

        $nextStepOrder = $lastStepOrder + 1;
        $currentStepToSend = $allSteps->firstWhere('step_order', $nextStepOrder);

        if (!$currentStepToSend) {
            // All steps in campaign have been sent!
            $conversation->update(['status' => 'completed']);
            return ['status' => 'campaign_all_steps_completed'];
        }

        // Cancel any pending follow-up timers for this conversation,
        // because the user actively replied so we send this next step now!
        ScheduledMessage::where('conversation_id', $conversation->id)
            ->where('campaign_id', $campaign->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'cancelled',
                'error_log' => "User replied; sending Step {$nextStepOrder} now"
            ]);

        // 1. Calculate Reply Delay using the Template's Reply Delay Strategy (Instant / Fixed / Random Jitter)
        $replyDelay = 0;
        if ($currentStepToSend->template) {
            $replyDelay = $currentStepToSend->template->computeDelaySeconds();
        }

        $scheduledTime = $replyDelay > 0 ? Carbon::now()->addSeconds($replyDelay) : Carbon::now();

        // 2. Create scheduled message for this step (displayed in System Logs & Queue Engine)
        $scheduled = ScheduledMessage::create([
            'conversation_id' => $conversation->id,
            'campaign_id' => $campaign->id,
            'step_id' => $currentStepToSend->id,
            'template_id' => $currentStepToSend->template_id,
            'scheduled_at' => $scheduledTime,
            'status' => 'pending',
        ]);

        // Update conversation notes with current step
        $notes['current_step'] = $currentStepToSend->step_order;
        $notes['campaign_id'] = $campaign->id;
        $conversation->update([
            'status' => 'active',
            'notes' => json_encode($notes),
        ]);

        // 3. If Reply Delay is 0 (Instant), send immediately!
        // If Reply Delay > 0 (Fixed delay or Random Jitter), the background queue worker will dispatch it at $scheduledTime!
        if ($replyDelay <= 0) {
            $this->executeSend($scheduled);
        }

        // Schedule the SUBSEQUENT step as pending follow-up timer in case user stops replying
        $subsequentStep = $allSteps->firstWhere('step_order', $currentStepToSend->step_order + 1);
        if ($subsequentStep) {
            $followupDelay = $subsequentStep->delay_seconds > 0 ? $subsequentStep->delay_seconds : 1800;
            $followupScheduledTime = $scheduledTime->copy()->addSeconds($followupDelay);

            ScheduledMessage::create([
                'conversation_id' => $conversation->id,
                'campaign_id' => $campaign->id,
                'step_id' => $subsequentStep->id,
                'template_id' => $subsequentStep->template_id,
                'scheduled_at' => $followupScheduledTime,
                'status' => 'pending',
            ]);
        }

        return [
            'status' => 'step_dispatched',
            'step_order' => $currentStepToSend->step_order,
            'template_name' => $currentStepToSend->template?->name,
            'delay_seconds' => $replyDelay,
            'next_followup_step' => $subsequentStep?->step_order,
            'next_followup_delay' => $subsequentStep?->delay_seconds,
        ];
    }

    /**
     * Blacklist user and cancel all pending follow-ups
     */
    public function handleBlacklist(TelegramUser $user, TelegramConversation $conversation, string $reason): void
    {
        $user->update(['is_blacklisted' => true]);
        $conversation->update(['status' => 'blacklisted']);

        BlacklistUser::firstOrCreate(
            ['telegram_user_id' => $user->id],
            ['reason' => $reason]
        );

        // Cancel all pending scheduled messages
        ScheduledMessage::where('conversation_id', $conversation->id)
            ->where('status', 'pending')
            ->update(['status' => 'cancelled', 'error_log' => 'User blacklisted']);

        MessageLog::create([
            'account_id' => $conversation->account_id,
            'conversation_id' => $conversation->id,
            'event_type' => 'user_blacklisted',
            'payload' => ['reason' => $reason],
            'status' => 'cancelled',
        ]);
    }

    /**
     * Schedule or immediately send a single template
     */
    public function scheduleOrSendTemplate(
        TelegramConversation $conversation,
        ReplyTemplate $template,
        ?string $campaignId = null,
        ?string $stepId = null
    ): ScheduledMessage {
        $delaySeconds = $template->computeDelaySeconds();
        $scheduledTime = Carbon::now()->addSeconds($delaySeconds);

        $scheduled = ScheduledMessage::create([
            'conversation_id' => $conversation->id,
            'campaign_id' => $campaignId,
            'step_id' => $stepId,
            'template_id' => $template->id,
            'scheduled_at' => $scheduledTime,
            'status' => 'pending',
        ]);

        if ($delaySeconds <= 0) {
            $this->executeSend($scheduled);
        } else {
            SendTelegramMessageJob::dispatch($scheduled->id)->delay($scheduledTime);
        }

        return $scheduled;
    }

    /**
     * Actually execute sending a scheduled message via Python MTProto bridge
     */
    public function executeSend(ScheduledMessage $scheduled): bool
    {
        $scheduled->loadMissing(['conversation.account', 'conversation.telegramUser', 'template.media', 'step']);

        $conversation = $scheduled->conversation;
        if (!$conversation) {
            $scheduled->update(['status' => 'failed', 'error_log' => 'Conversation not found']);
            return false;
        }

        $account = $conversation->account;
        $user = $conversation->telegramUser;
        $template = $scheduled->template;

        if (!$account || !$user || !$template) {
            $scheduled->update(['status' => 'failed', 'error_log' => 'Missing account, user, or template']);
            return false;
        }

        if ($user->is_blacklisted) {
            $scheduled->update(['status' => 'cancelled', 'error_log' => 'Recipient is blacklisted']);
            return false;
        }

        $scheduled->update(['status' => 'processing']);

        try {
            // Variable replacement
            $preparedContent = $this->variableReplacer->replace($template->message_body, $user);
            $mediaPath = $template->media?->file_path;

            $result = $this->bridgeClient->sendMessage(
                accountId: $account->id,
                recipientId: $user->telegram_id,
                content: $preparedContent,
                mediaPath: $mediaPath,
                messageType: $template->reply_type ?? 'text'
            );

            // Record outbound message in chat history
            TelegramMessage::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'sender_id' => $account->telegram_id ?? 0,
                'message_type' => $template->reply_type ?? 'text',
                'content' => $preparedContent,
                'media_path' => $mediaPath,
                'status' => 'sent',
                'telegram_message_id' => (string)($result['message_id'] ?? ''),
            ]);

            $conversation->update(['last_message_at' => now()]);

            $scheduled->update([
                'status' => 'sent',
                'error_log' => null,
            ]);

            // If sent via follow-up timer, update current_step and schedule next follow-up
            if ($scheduled->campaign_id && $scheduled->step_id) {
                $campaign = FollowupCampaign::with(['steps' => fn($q) => $q->orderBy('step_order', 'asc')])->find($scheduled->campaign_id);
                if ($campaign) {
                    $allSteps = $campaign->steps;
                    $currentOrder = $scheduled->step?->step_order ?? 1;

                    // Update notes
                    $notes = json_decode($conversation->notes ?? '', true) ?: [];
                    $notes['current_step'] = $currentOrder;
                    $notes['campaign_id'] = $campaign->id;
                    $conversation->update(['notes' => json_encode($notes)]);

                    // Find subsequent step
                    $subsequentStep = $allSteps->firstWhere('step_order', $currentOrder + 1);
                    if ($subsequentStep) {
                        $alreadyScheduled = ScheduledMessage::where('conversation_id', $conversation->id)
                            ->where('campaign_id', $campaign->id)
                            ->where('step_id', $subsequentStep->id)
                            ->where('status', 'pending')
                            ->exists();

                        if (!$alreadyScheduled) {
                            $delay = $subsequentStep->delay_seconds > 0 ? $subsequentStep->delay_seconds : 1800;
                            ScheduledMessage::create([
                                'conversation_id' => $conversation->id,
                                'campaign_id' => $campaign->id,
                                'step_id' => $subsequentStep->id,
                                'template_id' => $subsequentStep->template_id,
                                'scheduled_at' => Carbon::now()->addSeconds($delay),
                                'status' => 'pending',
                            ]);
                        }
                    } else {
                        // All steps completed
                        $campaign->decrement('active_users');
                        $campaign->increment('completed_users');
                        $conversation->update(['status' => 'completed']);
                    }
                }
            }

            MessageLog::create([
                'account_id' => $account->id,
                'conversation_id' => $conversation->id,
                'event_type' => 'outbound_sent',
                'payload' => [
                    'template_id' => $template->id,
                    'scheduled_id' => $scheduled->id,
                    'result' => $result,
                ],
                'status' => 'success',
            ]);

            return true;
        } catch (Exception $e) {
            $retryCount = $scheduled->retry_count + 1;
            $newStatus = ($retryCount >= 3) ? 'failed' : 'pending';

            $scheduled->update([
                'status' => $newStatus,
                'retry_count' => $retryCount,
                'error_log' => $e->getMessage(),
            ]);

            Log::error("Failed to execute scheduled send {$scheduled->id}: {$e->getMessage()}");

            MessageLog::create([
                'account_id' => $account->id,
                'conversation_id' => $conversation->id,
                'event_type' => 'send_failure',
                'payload' => ['error' => $e->getMessage(), 'retry' => $retryCount],
                'status' => 'failed',
            ]);

            return false;
        }
    }
}
