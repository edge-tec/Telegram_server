<?php

namespace Database\Seeders;

use App\Models\FollowupCampaign;
use App\Models\FollowupStep;
use App\Models\KeywordRule;
use App\Models\MediaLibrary;
use App\Models\ReplyTemplate;
use App\Models\TelegramAccount;
use App\Models\TelegramConversation;
use App\Models\TelegramMessage;
use App\Models\TelegramUser;
use App\Models\User;
use App\Models\UserTag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Super Admin & Manager Users
        $admin = User::firstOrCreate(
            ['email' => 'admin@telegram.local'],
            [
                'name' => 'System Super Admin',
                'password' => Hash::make('Password123!'),
                'role' => 'super_admin',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'manager@telegram.local'],
            [
                'name' => 'Operations Manager',
                'password' => Hash::make('Password123!'),
                'role' => 'manager',
                'is_active' => true,
            ]
        );

        // 2. Sample Media items
        $mediaPdf = MediaLibrary::firstOrCreate(
            ['file_name' => 'Product_Catalog_2026.pdf'],
            [
                'file_path' => 'media/sample_catalog.pdf',
                'mime_type' => 'application/pdf',
                'file_size' => 1024 * 350,
                'file_type' => 'document',
                'user_id' => $admin->id,
            ]
        );

        $mediaImage = MediaLibrary::firstOrCreate(
            ['file_name' => 'Pricing_Plans_Infographic.png'],
            [
                'file_path' => 'media/pricing_infographic.png',
                'mime_type' => 'image/png',
                'file_size' => 1024 * 480,
                'file_type' => 'photo',
                'user_id' => $admin->id,
            ]
        );

        // 3. Sample Reply Templates
        $welcomeTpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Welcome Instant Greeting'],
            [
                'trigger_type' => 'auto_reply',
                'delay_type' => 'instant',
                'delay_seconds' => 0,
                'reply_type' => 'text',
                'message_body' => "Hello {{first_name}}! 👋\n\nThanks for reaching out to us. How can our team assist you today?",
                'is_active' => true,
            ]
        );

        $pricingTpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Pricing & Quotation Info'],
            [
                'trigger_type' => 'keyword',
                'delay_type' => 'random',
                'random_delay_min' => 20,
                'random_delay_max' => 40,
                'reply_type' => 'photo',
                'message_body' => "Here is our latest tier plan, {{first_name}}! 🚀\nSpecial promotional discounts are currently active for this month.",
                'media_id' => $mediaImage->id,
                'is_active' => true,
            ]
        );

        $offerTpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Catalog & Special Offer Document'],
            [
                'trigger_type' => 'keyword',
                'delay_type' => 'fixed',
                'delay_seconds' => 15,
                'reply_type' => 'document',
                'message_body' => "Attached is our full 2026 Product Catalog and promotional packages for you, {{first_name}}.",
                'media_id' => $mediaPdf->id,
                'is_active' => true,
            ]
        );

        $followup1Tpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Followup 1 - Friendly Check-in'],
            [
                'trigger_type' => 'followup',
                'delay_type' => 'fixed',
                'delay_seconds' => 1800, // 30 mins
                'reply_type' => 'text',
                'message_body' => "Hi {{first_name}}, just checking back to see if you had any questions regarding our solutions? Feel free to ask anytime!",
                'is_active' => true,
            ]
        );

        $followup2Tpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Followup 2 - Case Study & Portfolio'],
            [
                'trigger_type' => 'followup',
                'delay_type' => 'fixed',
                'delay_seconds' => 21600, // 6 hours
                'reply_type' => 'photo',
                'message_body' => "Check out how our platform helped clients automate 85% of their daily leads on Telegram!",
                'media_id' => $mediaImage->id,
                'is_active' => true,
            ]
        );

        $followup3Tpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Followup 3 - 24h Reminder'],
            [
                'trigger_type' => 'followup',
                'delay_type' => 'fixed',
                'delay_seconds' => 86400, // 1 day
                'reply_type' => 'text',
                'message_body' => "Hello {{first_name}}, our senior specialist is available today if you would like a brief 10-minute live demonstration.",
                'is_active' => true,
            ]
        );

        $followup4Tpl = ReplyTemplate::firstOrCreate(
            ['name' => 'Followup 4 - Final Check-in'],
            [
                'trigger_type' => 'followup',
                'delay_type' => 'fixed',
                'delay_seconds' => 259200, // 3 days
                'reply_type' => 'text',
                'message_body' => "Hi {{first_name}}, this is our final follow-up. If you need any assistance in the future, we are always here for you! Have a great week.",
                'is_active' => true,
            ]
        );

        // 4. Sample Telegram Account
        $account = TelegramAccount::firstOrNew(['alias' => 'Primary Sales Account']);
        if (!$account->exists) {
            $account->user_id = $admin->id;
            $account->alias = 'Primary Sales Account';
            $account->phone = '+12025550199';
            $account->api_id = 1234567;
            $account->api_hash = 'd41d8cd98f00b204e9800998ecf8427e';
            $account->session_string = '1BVtsOKYBux_sample_session_string_data_here';
            $account->status = 'connected';
            $account->telegram_id = '882910382';
            $account->username = 'sales_rep_john';
            $account->first_name = 'John';
            $account->last_name = 'Doe';
            $account->last_connected_at = now();
            $account->save();
        }

        // 5. Follow-up Campaign
        $campaign = FollowupCampaign::firstOrCreate(
            ['name' => '5-Step New Lead Nurturing Campaign'],
            [
                'description' => 'Automated follow-up drip sequence for all incoming inquiries.',
                'account_id' => $account->id,
                'status' => 'active',
                'on_reply_action' => 'stop',
                'total_users' => 12,
                'active_users' => 8,
                'completed_users' => 4,
            ]
        );

        if ($campaign->steps()->count() === 0) {
            FollowupStep::create(['campaign_id' => $campaign->id, 'step_order' => 1, 'delay_seconds' => 0, 'template_id' => $welcomeTpl->id]);
            FollowupStep::create(['campaign_id' => $campaign->id, 'step_order' => 2, 'delay_seconds' => 1800, 'template_id' => $followup1Tpl->id]);
            FollowupStep::create(['campaign_id' => $campaign->id, 'step_order' => 3, 'delay_seconds' => 21600, 'template_id' => $followup2Tpl->id]);
            FollowupStep::create(['campaign_id' => $campaign->id, 'step_order' => 4, 'delay_seconds' => 86400, 'template_id' => $followup3Tpl->id]);
            FollowupStep::create(['campaign_id' => $campaign->id, 'step_order' => 5, 'delay_seconds' => 259200, 'template_id' => $followup4Tpl->id]);
        }

        // 6. Keyword Rules
        KeywordRule::firstOrCreate(
            ['account_id' => $account->id, 'template_id' => $pricingTpl->id],
            [
                'keywords' => ['price', 'pricing', 'cost', 'fee', 'package'],
                'match_type' => 'contains',
                'is_case_sensitive' => false,
                'priority' => 20,
                'is_active' => true,
            ]
        );

        KeywordRule::firstOrCreate(
            ['account_id' => $account->id, 'template_id' => $offerTpl->id],
            [
                'keywords' => ['catalog', 'offer', 'brochure', 'pdf'],
                'match_type' => 'contains',
                'is_case_sensitive' => false,
                'priority' => 15,
                'is_active' => true,
            ]
        );

        // 7. Seed Sample Telegram Contacts & Conversations
        $usersData = [
            ['telegram_id' => 99120381, 'username' => 'alex_turner', 'first_name' => 'Alex', 'last_name' => 'Turner', 'phone' => '+447911123456'],
            ['telegram_id' => 99120382, 'username' => 'sarah_connor', 'first_name' => 'Sarah', 'last_name' => 'Connor', 'phone' => '+13105559876'],
            ['telegram_id' => 99120383, 'username' => 'david_miller', 'first_name' => 'David', 'last_name' => 'Miller', 'phone' => '+491512345678'],
            ['telegram_id' => 99120384, 'username' => 'emma_watson', 'first_name' => 'Emma', 'last_name' => 'Watson', 'phone' => '+12125553322'],
        ];

        foreach ($usersData as $idx => $u) {
            $tUser = TelegramUser::firstOrCreate(['telegram_id' => $u['telegram_id']], $u);

            $conv = TelegramConversation::firstOrCreate(
                ['account_id' => $account->id, 'telegram_user_id' => $tUser->id],
                [
                    'status' => ($idx === 0) ? 'new' : (($idx === 3) ? 'completed' : 'active'),
                    'unread_count' => ($idx === 0) ? 2 : 0,
                    'last_message_at' => now()->subMinutes($idx * 45),
                    'notes' => 'Interested in enterprise automation and custom integrations.',
                ]
            );

            UserTag::firstOrCreate(['conversation_id' => $conv->id, 'tag_name' => 'VIP Lead']);
            if ($idx === 0) {
                UserTag::firstOrCreate(['conversation_id' => $conv->id, 'tag_name' => 'Pricing Inquiry']);
            }

            if ($conv->messages()->count() === 0) {
                // Inbound message
                TelegramMessage::create([
                    'conversation_id' => $conv->id,
                    'direction' => 'inbound',
                    'sender_id' => $tUser->telegram_id,
                    'message_type' => 'text',
                    'content' => ($idx === 0) ? 'Hi, could you please tell me your pricing packages?' : 'Hello! I need more info about your Telegram bot tools.',
                    'status' => 'received',
                    'created_at' => now()->subHours(2),
                ]);

                // Outbound auto-reply
                TelegramMessage::create([
                    'conversation_id' => $conv->id,
                    'direction' => 'outbound',
                    'sender_id' => (int)$account->telegram_id,
                    'message_type' => 'text',
                    'content' => "Hello {$tUser->first_name}! 👋\n\nThanks for reaching out to us. Here is our pricing breakdown.",
                    'status' => 'sent',
                    'created_at' => now()->subHours(1),
                ]);
            }
        }

        // 8. Seed Enterprise Telegram Auto Replies (Module v3.0)
        if (\App\Models\TelegramAutoReply::count() === 0) {
            \App\Models\TelegramAutoReply::create([
                'name' => 'First Inbound Greeting',
                'status' => 'active',
                'priority' => 20,
                'trigger_type' => 'first_message',
                'delay_type' => 'instant',
                'message_body' => "Hello <first_name>! 👋\n\nWelcome to our platform! How can we assist you today? Tap any option below to get started.",
                'inline_buttons' => [
                    ['type' => 'open_url', 'label' => '🌐 Visit Website', 'data' => 'https://teleflow.io'],
                    ['type' => 'copy_coupon', 'label' => '🎁 Claim 20% Off', 'data' => 'WELCOME20'],
                ],
                'triggered_count' => 14,
                'sent_count' => 14,
            ]);

            \App\Models\TelegramAutoReply::create([
                'name' => 'Pricing & Quotation Inquiry',
                'status' => 'active',
                'priority' => 15,
                'trigger_type' => 'keyword_contains',
                'trigger_keywords' => ['price', 'pricing', 'cost', 'packages', 'quote'],
                'delay_type' => 'random',
                'random_delay_min' => 5,
                'random_delay_max' => 15,
                'message_body' => "Hey <first_name>! 💼\n\nOur plans start at just $19/mo with unlimited auto-replies and drip campaigns. Check our plans directly:",
                'inline_buttons' => [
                    ['type' => 'open_url', 'label' => '📊 View Pricing Grid', 'data' => 'https://teleflow.io/pricing'],
                    ['type' => 'call_number', 'label' => '📞 Speak to Sales', 'data' => '+18005550199'],
                ],
                'triggered_count' => 28,
                'sent_count' => 28,
            ]);

            \App\Models\TelegramAutoReply::create([
                'name' => 'Command /start Welcome',
                'status' => 'active',
                'priority' => 18,
                'trigger_type' => 'command_start',
                'delay_type' => 'instant',
                'message_body' => "Greetings <first_name> (@<username>)! 🚀\n\nThanks for initiating the TeleFlow Assistant. Today is <current_date>.\n\nType 'help' at any time for assistance!",
                'triggered_count' => 42,
                'sent_count' => 42,
            ]);
        }
    }
}
