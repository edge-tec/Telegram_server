<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TelegramUser extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'telegram_id',
        'username',
        'first_name',
        'last_name',
        'phone',
        'is_blacklisted',
    ];

    protected function casts(): array
    {
        return [
            'telegram_id' => 'integer',
            'is_blacklisted' => 'boolean',
        ];
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(TelegramConversation::class, 'telegram_user_id');
    }

    public function blacklistEntry(): HasOne
    {
        return $this->hasOne(BlacklistUser::class, 'telegram_user_id');
    }

    public function getFullNameAttribute(): string
    {
        $parts = array_filter([$this->first_name, $this->last_name]);
        return implode(' ', $parts) ?: ($this->username ? '@' . $this->username : 'Telegram User #' . $this->telegram_id);
    }
}
