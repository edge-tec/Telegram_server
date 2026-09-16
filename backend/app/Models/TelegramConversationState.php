<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramConversationState extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_conversation_states';

    protected $fillable = [
        'conversation_id',
        'auto_reply_sequence_id',
        'current_auto_reply_step',
        'last_auto_reply_sent_at',
        'followup_campaign_id',
        'current_followup_step',
        'last_followup_sent_at',
        'is_followup_stopped',
    ];

    protected function casts(): array
    {
        return [
            'current_auto_reply_step' => 'integer',
            'current_followup_step' => 'integer',
            'is_followup_stopped' => 'boolean',
            'last_auto_reply_sent_at' => 'datetime',
            'last_followup_sent_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(TelegramConversation::class, 'conversation_id');
    }

    public function autoReplySequence(): BelongsTo
    {
        return $this->belongsTo(TelegramAutoReplySequence::class, 'auto_reply_sequence_id');
    }

    public function followupCampaign(): BelongsTo
    {
        return $this->belongsTo(FollowupCampaign::class, 'followup_campaign_id');
    }
}
