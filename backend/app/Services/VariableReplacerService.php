<?php

namespace App\Services;

use App\Models\TelegramUser;
use App\Models\TelegramVariable;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class VariableReplacerService
{
    /**
     * Replace dynamic variables in template text using both <tag> and {{tag}} syntax.
     */
    public function replace(?string $text, ?TelegramUser $user = null, array $extraContext = []): string
    {
        if (empty($text)) {
            return '';
        }

        $now = Carbon::now();

        // 1. Core Contact & System Defaults
        $baseVars = [
            'first_name' => $user?->first_name ?: ($user?->username ?: 'Friend'),
            'last_name' => $user?->last_name ?: '',
            'username' => $user?->username ? '@' . $user->username : ($user?->first_name ?: 'friend'),
            'phone' => $user?->phone ?: 'N/A',
            'telegram_id' => $user?->telegram_id ? (string)$user->telegram_id : '0',
            'country' => $extraContext['country'] ?? 'Global',
            'city' => $extraContext['city'] ?? 'Your City',
            'language' => $extraContext['language'] ?? 'en',
            'current_date' => $now->format('Y-m-d'),
            'current_time' => $now->format('H:i'),
            'campaign_name' => $extraContext['campaign_name'] ?? 'Automation',
        ];

        // 2. Load custom variables from DB if table exists
        if (Schema::hasTable('telegram_variables')) {
            try {
                $dbVars = TelegramVariable::all();
                foreach ($dbVars as $v) {
                    if (!isset($baseVars[$v->key])) {
                        $baseVars[$v->key] = $extraContext[$v->key] ?? $v->fallback_value ?? '';
                    }
                }
            } catch (\Throwable $e) {
                // Ignore DB error during early boot/tests
            }
        }

        // Merge extraContext overrides
        foreach ($extraContext as $k => $v) {
            $baseVars[$k] = (string)$v;
        }

        // 3. Build replacement map supporting both <tag> and {{tag}}
        $replacements = [];
        foreach ($baseVars as $key => $val) {
            $replacements['<' . $key . '>'] = (string)$val;
            $replacements['{{' . $key . '}}'] = (string)$val;
        }

        return str_replace(array_keys($replacements), array_values($replacements), $text);
    }
}
