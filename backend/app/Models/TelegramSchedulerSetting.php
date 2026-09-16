<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramSchedulerSetting extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_scheduler_settings';

    protected $fillable = [
        'account_id',
        'timezone',
        'working_hours_enabled',
        'working_hours_start',
        'working_hours_end',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'weekend_skip',
        'holiday_skip',
        'max_followups_per_contact',
        'stop_after_reply',
        'resume_after_days',
        'human_delay_simulation',
        'typing_delay_per_char_ms',
        'read_delay_seconds',
    ];

    protected function casts(): array
    {
        return [
            'working_hours_enabled' => 'boolean',
            'quiet_hours_enabled' => 'boolean',
            'weekend_skip' => 'boolean',
            'holiday_skip' => 'boolean',
            'max_followups_per_contact' => 'integer',
            'stop_after_reply' => 'boolean',
            'resume_after_days' => 'integer',
            'human_delay_simulation' => 'boolean',
            'typing_delay_per_char_ms' => 'integer',
            'read_delay_seconds' => 'integer',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }
}
