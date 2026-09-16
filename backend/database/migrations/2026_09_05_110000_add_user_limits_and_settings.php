<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'max_telegram_accounts')) {
                $table->integer('max_telegram_accounts')->default(5)->after('is_active');
            }
            if (!Schema::hasColumn('users', 'max_campaigns')) {
                $table->integer('max_campaigns')->default(10)->after('max_telegram_accounts');
            }
            if (!Schema::hasColumn('users', 'daily_message_limit')) {
                $table->integer('daily_message_limit')->default(1000)->after('max_campaigns');
            }
        });

        if (!Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table) {
                $table->string('key', 100)->primary();
                $table->text('value')->nullable();
                $table->string('description')->nullable();
                $table->timestamps();
            });

            DB::table('system_settings')->insert([
                'key' => 'max_system_users',
                'value' => '10',
                'description' => 'Maximum allowed team user accounts in the platform',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'max_telegram_accounts')) {
                $table->dropColumn(['max_telegram_accounts', 'max_campaigns', 'daily_message_limit']);
            }
        });

        Schema::dropIfExists('system_settings');
    }
};
