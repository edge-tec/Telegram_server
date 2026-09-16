<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. telegram_auto_reply_sequences (Multi-step sequential auto reply containers)
        if (!Schema::hasTable('telegram_auto_reply_sequences')) {
            Schema::create('telegram_auto_reply_sequences', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('account_id')->nullable()->constrained('telegram_accounts')->nullOnDelete();
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->string('status', 30)->default('active')->index(); // active, paused, draft
                $table->unsignedInteger('total_contacts')->default(0);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. telegram_auto_reply_steps (Unlimited auto reply steps: Step 1, Step 2, Step 3... Step 100+)
        if (!Schema::hasTable('telegram_auto_reply_steps')) {
            Schema::create('telegram_auto_reply_steps', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('sequence_id')->constrained('telegram_auto_reply_sequences')->cascadeOnDelete();
                $table->unsignedInteger('step_number')->default(1)->index();
                
                // Delay after traffic reply
                $table->unsignedInteger('delay_value')->default(0);
                $table->string('delay_unit', 20)->default('seconds'); // seconds, minutes, hours, days
                $table->unsignedInteger('delay_seconds_computed')->default(0); // computed for fast indexing

                // Message payload
                $table->text('message_text')->nullable();
                $table->foreignUuid('media_id')->nullable()->constrained('media_library')->nullOnDelete();
                $table->string('media_url', 500)->nullable();
                $table->string('media_type', 30)->default('text'); // text, photo, video, gif, audio, voice, document
                $table->string('media_caption', 500)->nullable();
                $table->json('links')->nullable(); // [{"label": "Website", "url": "https://..."}]
                $table->json('inline_buttons')->nullable(); // inline keyboard buttons
                $table->json('conditions')->nullable(); // optional rules

                $table->boolean('is_active')->default(true)->index();
                $table->unsignedBigInteger('sent_count')->default(0);

                $table->timestamps();
            });
        }

        // 3. telegram_conversation_states (Tracks conversation progression across both engines)
        if (!Schema::hasTable('telegram_conversation_states')) {
            Schema::create('telegram_conversation_states', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('conversation_id')->unique()->constrained('telegram_conversations')->cascadeOnDelete();
                
                // Auto Reply Engine State
                $table->foreignUuid('auto_reply_sequence_id')->nullable()->constrained('telegram_auto_reply_sequences')->nullOnDelete();
                $table->unsignedInteger('current_auto_reply_step')->default(0); // 0 = not started, 1 = step 1 sent, etc.
                $table->timestamp('last_auto_reply_sent_at')->nullable();

                // Follow-Up Engine State
                $table->foreignUuid('followup_campaign_id')->nullable()->constrained('followup_campaigns')->nullOnDelete();
                $table->unsignedInteger('current_followup_step')->default(0);
                $table->timestamp('last_followup_sent_at')->nullable();
                $table->boolean('is_followup_stopped')->default(false); // true when user replies and stop_on_reply is enabled

                $table->timestamps();
            });
        }

        // 4. telegram_followup_queue (Production queue with idempotency and strict sequencing)
        if (!Schema::hasTable('telegram_followup_queue')) {
            Schema::create('telegram_followup_queue', function (Blueprint $table) {
                $table->uuid('id')->primary();
                // Idempotency key guarantees zero duplicate sending: campaign:conversation:step
                $table->string('idempotency_key', 200)->unique()->index();

                $table->foreignUuid('campaign_id')->constrained('followup_campaigns')->cascadeOnDelete();
                $table->foreignUuid('conversation_id')->constrained('telegram_conversations')->cascadeOnDelete();
                $table->unsignedBigInteger('telegram_user_id')->index();
                $table->uuid('step_id')->index();
                $table->unsignedInteger('step_order')->default(1)->index();

                $table->timestamp('scheduled_at')->index();
                $table->timestamp('sent_at')->nullable();
                $table->string('status', 30)->default('pending')->index(); // draft, scheduled, pending, sending, sent, delivered, failed, cancelled, skipped, paused
                $table->unsignedInteger('retry_count')->default(0);
                $table->text('error_message')->nullable();

                $table->timestamps();
            });
        }

        // 5. Enhance followup_campaigns table
        Schema::table('followup_campaigns', function (Blueprint $table) {
            if (!Schema::hasColumn('followup_campaigns', 'stop_on_reply')) {
                $table->boolean('stop_on_reply')->default(true)->after('on_reply_action');
            }
            if (!Schema::hasColumn('followup_campaigns', 'timezone')) {
                $table->string('timezone', 50)->default('UTC')->after('stop_on_reply');
            }
            if (!Schema::hasColumn('followup_campaigns', 'working_hours_enabled')) {
                $table->boolean('working_hours_enabled')->default(false)->after('timezone');
                $table->string('working_hours_start', 10)->default('09:00')->after('working_hours_enabled');
                $table->string('working_hours_end', 10)->default('21:00')->after('working_hours_start');
            }
            if (!Schema::hasColumn('followup_campaigns', 'quiet_hours_enabled')) {
                $table->boolean('quiet_hours_enabled')->default(true)->after('working_hours_end');
                $table->string('quiet_hours_start', 10)->default('23:00')->after('quiet_hours_enabled');
                $table->string('quiet_hours_end', 10)->default('08:00')->after('quiet_hours_start');
            }
            if (!Schema::hasColumn('followup_campaigns', 'max_retries')) {
                $table->unsignedInteger('max_retries')->default(3)->after('quiet_hours_end');
            }
        });

        // 6. Enhance followup_steps table for rich media and relative/exact time settings
        Schema::table('followup_steps', function (Blueprint $table) {
            if (!Schema::hasColumn('followup_steps', 'step_name')) {
                $table->string('step_name', 150)->nullable()->after('campaign_id');
            }
            if (!Schema::hasColumn('followup_steps', 'time_type')) {
                $table->string('time_type', 30)->default('relative')->after('step_order'); // relative, exact_datetime
            }
            if (!Schema::hasColumn('followup_steps', 'delay_value')) {
                $table->unsignedInteger('delay_value')->default(10)->after('time_type');
            }
            if (!Schema::hasColumn('followup_steps', 'exact_datetime')) {
                $table->timestamp('exact_datetime')->nullable()->after('delay_value');
            }
            if (!Schema::hasColumn('followup_steps', 'message_text')) {
                $table->text('message_text')->nullable()->after('template_id');
            }
            if (!Schema::hasColumn('followup_steps', 'media_url')) {
                $table->string('media_url', 500)->nullable()->after('message_text');
                $table->string('media_type', 30)->default('text')->after('media_url');
                $table->string('media_caption', 500)->nullable()->after('media_type');
            }
            if (!Schema::hasColumn('followup_steps', 'links')) {
                $table->json('links')->nullable()->after('media_caption');
            }
            if (!Schema::hasColumn('followup_steps', 'inline_buttons')) {
                $table->json('inline_buttons')->nullable()->after('links');
            }
            if (!Schema::hasColumn('followup_steps', 'status')) {
                $table->string('status', 30)->default('active')->after('inline_buttons');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_followup_queue');
        Schema::dropIfExists('telegram_conversation_states');
        Schema::dropIfExists('telegram_auto_reply_steps');
        Schema::dropIfExists('telegram_auto_reply_sequences');
    }
};
