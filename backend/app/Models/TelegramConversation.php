<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramConversation extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'account_id',
        'telegram_user_id',
        'status',
        'unread_count',
        'last_message_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'unread_count' => 'integer',
            'last_message_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }

    public function telegramUser(): BelongsTo
    {
        return $this->belongsTo(TelegramUser::class, 'telegram_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TelegramMessage::class, 'conversation_id')->orderBy('created_at', 'asc');
    }

    public function latestMessage()
    {
        return $this->hasOne(TelegramMessage::class, 'conversation_id')->latestOfMany();
    }

    public function scheduledMessages(): HasMany
    {
        return $this->hasMany(ScheduledMessage::class, 'conversation_id');
    }

    public function tags(): HasMany
    {
        return $this->hasMany(UserTag::class, 'conversation_id');
    }
}
