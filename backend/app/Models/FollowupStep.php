<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FollowupStep extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'campaign_id',
        'step_order',
        'delay_seconds',
        'template_id',
    ];

    protected function casts(): array
    {
        return [
            'step_order' => 'integer',
            'delay_seconds' => 'integer',
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(FollowupCampaign::class, 'campaign_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(ReplyTemplate::class, 'template_id');
    }
}
