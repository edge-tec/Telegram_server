<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAutoReply extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'telegram_auto_replies';

    protected $fillable = [
        'account_id',
        'name',
        'status',
        'priority',
        'trigger_type',
        'trigger_keywords',
        'is_case_sensitive',
        'delay_type',
        'delay_seconds',
        'random_delay_min',
        'random_delay_max',
        'message_type',
        'message_body',
        'media_id',
        'media_caption',
        'is_album',
        'media_attachments',
        'inline_buttons',
        'triggered_count',
        'sent_count',
        'last_triggered_at',
    ];

    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'is_case_sensitive' => 'boolean',
            'delay_seconds' => 'integer',
            'random_delay_min' => 'integer',
            'random_delay_max' => 'integer',
            'is_album' => 'boolean',
            'trigger_keywords' => 'array',
            'media_attachments' => 'array',
            'inline_buttons' => 'array',
            'triggered_count' => 'integer',
            'sent_count' => 'integer',
            'last_triggered_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaLibrary::class, 'media_id');
    }

    public function computeDelaySeconds(): int
    {
        if ($this->delay_type === 'random') {
            $min = max(0, $this->random_delay_min ?: 10);
            $max = max($min, $this->random_delay_max ?: 30);
            return rand($min, $max);
        }
        if ($this->delay_type === 'fixed') {
            return max(0, $this->delay_seconds);
        }
        return 0; // instant
    }
}
