<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Master Admin Auto Reply Campaigns / Sequences
        Schema::create('telegram_admin_auto_replies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status', 30)->default('active')->index(); // active, paused, draft
            $table->integer('priority')->default(10)->index();
            $table->string('trigger_type', 50)->default('all_messages'); // all_messages, keyword, first_message, regex
            $table->json('trigger_keywords')->nullable();
            
            // Admin Governance & Override Controls
            $table->boolean('is_global')->default(false)->index();
            $table->boolean('force_auto_reply')->default(false);
            $table->boolean('disable_user_editing')->default(false);
            $table->boolean('lock_message')->default(false);
            $table->boolean('lock_media')->default(false);
            $table->boolean('lock_links')->default(false);
            $table->string('visibility', 50)->default('all_users'); // admin_only, all_users, selected_users, selected_plans
            $table->json('target_plans')->nullable();
            $table->json('target_users')->nullable();

            $table->unsignedBigInteger('total_sent')->default(0);
            $table->unsignedBigInteger('total_contacts')->default(0);

            $table->softDeletes();
            $table->timestamps();
        });

        // 2. Admin Auto Reply Steps (Unlimited Sequential Steps)
        Schema::create('telegram_admin_auto_reply_steps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('auto_reply_id')->constrained('telegram_admin_auto_replies')->cascadeOnDelete();
            $table->unsignedInteger('step_number')->default(1)->index();
            $table->string('step_name', 150)->nullable();
            
            // Delays
            $table->unsignedInteger('delay_value')->default(0);
            $table->string('delay_unit', 20)->default('seconds'); // seconds, minutes, hours, days
            
            // Text & Formatting
            $table->string('message_format', 30)->default('markdown'); // markdown, html, rich
            $table->text('message_text')->nullable();

            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('sent_count')->default(0);

            $table->timestamps();
        });

        // 3. Media Attachments (Separated storage with full metadata)
        Schema::create('telegram_admin_auto_reply_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('step_id')->constrained('telegram_admin_auto_reply_steps')->cascadeOnDelete();
            $table->foreignUuid('media_library_id')->nullable()->constrained('media_library')->nullOnDelete();
            $table->string('media_type', 30)->default('photo'); // photo, video, gif, document, audio, voice
            $table->string('file_name')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_url', 1000)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->text('caption')->nullable();
            $table->unsignedInteger('order_index')->default(0);

            $table->timestamps();
        });

        // 4. Clickable Links
        Schema::create('telegram_admin_auto_reply_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('step_id')->constrained('telegram_admin_auto_reply_steps')->cascadeOnDelete();
            $table->string('link_type', 30)->default('inline_url'); // inline_url, raw_url, telegram_channel, telegram_user
            $table->string('label', 200)->nullable();
            $table->string('url', 1000);
            $table->unsignedInteger('order_index')->default(0);

            $table->timestamps();
        });

        // 5. Telegram Inline Keyboard Buttons
        Schema::create('telegram_admin_auto_reply_buttons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('step_id')->constrained('telegram_admin_auto_reply_steps')->cascadeOnDelete();
            $table->unsignedInteger('row_index')->default(0);
            $table->unsignedInteger('col_index')->default(0);
            $table->string('label', 100);
            $table->string('button_type', 40)->default('url'); // url, telegram_url, callback, deep_link, custom_action
            $table->string('data', 1000);
            $table->unsignedInteger('order_index')->default(0);

            $table->timestamps();
        });

        // 6. Admin Execution Logs
        Schema::create('telegram_admin_auto_reply_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('auto_reply_id')->nullable()->constrained('telegram_admin_auto_replies')->nullOnDelete();
            $table->foreignUuid('step_id')->nullable()->constrained('telegram_admin_auto_reply_steps')->nullOnDelete();
            $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
            $table->string('telegram_user_id', 100)->nullable()->index();
            $table->string('status', 30)->default('sent'); // sent, delivered, failed, skipped, locked
            $table->text('error_message')->nullable();
            $table->json('payload')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_admin_auto_reply_logs');
        Schema::dropIfExists('telegram_admin_auto_reply_buttons');
        Schema::dropIfExists('telegram_admin_auto_reply_links');
        Schema::dropIfExists('telegram_admin_auto_reply_media');
        Schema::dropIfExists('telegram_admin_auto_reply_steps');
        Schema::dropIfExists('telegram_admin_auto_reply_replies');
    }
};
