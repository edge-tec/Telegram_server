<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramAdminAutoReply extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'telegram_admin_auto_replies';

    protected $fillable = [
        'user_id',
        'account_id',
        'name',
        'description',
        'status',
        'priority',
        'trigger_type',
        'trigger_keywords',
        'is_global',
        'force_auto_reply',
        'disable_user_editing',
        'lock_message',
        'lock_media',
        'lock_links',
        'visibility',
        'target_plans',
        'target_users',
        'total_sent',
        'total_contacts',
    ];

    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'trigger_keywords' => 'array',
            'is_global' => 'boolean',
            'force_auto_reply' => 'boolean',
            'disable_user_editing' => 'boolean',
            'lock_message' => 'boolean',
            'lock_media' => 'boolean',
            'lock_links' => 'boolean',
            'target_plans' => 'array',
            'target_users' => 'array',
            'total_sent' => 'integer',
            'total_contacts' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(TelegramAdminAutoReplyStep::class, 'auto_reply_id')
            ->orderBy('step_number', 'asc');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(TelegramAdminAutoReplyLog::class, 'auto_reply_id')
            ->latest();
    }
}
