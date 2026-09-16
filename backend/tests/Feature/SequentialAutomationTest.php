<?php

namespace Tests\Feature;

use App\Models\FollowupCampaign;
use App\Models\FollowupStep;
use App\Models\TelegramAccount;
use App\Models\TelegramAutoReplySequence;
use App\Models\TelegramAutoReplyStep;
use App\Models\TelegramConversation;
use App\Models\TelegramFollowupQueue;
use App\Models\TelegramUser;
use App\Models\User;
use App\Services\SequentialAutoReplyService;
use App\Services\SequentialFollowupSchedulerService;
use App\Services\TelegramBridgeClient;
use App\Services\VariableReplacerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class SequentialAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_sequential_auto_reply_advances_on_each_reply(): void
    {
        // Mock Bridge Client
        $mockBridge = Mockery::mock(TelegramBridgeClient::class);
        $mockBridge->shouldReceive('sendMessage')->andReturn(['success' => true]);
        $mockBridge->shouldReceive('sendMedia')->andReturn(['success' => true]);

        $replacer = new VariableReplacerService();
        $service = new SequentialAutoReplyService($replacer, $mockBridge);

        $account = TelegramAccount::first();
        $user = TelegramUser::create([
            'telegram_id' => '99887766',
            'first_name' => 'Alice',
            'username' => 'alice_lead'
        ]);

        $conversation = TelegramConversation::create([
            'account_id' => $account->id,
            'telegram_user_id' => $user->id,
            'status' => 'active'
        ]);

        // Create Sequence with 3 steps
        $sequence = TelegramAutoReplySequence::create([
            'account_id' => $account->id,
            'name' => 'Test Sales Funnel',
            'status' => 'active'
        ]);

        TelegramAutoReplyStep::create([
            'sequence_id' => $sequence->id,
            'step_number' => 1,
            'message_text' => 'Hi {{first_name}}, thanks for contacting us! [Step 1]',
            'delay_value' => 0,
            'delay_unit' => 'seconds',
            'is_active' => true
        ]);

        TelegramAutoReplyStep::create([
            'sequence_id' => $sequence->id,
            'step_number' => 2,
            'message_text' => 'Glad to hear! Here is the full demo [Step 2].',
            'delay_value' => 0,
            'delay_unit' => 'seconds',
            'is_active' => true
        ]);

        TelegramAutoReplyStep::create([
            'sequence_id' => $sequence->id,
            'step_number' => 3,
            'message_text' => 'Ready to activate your account? [Step 3]',
            'delay_value' => 0,
            'delay_unit' => 'seconds',
            'is_active' => true
        ]);

        // Traffic sends Message 1 -> Expect Step 1
        $res1 = $service->processReply($conversation, 'Hello');
        $this->assertEquals('step_sent_immediately', $res1['status']);
        $this->assertEquals(1, $res1['step_number']);
        $this->assertStringContainsString('Alice', $res1['rendered_text']);

        // Traffic sends Reply 2 -> Expect Step 2
        $res2 = $service->processReply($conversation, 'Yes I am interested');
        $this->assertEquals('step_sent_immediately', $res2['status']);
        $this->assertEquals(2, $res2['step_number']);

        // Traffic sends Reply 3 -> Expect Step 3
        $res3 = $service->processReply($conversation, 'Sounds good!');
        $this->assertEquals('step_sent_immediately', $res3['status']);
        $this->assertEquals(3, $res3['step_number']);

        // Traffic sends Reply 4 -> Sequence ended
        $res4 = $service->processReply($conversation, 'What next?');
        $this->assertEquals('sequence_completed', $res4['status']);
        $this->assertEquals(3, $res4['total_steps_executed']);
    }

    public function test_followup_cancelled_on_traffic_reply_when_stop_on_reply_is_true(): void
    {
        $mockBridge = Mockery::mock(TelegramBridgeClient::class);
        $mockBridge->shouldReceive('sendMessage')->andReturn(['success' => true]);
        $mockBridge->shouldReceive('sendMedia')->andReturn(['success' => true]);

        $replacer = new VariableReplacerService();
        $autoReplyService = new SequentialAutoReplyService($replacer, $mockBridge);
        $schedulerService = new SequentialFollowupSchedulerService($replacer, $mockBridge);

        $account = TelegramAccount::first();
        $user = TelegramUser::create([
            'telegram_id' => '11223344',
            'first_name' => 'Bob',
            'username' => 'bob_buyer'
        ]);

        $conversation = TelegramConversation::create([
            'account_id' => $account->id,
            'telegram_user_id' => $user->id,
            'status' => 'active'
        ]);

        // Create campaign with stop_on_reply = true
        $campaign = FollowupCampaign::create([
            'account_id' => $account->id,
            'name' => 'Followup Campaign',
            'status' => 'active',
            'stop_on_reply' => true
        ]);

        $step1 = FollowupStep::create([
            'campaign_id' => $campaign->id,
            'step_number' => 1,
            'timing_type' => 'relative',
            'delay_value' => 30,
            'delay_unit' => 'minutes',
            'content' => 'Checking in Bob!',
            'status' => 'active'
        ]);

        // Enroll in follow-up
        $queueItem = $schedulerService->enrollConversation($campaign, $conversation);
        $this->assertNotNull($queueItem);
        $this->assertEquals('pending', $queueItem->status);

        // Traffic replies -> SequentialAutoReplyService triggers cancellation of pending follow-up!
        $autoReplyService->processReply($conversation, 'Hey, replying now!');

        $queueItem->refresh();
        $this->assertEquals('cancelled', $queueItem->status);
        $this->assertStringContainsString('stop_on_reply rule', $queueItem->error_message);
    }

    public function test_followup_idempotency_prevents_duplicate_dispatch(): void
    {
        $mockBridge = Mockery::mock(TelegramBridgeClient::class);
        $replacer = new VariableReplacerService();
        $schedulerService = new SequentialFollowupSchedulerService($replacer, $mockBridge);

        $account = TelegramAccount::first();
        $user = TelegramUser::create([
            'telegram_id' => '55667788',
            'first_name' => 'Charlie',
        ]);

        $conversation = TelegramConversation::create([
            'account_id' => $account->id,
            'telegram_user_id' => $user->id,
            'status' => 'active'
        ]);

        $campaign = FollowupCampaign::create([
            'account_id' => $account->id,
            'name' => 'VIP Campaign',
            'status' => 'active',
        ]);

        $step1 = FollowupStep::create([
            'campaign_id' => $campaign->id,
            'step_number' => 1,
            'timing_type' => 'relative',
            'delay_value' => 1,
            'delay_unit' => 'hours',
            'content' => 'Step 1 message',
            'status' => 'active'
        ]);

        // First enrollment
        $item1 = $schedulerService->enrollConversation($campaign, $conversation);
        $this->assertNotNull($item1);

        // Second enrollment attempt for the same step -> should return existing item and NOT create duplicate
        $item2 = $schedulerService->enrollConversation($campaign, $conversation);
        $this->assertEquals($item1->id, $item2->id);

        $totalQueueCount = TelegramFollowupQueue::where('campaign_id', $campaign->id)
            ->where('conversation_id', $conversation->id)
            ->where('step_id', $step1->id)
            ->count();

        $this->assertEquals(1, $totalQueueCount);
    }
}
