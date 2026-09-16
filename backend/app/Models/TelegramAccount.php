<?php

namespace App\Models;

use App\Services\EncryptionService;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramAccount extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'alias',
        'phone_encrypted',
        'api_id_encrypted',
        'api_hash_encrypted',
        'session_string_encrypted',
        'status',
        'telegram_id',
        'username',
        'first_name',
        'last_name',
        'last_connected_at',
    ];

    protected $hidden = [
        'phone_encrypted',
        'api_id_encrypted',
        'api_hash_encrypted',
        'session_string_encrypted',
    ];

    protected $appends = [
        'phone_masked',
    ];

    protected function casts(): array
    {
        return [
            'last_connected_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(TelegramConversation::class, 'account_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(FollowupCampaign::class, 'account_id');
    }

    public function keywordRules(): HasMany
    {
        return $this->hasMany(KeywordRule::class, 'account_id');
    }

    public function setPhoneAttribute(string $value): void
    {
        $enc = app(EncryptionService::class);
        $this->attributes['phone_encrypted'] = $enc->encrypt($value);
    }

    public function getPhoneAttribute(): ?string
    {
        if (empty($this->attributes['phone_encrypted'])) {
            return null;
        }
        $enc = app(EncryptionService::class);
        return $enc->decrypt($this->attributes['phone_encrypted']);
    }

    public function setApiIdAttribute(int|string $value): void
    {
        $enc = app(EncryptionService::class);
        $this->attributes['api_id_encrypted'] = $enc->encrypt((string)$value);
    }

    public function getApiIdAttribute(): ?int
    {
        if (empty($this->attributes['api_id_encrypted'])) {
            return null;
        }
        $enc = app(EncryptionService::class);
        return (int)$enc->decrypt($this->attributes['api_id_encrypted']);
    }

    public function setApiHashAttribute(string $value): void
    {
        $enc = app(EncryptionService::class);
        $this->attributes['api_hash_encrypted'] = $enc->encrypt($value);
    }

    public function getApiHashAttribute(): ?string
    {
        if (empty($this->attributes['api_hash_encrypted'])) {
            return null;
        }
        $enc = app(EncryptionService::class);
        return $enc->decrypt($this->attributes['api_hash_encrypted']);
    }

    public function setSessionStringAttribute(string $value): void
    {
        $enc = app(EncryptionService::class);
        $this->attributes['session_string_encrypted'] = $enc->encrypt($value);
    }

    public function getSessionStringAttribute(): ?string
    {
        if (empty($this->attributes['session_string_encrypted'])) {
            return null;
        }
        $enc = app(EncryptionService::class);
        return $enc->decrypt($this->attributes['session_string_encrypted']);
    }

    public function getPhoneMaskedAttribute(): string
    {
        try {
            $phone = $this->phone;
            if (!$phone) return '';
            $len = strlen($phone);
            if ($len <= 4) return '***';
            return substr($phone, 0, 3) . '****' . substr($phone, -4);
        } catch (\Exception $e) {
            return '***';
        }
    }
}
