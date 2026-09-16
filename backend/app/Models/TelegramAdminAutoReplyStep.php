<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramAdminAutoReplyStep extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_admin_auto_reply_steps';

    protected $fillable = [
        'auto_reply_id',
        'step_number',
        'step_name',
        'delay_value',
        'delay_unit',
        'message_format',
        'message_text',
        'is_active',
        'sent_count',
    ];

    protected function casts(): array
    {
        return [
            'step_number' => 'integer',
            'delay_value' => 'integer',
            'is_active' => 'boolean',
            'sent_count' => 'integer',
        ];
    }

    public function autoReply(): BelongsTo
    {
        return $this->belongsTo(TelegramAdminAutoReply::class, 'auto_reply_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(TelegramAdminAutoReplyMedia::class, 'step_id')
            ->orderBy('order_index', 'asc');
    }

    public function links(): HasMany
    {
        return $this->hasMany(TelegramAdminAutoReplyLink::class, 'step_id')
            ->orderBy('order_index', 'asc');
    }

    public function buttons(): HasMany
    {
        return $this->hasMany(TelegramAdminAutoReplyButton::class, 'step_id')
            ->orderBy('row_index', 'asc')
            ->orderBy('col_index', 'asc');
    }

    public function getDelayInSeconds(): int
    {
        return match ($this->delay_unit) {
            'seconds' => $this->delay_value,
            'minutes' => $this->delay_value * 60,
            'hours' => $this->delay_value * 3600,
            'days' => $this->delay_value * 86400,
            default => $this->delay_value,
        };
    }
}
