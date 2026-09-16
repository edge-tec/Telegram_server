<?php

namespace Tests\Feature;

use App\Models\TelegramAccount;
use App\Models\TelegramAdminAutoReply;
use App\Models\TelegramAdminAutoReplyStep;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAutoReplyTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->admin = User::where('role', 'super_admin')->first() ?? User::factory()->create(['role' => 'super_admin']);
        Sanctum::actingAs($this->admin);
    }

    public function test_can_create_admin_auto_reply_with_steps_media_and_buttons(): void
    {
        $account = TelegramAccount::first();

        $payload = [
            'name' => 'Admin VIP Onboarding',
            'description' => 'Global enterprise sequence for new leads',
            'account_id' => $account?->id,
            'status' => 'active',
            'priority' => 15,
            'is_global' => true,
            'force_auto_reply' => true,
            'lock_message' => true,
            'lock_media' => true,
            'visibility' => 'all_users',
            'steps' => [
                [
                    'step_number' => 1,
                    'step_name' => 'Welcome Step',
                    'delay_value' => 0,
                    'delay_unit' => 'seconds',
                    'message_format' => 'markdown',
                    'message_text' => 'Hello {{first_name}}! Welcome to our enterprise platform.',
                    'is_active' => true,
                    'media' => [
                        [
                            'media_type' => 'photo',
                            'file_name' => 'banner.jpg',
                            'file_url' => 'https://example.com/banner.jpg',
                            'mime_type' => 'image/jpeg',
                            'file_size' => 102400,
                            'caption' => 'Welcome Banner',
                        ]
                    ],
                    'links' => [
                        [
                            'link_type' => 'inline_url',
                            'label' => 'Official Website',
                            'url' => 'https://example.com',
                        ]
                    ],
                    'buttons' => [
                        [
                            'row_index' => 0,
                            'col_index' => 0,
                            'label' => 'Join Telegram',
                            'button_type' => 'telegram_url',
                            'data' => 'https://t.me/teleflow_channel',
                        ],
                        [
                            'row_index' => 0,
                            'col_index' => 1,
                            'label' => 'Contact Support',
                            'button_type' => 'url',
                            'data' => 'https://example.com/support',
                        ]
                    ]
                ],
                [
                    'step_number' => 2,
                    'step_name' => 'Demo Offer',
                    'delay_value' => 2,
                    'delay_unit' => 'minutes',
                    'message_format' => 'markdown',
                    'message_text' => 'Here is a quick walkthrough demo video for {{first_name}}.',
                    'is_active' => true,
                ]
            ]
        ];

        $res = $this->postJson('/api/admin/auto-replies', $payload);
        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Admin VIP Onboarding')
            ->assertJsonPath('data.is_global', true)
            ->assertJsonPath('data.force_auto_reply', true);

        $this->assertDatabaseHas('telegram_admin_auto_replies', [
            'name' => 'Admin VIP Onboarding',
            'is_global' => 1,
            'force_auto_reply' => 1,
        ]);

        $this->assertDatabaseCount('telegram_admin_auto_reply_steps', 2);
        $this->assertDatabaseCount('telegram_admin_auto_reply_media', 1);
        $this->assertDatabaseCount('telegram_admin_auto_reply_links', 1);
        $this->assertDatabaseCount('telegram_admin_auto_reply_buttons', 2);
    }

    public function test_can_duplicate_admin_auto_reply(): void
    {
        $reply = TelegramAdminAutoReply::create([
            'name' => 'Original Sequence',
            'status' => 'active',
            'priority' => 10,
        ]);

        $step = $reply->steps()->create([
            'step_number' => 1,
            'step_name' => 'Step 1',
            'message_text' => 'Sample text',
        ]);

        $step->buttons()->create([
            'label' => 'Click Me',
            'button_type' => 'url',
            'data' => 'https://example.com',
        ]);

        $res = $this->postJson("/api/admin/auto-replies/{$reply->id}/duplicate");
        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Original Sequence (Copy)')
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseCount('telegram_admin_auto_replies', 2);
        $this->assertDatabaseCount('telegram_admin_auto_reply_steps', 2);
        $this->assertDatabaseCount('telegram_admin_auto_reply_buttons', 2);
    }

    public function test_can_upload_secure_admin_media(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('test_banner.jpg', 600, 400);

        $res = $this->postJson('/api/admin/auto-replies/upload-media', [
            'file' => $file,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.file_name', 'test_banner.jpg')
            ->assertJsonPath('data.media_type', 'photo');

        $filePath = $res->json('data.file_path');
        Storage::disk('public')->assertExists($filePath);
    }
}
