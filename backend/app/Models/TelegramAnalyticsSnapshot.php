<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAnalyticsSnapshot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_analytics_snapshots';

    protected $fillable = [
        'date',
        'account_id',
        'messages_sent',
        'messages_delivered',
        'messages_read',
        'messages_failed',
        'auto_replies_triggered',
        'followups_triggered',
        'replies_received',
        'button_clicks',
        'reply_rate',
        'click_through_rate',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'messages_sent' => 'integer',
            'messages_delivered' => 'integer',
            'messages_read' => 'integer',
            'messages_failed' => 'integer',
            'auto_replies_triggered' => 'integer',
            'followups_triggered' => 'integer',
            'replies_received' => 'integer',
            'button_clicks' => 'integer',
            'reply_rate' => 'float',
            'click_through_rate' => 'float',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }
}
