<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramFollowupQueue extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_followup_queue';

    protected $fillable = [
        'idempotency_key',
        'campaign_id',
        'conversation_id',
        'telegram_user_id',
        'step_id',
        'step_order',
        'scheduled_at',
        'sent_at',
        'status',
        'retry_count',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'step_order' => 'integer',
            'retry_count' => 'integer',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(FollowupCampaign::class, 'campaign_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(TelegramConversation::class, 'conversation_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(FollowupStep::class, 'step_id');
    }
}
