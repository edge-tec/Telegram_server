<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAutoReplyStep extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_auto_reply_steps';

    protected $fillable = [
        'sequence_id',
        'step_number',
        'delay_value',
        'delay_unit',
        'delay_seconds_computed',
        'message_text',
        'media_id',
        'media_url',
        'media_type',
        'media_caption',
        'links',
        'inline_buttons',
        'conditions',
        'is_active',
        'sent_count',
    ];

    protected function casts(): array
    {
        return [
            'step_number' => 'integer',
            'delay_value' => 'integer',
            'delay_seconds_computed' => 'integer',
            'is_active' => 'boolean',
            'sent_count' => 'integer',
            'links' => 'array',
            'inline_buttons' => 'array',
            'conditions' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function ($step) {
            $val = max(0, (int)$step->delay_value);
            $mult = match ($step->delay_unit) {
                'minutes' => 60,
                'hours' => 3600,
                'days' => 86400,
                default => 1,
            };
            $step->delay_seconds_computed = $val * $mult;
        });
    }

    public function sequence(): BelongsTo
    {
        return $this->belongsTo(TelegramAutoReplySequence::class, 'sequence_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaLibrary::class, 'media_id');
    }

    public function getDelayInSeconds(): int
    {
        return $this->delay_seconds_computed ?: 0;
    }
}
