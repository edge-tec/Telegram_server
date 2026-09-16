<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Roles & Permissions / User role field
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('admin')->after('email'); // super_admin, admin, manager, support_agent
            }
            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('role');
            }
        });

        // 2. telegram_accounts
        Schema::create('telegram_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('alias', 100);
            $table->text('phone_encrypted');
            $table->text('api_id_encrypted');
            $table->text('api_hash_encrypted');
            $table->longText('session_string_encrypted');
            $table->string('status', 30)->default('disconnected'); // connected, disconnected, expired
            $table->string('telegram_id', 50)->nullable()->index();
            $table->string('username', 100)->nullable();
            $table->string('first_name', 150)->nullable();
            $table->string('last_name', 150)->nullable();
            $table->timestamp('last_connected_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. telegram_users (External contacts who message the accounts)
        Schema::create('telegram_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('telegram_id')->unique()->index();
            $table->string('username', 100)->nullable()->index();
            $table->string('first_name', 150)->nullable();
            $table->string('last_name', 150)->nullable();
            $table->string('phone', 50)->nullable();
            $table->boolean('is_blacklisted')->default(false)->index();
            $table->timestamps();
        });

        // 4. telegram_conversations
        Schema::create('telegram_conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->constrained('telegram_accounts')->cascadeOnDelete();
            $table->foreignUuid('telegram_user_id')->constrained('telegram_users')->cascadeOnDelete();
            $table->string('status', 30)->default('new')->index(); // new, active, completed, blacklisted
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamp('last_message_at')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['account_id', 'telegram_user_id']);
        });

        // 5. media_library
        Schema::create('media_library', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('file_name', 255);
            $table->string('file_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('file_type', 30)->default('photo'); // photo, video, voice, audio, document, sticker, gif
            $table->timestamps();
            $table->softDeletes();
        });

        // 6. reply_templates
        Schema::create('reply_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 150);
            $table->string('trigger_type', 30)->default('auto_reply'); // auto_reply, keyword, followup, rule
            $table->string('delay_type', 30)->default('instant'); // instant, fixed, random
            $table->integer('delay_seconds')->default(0);
            $table->integer('random_delay_min')->default(20);
            $table->integer('random_delay_max')->default(40);
            $table->string('reply_type', 30)->default('text'); // text, photo, video, voice, audio, sticker, gif, document
            $table->text('message_body')->nullable();
            $table->foreignUuid('media_id')->nullable()->constrained('media_library')->nullOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        // 7. followup_campaigns
        Schema::create('followup_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('active')->index(); // active, paused, completed
            $table->string('on_reply_action', 30)->default('stop'); // stop, continue, restart, pause
            $table->unsignedInteger('total_users')->default(0);
            $table->unsignedInteger('active_users')->default(0);
            $table->unsignedInteger('completed_users')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. followup_steps
        Schema::create('followup_steps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('campaign_id')->constrained('followup_campaigns')->cascadeOnDelete();
            $table->unsignedInteger('step_order')->default(1);
            $table->integer('delay_seconds')->default(0);
            $table->foreignUuid('template_id')->constrained('reply_templates')->cascadeOnDelete();
            $table->timestamps();
        });

        // 9. scheduled_messages (Queue table for followups and delayed replies)
        Schema::create('scheduled_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('telegram_conversations')->cascadeOnDelete();
            $table->foreignUuid('campaign_id')->nullable()->constrained('followup_campaigns')->nullOnDelete();
            $table->foreignUuid('step_id')->nullable()->constrained('followup_steps')->nullOnDelete();
            $table->foreignUuid('template_id')->constrained('reply_templates')->cascadeOnDelete();
            $table->timestamp('scheduled_at')->index();
            $table->string('status', 30)->default('pending')->index(); // pending, processing, sent, failed, cancelled
            $table->unsignedInteger('retry_count')->default(0);
            $table->text('error_log')->nullable();
            $table->timestamps();
        });

        // 10. telegram_messages (Chat history)
        Schema::create('telegram_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('telegram_conversations')->cascadeOnDelete();
            $table->string('direction', 10)->index(); // inbound, outbound
            $table->unsignedBigInteger('sender_id')->index();
            $table->string('message_type', 30)->default('text'); // text, photo, video, voice, audio, sticker, gif, document
            $table->text('content')->nullable();
            $table->string('media_path', 500)->nullable();
            $table->string('status', 30)->default('received'); // received, pending, sent, failed
            $table->string('telegram_message_id', 50)->nullable();
            $table->timestamps();
        });

        // 11. keyword_rules
        Schema::create('keyword_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
            $table->json('keywords'); // ["price", "cost", "pricing"]
            $table->string('match_type', 20)->default('contains'); // exact, contains
            $table->boolean('is_case_sensitive')->default(false);
            $table->integer('priority')->default(10)->index();
            $table->foreignUuid('template_id')->constrained('reply_templates')->cascadeOnDelete();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        // 12. blacklist_users
        Schema::create('blacklist_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('telegram_user_id')->constrained('telegram_users')->cascadeOnDelete();
            $table->string('reason', 255)->default('User requested STOP');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 13. user_tags
        Schema::create('user_tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('conversation_id')->constrained('telegram_conversations')->cascadeOnDelete();
            $table->string('tag_name', 50)->index();
            $table->timestamps();
        });

        // 14. message_logs
        Schema::create('message_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
            $table->foreignUuid('conversation_id')->nullable()->constrained('telegram_conversations')->nullOnDelete();
            $table->string('event_type', 50); // inbound_received, auto_reply_sent, followup_sent, error
            $table->json('payload')->nullable();
            $table->string('status', 30)->default('success');
            $table->timestamps();
        });

        // 15. activity_logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 100);
            $table->text('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('message_logs');
        Schema::dropIfExists('user_tags');
        Schema::dropIfExists('blacklist_users');
        Schema::dropIfExists('keyword_rules');
        Schema::dropIfExists('telegram_messages');
        Schema::dropIfExists('scheduled_messages');
        Schema::dropIfExists('followup_steps');
        Schema::dropIfExists('followup_campaigns');
        Schema::dropIfExists('reply_templates');
        Schema::dropIfExists('media_library');
        Schema::dropIfExists('telegram_conversations');
        Schema::dropIfExists('telegram_users');
        Schema::dropIfExists('telegram_accounts');
    }
};
