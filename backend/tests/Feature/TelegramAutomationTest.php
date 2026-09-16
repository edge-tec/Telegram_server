<?php

namespace Tests\Feature;

use App\Models\KeywordRule;
use App\Models\ReplyTemplate;
use App\Models\TelegramAccount;
use App\Models\TelegramConversation;
use App\Models\TelegramUser;
use App\Models\User;
use App\Services\EncryptionService;
use App\Services\FollowupAutomationService;
use App\Services\KeywordMatcherService;
use App\Services\VariableReplacerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_aes_256_gcm_encryption_and_decryption(): void
    {
        $enc = new EncryptionService();
        $secret = '1BVtsOKYBux_session_string_telethon_sample_key';
        $encrypted = $enc->encrypt($secret);

        $this->assertNotEquals($secret, $encrypted);
        $decrypted = $enc->decrypt($encrypted);
        $this->assertEquals($secret, $decrypted);
    }

    public function test_variable_replacer_service(): void
    {
        $replacer = new VariableReplacerService();
        $user = TelegramUser::first();

        $text = 'Hello {{first_name}}, your handle is {{username}}! Today is {{current_date}}.';
        $replaced = $replacer->replace($text, $user);

        $this->assertStringContainsString($user->first_name, $replaced);
        $this->assertStringNotContainsString('{{first_name}}', $replaced);
    }

    public function test_stop_trigger_keyword_detection(): void
    {
        $matcher = new KeywordMatcherService();
        $this->assertTrue($matcher->isStopTrigger('STOP'));
        $this->assertTrue($matcher->isStopTrigger('unsubscribe'));
        $this->assertTrue($matcher->isStopTrigger('CANCEL'));
        $this->assertFalse($matcher->isStopTrigger('Hello there'));
    }

    public function test_keyword_matcher_finds_rule(): void
    {
        $matcher = new KeywordMatcherService();
        $rule = $matcher->findMatchingRule('Can you send me the price details?');

        $this->assertNotNull($rule);
        $this->assertContains('price', $rule->keywords);
    }

    public function test_inbound_webhook_processes_message(): void
    {
        $account = TelegramAccount::first();

        $payload = [
            'account_id' => $account->id,
            'telegram_id' => 888777666,
            'username' => 'new_user_tester',
            'first_name' => 'Michael',
            'last_name' => 'Scott',
            'phone' => '+15705550199',
            'message_id' => 54321,
            'message_type' => 'text',
            'text' => 'What is the price for automation?',
            'media_path' => null,
            'date' => now()->toIso8601String(),
        ];

        $response = $this->withHeaders([
            'X-Bridge-Secret' => 'bridge-internal-secret-key-2026',
        ])->postJson('/api/internal/telegram/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Check user & conversation were created
        $this->assertDatabaseHas('telegram_users', ['telegram_id' => 888777666]);
    }

    public function test_analytics_dashboard_endpoint(): void
    {
        $admin = User::where('role', 'super_admin')->first();

        $response = $this->actingAs($admin)
            ->getJson('/api/analytics/dashboard');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'kpis' => [
                'total_incoming_messages',
                'total_auto_replies',
                'pending_followups',
                'connected_accounts',
            ],
            'daily_trends',
            'queue_breakdown',
        ]);
    }

    public function test_variable_replacer_angle_brackets_and_custom_tags(): void
    {
        $replacer = new VariableReplacerService();
        $user = TelegramUser::first();

        $text = 'Welcome <first_name>! Your phone is <phone> and campaign is <campaign_name>.';
        $replaced = $replacer->replace($text, $user, ['campaign_name' => 'VIP Drip']);

        $this->assertStringNotContainsString('<first_name>', $replaced);
        $this->assertStringNotContainsString('<campaign_name>', $replaced);
        $this->assertStringContainsString('VIP Drip', $replaced);
    }

    public function test_ai_assistant_service(): void
    {
        $ai = new \App\Services\AiAssistantService();
        $improved = $ai->process('improve', 'hello there');
        $this->assertNotEmpty($improved);

        $bangla = $ai->process('english_to_bangla', 'hello friend');
        $this->assertStringContainsString('হ্যালো', $bangla);
    }

    public function test_auto_reply_crud_and_preview(): void
    {
        $admin = User::where('role', 'super_admin')->first();

        // 1. Create auto reply
        $res = $this->actingAs($admin)->postJson('/api/auto-replies', [
            'name' => 'Enterprise Welcome',
            'trigger_type' => 'first_message',
            'priority' => 10,
            'message_body' => 'Welcome <first_name> to our service!',
            'delay_type' => 'fixed',
            'delay_seconds' => 5,
        ]);
        $res->assertStatus(201);
        $replyId = $res->json('auto_reply.id');

        // 2. List auto replies
        $this->actingAs($admin)->getJson('/api/auto-replies')->assertStatus(200);

        // 3. Test trigger simulation
        $preview = $this->actingAs($admin)->postJson('/api/auto-replies/test-trigger', [
            'message_body' => 'Hello <first_name>!',
        ]);
        $preview->assertStatus(200);
        $this->assertStringContainsString('Mizan', $preview->json('rendered'));

        // 4. Duplicate auto reply
        $dup = $this->actingAs($admin)->postJson("/api/auto-replies/{$replyId}/duplicate");
        $dup->assertStatus(201);
    }
}
