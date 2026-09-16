<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAdminAutoReplyLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_admin_auto_reply_logs';

    protected $fillable = [
        'auto_reply_id',
        'step_id',
        'account_id',
        'telegram_user_id',
        'status',
        'error_message',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function autoReply(): BelongsTo
    {
        return $this->belongsTo(TelegramAdminAutoReply::class, 'auto_reply_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(TelegramAdminAutoReplyStep::class, 'step_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'account_id');
    }
}
