<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramAutoReplySequence extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'telegram_auto_reply_sequences';

    protected $fillable = [
        'account_id',
        'name',
        'description',
        'status',
        'total_contacts',
    ];

    protected function casts(): array
    {
        return [
            'total_contacts' => 'integer',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(TelegramAutoReplyStep::class, 'sequence_id')->orderBy('step_number', 'asc');
    }
}
