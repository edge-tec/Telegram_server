<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramMessage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'conversation_id',
        'direction',
        'sender_id',
        'message_type',
        'content',
        'media_path',
        'status',
        'telegram_message_id',
    ];

    protected function casts(): array
    {
        return [
            'sender_id' => 'integer',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(TelegramConversation::class, 'conversation_id');
    }
}
