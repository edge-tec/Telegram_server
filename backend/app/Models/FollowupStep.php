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
        'step_name',
        'step_order',
        'delay_seconds',
        'time_type',
        'delay_value',
        'delay_unit',
        'exact_datetime',
        'template_id',
        'message_text',
        'media_url',
        'media_type',
        'links',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'step_order' => 'integer',
            'delay_seconds' => 'integer',
            'delay_value' => 'integer',
            'exact_datetime' => 'datetime',
            'links' => 'array',
        ];
    }

    // Dynamic alias for step_number -> step_order
    public function getStepNumberAttribute()
    {
        return $this->attributes['step_order'] ?? 1;
    }

    public function setStepNumberAttribute($value)
    {
        $this->attributes['step_order'] = (int)$value;
    }

    // Dynamic alias for timing_type -> time_type
    public function getTimingTypeAttribute()
    {
        return $this->attributes['time_type'] ?? 'relative';
    }

    public function setTimingTypeAttribute($value)
    {
        $this->attributes['time_type'] = $value;
    }

    // Dynamic alias for content -> message_text
    public function getContentAttribute()
    {
        return $this->attributes['message_text'] ?? '';
    }

    public function setContentAttribute($value)
    {
        $this->attributes['message_text'] = $value;
    }

    // Dynamic alias for exact_time -> exact_datetime
    public function getExactTimeAttribute()
    {
        return $this->attributes['exact_datetime'] ?? null;
    }

    public function setExactTimeAttribute($value)
    {
        $this->attributes['exact_datetime'] = $value;
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
