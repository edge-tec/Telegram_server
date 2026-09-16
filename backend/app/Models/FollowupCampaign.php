<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FollowupCampaign extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'account_id',
        'name',
        'description',
        'status',
        'on_reply_action',
        'total_users',
        'active_users',
        'completed_users',
    ];

    protected function casts(): array
    {
        return [
            'total_users' => 'integer',
            'active_users' => 'integer',
            'completed_users' => 'integer',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(FollowupStep::class, 'campaign_id')->orderBy('step_order', 'asc');
    }

    public function scheduledMessages(): HasMany
    {
        return $this->hasMany(ScheduledMessage::class, 'campaign_id');
    }
}
