<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramSequenceCondition extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_sequence_conditions';

    protected $fillable = [
        'step_id',
        'condition_type',
        'condition_params',
    ];

    protected function casts(): array
    {
        return [
            'condition_params' => 'array',
        ];
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(FollowupStep::class, 'step_id');
    }
}
