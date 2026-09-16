<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. telegram_variables (Merge Tags & Dynamic Placeholders)
        if (!Schema::hasTable('telegram_variables')) {
            Schema::create('telegram_variables', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('key', 100)->unique()->index(); // e.g. first_name, discount_code
                $table->string('name', 150); // Human readable name
                $table->string('category', 50)->default('system'); // system, custom, contact, ecommerce
                $table->string('fallback_value', 255)->nullable(); // Fallback if data is missing
                $table->text('description')->nullable();
                $table->boolean('is_system')->default(false);
                $table->timestamps();
            });

            // Seed standard system variables
            $now = now();
            $systemVars = [
                ['id' => '11111111-1111-1111-1111-111111110001', 'key' => 'first_name', 'name' => 'First Name', 'category' => 'contact', 'fallback_value' => 'Friend', 'description' => "Contact's Telegram first name", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110002', 'key' => 'last_name', 'name' => 'Last Name', 'category' => 'contact', 'fallback_value' => '', 'description' => "Contact's Telegram last name", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110003', 'key' => 'username', 'name' => 'Username', 'category' => 'contact', 'fallback_value' => 'there', 'description' => "Contact's Telegram handle (@username)", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110004', 'key' => 'phone', 'name' => 'Phone Number', 'category' => 'contact', 'fallback_value' => 'N/A', 'description' => "Contact's registered phone number", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110005', 'key' => 'telegram_id', 'name' => 'Telegram User ID', 'category' => 'contact', 'fallback_value' => '0', 'description' => "Numeric unique Telegram ID", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110006', 'key' => 'country', 'name' => 'Country', 'category' => 'contact', 'fallback_value' => 'Global', 'description' => "Contact's detected country location", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110007', 'key' => 'city', 'name' => 'City', 'category' => 'contact', 'fallback_value' => 'Your City', 'description' => "Contact's detected city location", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110008', 'key' => 'language', 'name' => 'Language Code', 'category' => 'contact', 'fallback_value' => 'en', 'description' => "Telegram client language code (e.g. en, bn)", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110009', 'key' => 'current_date', 'name' => 'Current Date', 'category' => 'system', 'fallback_value' => date('Y-m-d'), 'description' => "Today's calendar date in YYYY-MM-DD", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110010', 'key' => 'current_time', 'name' => 'Current Time', 'category' => 'system', 'fallback_value' => date('H:i'), 'description' => "Current local server time (HH:MM)", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110011', 'key' => 'campaign_name', 'name' => 'Campaign Name', 'category' => 'system', 'fallback_value' => 'Automation', 'description' => "Name of the sending campaign", 'is_system' => true, 'created_at' => $now, 'updated_at' => $now],
                ['id' => '11111111-1111-1111-1111-111111110012', 'key' => 'custom_field', 'name' => 'Sample Custom Variable', 'category' => 'custom', 'fallback_value' => 'VIP Member', 'description' => "Custom variable demonstration", 'is_system' => false, 'created_at' => $now, 'updated_at' => $now],
            ];
            DB::table('telegram_variables')->insert($systemVars);
        }

        // 2. telegram_auto_replies (Enterprise Auto-Reply Builder)
        if (!Schema::hasTable('telegram_auto_replies')) {
            Schema::create('telegram_auto_replies', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
                $table->string('name', 150);
                $table->string('status', 30)->default('active')->index(); // active, draft, paused
                $table->integer('priority')->default(10)->index();
                
                // Triggers
                // Trigger types: first_message, keyword_match, keyword_exact, keyword_contains, keyword_regex,
                // group_join, channel_join, button_click, callback_query, command_start, command_help,
                // reply_to_user, new_conversation, returning_user
                $table->string('trigger_type', 50)->default('first_message')->index();
                $table->json('trigger_keywords')->nullable(); // Array of keywords or regex string
                $table->boolean('is_case_sensitive')->default(false);

                // Delay strategies
                $table->string('delay_type', 30)->default('instant'); // instant, fixed, random
                $table->integer('delay_seconds')->default(0);
                $table->integer('random_delay_min')->default(10);
                $table->integer('random_delay_max')->default(30);

                // Message payload
                $table->string('message_type', 30)->default('text'); // text, photo, video, gif, audio, voice, file
                $table->text('message_body')->nullable();
                $table->foreignUuid('media_id')->nullable()->constrained('media_library')->nullOnDelete();
                $table->string('media_caption', 500)->nullable();
                $table->boolean('is_album')->default(false);
                $table->json('media_attachments')->nullable(); // Array of attached media IDs & captions
                $table->json('inline_buttons')->nullable(); // Inline keyboard button structure

                // Stats
                $table->unsignedBigInteger('triggered_count')->default(0);
                $table->unsignedBigInteger('sent_count')->default(0);
                $table->timestamp('last_triggered_at')->nullable();

                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 3. telegram_button_actions (Inline Keyboard buttons)
        if (!Schema::hasTable('telegram_button_actions')) {
            Schema::create('telegram_button_actions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('action_type', 50); // open_url, call_number, copy_coupon, callback, next_message, previous_message, menu_button
                $table->string('button_label', 100);
                $table->string('button_data', 500); // URL, phone number, coupon code, callback payload
                $table->unsignedInteger('click_count')->default(0);
                $table->timestamps();
            });
        }

        // 4. telegram_sequence_conditions (Conditional Logic for Follow-Up Steps)
        if (!Schema::hasTable('telegram_sequence_conditions')) {
            Schema::create('telegram_sequence_conditions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('step_id')->nullable()->constrained('followup_steps')->cascadeOnDelete();
                // Condition types: user_did_not_reply, user_replied, button_clicked, message_viewed, user_inactive, user_active, delivered, failed
                $table->string('condition_type', 50)->default('user_did_not_reply');
                $table->json('condition_params')->nullable();
                $table->timestamps();
            });
        }

        // 5. telegram_scheduler_settings (Enterprise Campaign Rules & Timing)
        if (!Schema::hasTable('telegram_scheduler_settings')) {
            Schema::create('telegram_scheduler_settings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
                $table->string('timezone', 50)->default('UTC');
                $table->boolean('working_hours_enabled')->default(false);
                $table->string('working_hours_start', 10)->default('09:00');
                $table->string('working_hours_end', 10)->default('18:00');
                $table->boolean('quiet_hours_enabled')->default(true);
                $table->string('quiet_hours_start', 10)->default('22:00');
                $table->string('quiet_hours_end', 10)->default('08:00');
                $table->boolean('weekend_skip')->default(false);
                $table->boolean('holiday_skip')->default(false);
                $table->integer('max_followups_per_contact')->default(5);
                $table->boolean('stop_after_reply')->default(true);
                $table->integer('resume_after_days')->default(0); // 0 = never resume
                $table->boolean('human_delay_simulation')->default(true);
                $table->integer('typing_delay_per_char_ms')->default(30);
                $table->integer('read_delay_seconds')->default(5);
                $table->timestamps();
            });

            // Seed default global settings
            DB::table('telegram_scheduler_settings')->insert([
                'id' => '22222222-2222-2222-2222-222222220001',
                'account_id' => null,
                'timezone' => 'UTC',
                'working_hours_enabled' => false,
                'working_hours_start' => '09:00',
                'working_hours_end' => '18:00',
                'quiet_hours_enabled' => true,
                'quiet_hours_start' => '22:00',
                'quiet_hours_end' => '08:00',
                'weekend_skip' => false,
                'holiday_skip' => false,
                'max_followups_per_contact' => 5,
                'stop_after_reply' => true,
                'resume_after_days' => 0,
                'human_delay_simulation' => true,
                'typing_delay_per_char_ms' => 30,
                'read_delay_seconds' => 5,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 6. telegram_analytics_snapshots (Historical Performance Tracking)
        if (!Schema::hasTable('telegram_analytics_snapshots')) {
            Schema::create('telegram_analytics_snapshots', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->date('date')->index();
                $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
                $table->unsignedInteger('messages_sent')->default(0);
                $table->unsignedInteger('messages_delivered')->default(0);
                $table->unsignedInteger('messages_read')->default(0);
                $table->unsignedInteger('messages_failed')->default(0);
                $table->unsignedInteger('auto_replies_triggered')->default(0);
                $table->unsignedInteger('followups_triggered')->default(0);
                $table->unsignedInteger('replies_received')->default(0);
                $table->unsignedInteger('button_clicks')->default(0);
                $table->decimal('reply_rate', 5, 2)->default(0.00);
                $table->decimal('click_through_rate', 5, 2)->default(0.00);
                $table->timestamps();
            });
        }

        // 7. Extend reply_templates if not already possessing category and favorite
        Schema::table('reply_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('reply_templates', 'category')) {
                $table->string('category', 50)->default('welcome')->after('name'); // welcome, support, promotion, followup, reminder, payment, verification, offers, custom
            }
            if (!Schema::hasColumn('reply_templates', 'is_favorite')) {
                $table->boolean('is_favorite')->default(false)->after('category');
            }
            if (!Schema::hasColumn('reply_templates', 'inline_buttons')) {
                $table->json('inline_buttons')->nullable()->after('message_body');
            }
        });

        // 8. Extend followup_steps to store conditions and rich types
        Schema::table('followup_steps', function (Blueprint $table) {
            if (!Schema::hasColumn('followup_steps', 'step_type')) {
                $table->string('step_type', 30)->default('text')->after('delay_seconds'); // text, image, video, gif, file, voice, poll, button
            }
            if (!Schema::hasColumn('followup_steps', 'delay_unit')) {
                $table->string('delay_unit', 20)->default('minutes')->after('delay_seconds'); // minutes, hours, days, weeks, months, specific_date
            }
            if (!Schema::hasColumn('followup_steps', 'specific_datetime')) {
                $table->timestamp('specific_datetime')->nullable()->after('delay_unit');
            }
            if (!Schema::hasColumn('followup_steps', 'condition_type')) {
                $table->string('condition_type', 50)->default('user_did_not_reply')->after('specific_datetime');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_analytics_snapshots');
        Schema::dropIfExists('telegram_scheduler_settings');
        Schema::dropIfExists('telegram_sequence_conditions');
        Schema::dropIfExists('telegram_button_actions');
        Schema::dropIfExists('telegram_auto_replies');
        Schema::dropIfExists('telegram_variables');
    }
};
