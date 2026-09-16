<?php

namespace App\Services;

use App\Models\KeywordRule;
use App\Models\TelegramAccount;
use Illuminate\Database\Eloquent\Collection;

class KeywordMatcherService
{
    protected array $stopKeywords = ['stop', 'cancel', 'unsubscribe'];

    /**
     * Check if text matches unsubscribe / stop triggers
     */
    public function isStopTrigger(string $text): bool
    {
        $clean = trim(strtolower($text));
        return in_array($clean, $this->stopKeywords);
    }

    /**
     * Find best matching keyword rule for an account
     */
    public function findMatchingRule(string $text, ?string $accountId = null): ?KeywordRule
    {
        $query = KeywordRule::where('is_active', true);

        if ($accountId !== null) {
            $query->where(function ($q) use ($accountId) {
                $q->whereNull('account_id')->orWhere('account_id', $accountId);
            });
        }

        $rules = $query->with('template.media')
            ->orderBy('priority', 'desc')
            ->get();

        foreach ($rules as $rule) {
            if ($this->doesTextMatchRule($text, $rule)) {
                return $rule;
            }
        }

        return null;
    }

    protected function doesTextMatchRule(string $text, KeywordRule $rule): bool
    {
        $keywords = $rule->keywords;
        if (!is_array($keywords) || empty($keywords)) {
            return false;
        }

        $input = $rule->is_case_sensitive ? $text : mb_strtolower($text);

        foreach ($keywords as $kw) {
            $pattern = $rule->is_case_sensitive ? trim($kw) : mb_strtolower(trim($kw));
            if ($pattern === '') continue;

            if ($rule->match_type === 'exact') {
                if (trim($input) === $pattern) {
                    return true;
                }
            } else {
                // contains match
                if (str_contains($input, $pattern)) {
                    return true;
                }
            }
        }

        return false;
    }
}
