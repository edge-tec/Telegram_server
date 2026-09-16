<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReplyTemplate extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'trigger_type',
        'delay_type',
        'delay_seconds',
        'random_delay_min',
        'random_delay_max',
        'reply_type',
        'message_body',
        'media_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'delay_seconds' => 'integer',
            'random_delay_min' => 'integer',
            'random_delay_max' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(MediaLibrary::class, 'media_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(FollowupStep::class, 'template_id');
    }

    public function keywordRules(): HasMany
    {
        return $this->hasMany(KeywordRule::class, 'template_id');
    }

    /**
     * Compute effective delay in seconds
     */
    public function computeDelaySeconds(): int
    {
        if ($this->delay_type === 'random') {
            $min = max(0, $this->random_delay_min ?: 20);
            $max = max($min, $this->random_delay_max ?: 40);
            return rand($min, $max);
        }
        if ($this->delay_type === 'fixed') {
            return max(0, $this->delay_seconds);
        }
        return 0; // instant
    }
}
