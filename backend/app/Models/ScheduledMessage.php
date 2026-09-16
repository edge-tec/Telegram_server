<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledMessage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'conversation_id',
        'campaign_id',
        'step_id',
        'template_id',
        'scheduled_at',
        'status',
        'retry_count',
        'error_log',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'retry_count' => 'integer',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(TelegramConversation::class, 'conversation_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(FollowupCampaign::class, 'campaign_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(FollowupStep::class, 'step_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ReplyTemplate::class, 'template_id');
    }
}
