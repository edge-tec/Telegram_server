<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramSchedulerSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function getSettings(Request $request): JsonResponse
    {
        $accountId = $request->query('account_id');

        $settings = null;
        if ($accountId) {
            $settings = TelegramSchedulerSetting::where('account_id', $accountId)->first();
        }

        if (!$settings) {
            $settings = TelegramSchedulerSetting::whereNull('account_id')->first();
        }

        if (!$settings) {
            $settings = TelegramSchedulerSetting::create([
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
            ]);
        }

        return response()->json($settings);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $accountId = $request->input('account_id');

        $validated = $request->validate([
            'timezone' => 'nullable|string',
            'working_hours_enabled' => 'boolean',
            'working_hours_start' => 'nullable|string',
            'working_hours_end' => 'nullable|string',
            'quiet_hours_enabled' => 'boolean',
            'quiet_hours_start' => 'nullable|string',
            'quiet_hours_end' => 'nullable|string',
            'weekend_skip' => 'boolean',
            'holiday_skip' => 'boolean',
            'max_followups_per_contact' => 'nullable|integer|min:1',
            'stop_after_reply' => 'boolean',
            'resume_after_days' => 'nullable|integer|min:0',
            'human_delay_simulation' => 'boolean',
            'typing_delay_per_char_ms' => 'nullable|integer|min:0',
            'read_delay_seconds' => 'nullable|integer|min:0',
        ]);

        $settings = null;
        if ($accountId) {
            $settings = TelegramSchedulerSetting::firstOrNew(['account_id' => $accountId]);
        } else {
            $settings = TelegramSchedulerSetting::whereNull('account_id')->first()
                ?: new TelegramSchedulerSetting(['account_id' => null]);
        }

        $settings->fill($validated);
        $settings->save();

        return response()->json([
            'message' => 'Automation settings saved successfully',
            'settings' => $settings,
        ]);
    }
}
