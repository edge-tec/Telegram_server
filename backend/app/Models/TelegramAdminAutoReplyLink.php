<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAdminAutoReplyLink extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_admin_auto_reply_links';

    protected $fillable = [
        'step_id',
        'link_type',
        'label',
        'url',
        'order_index',
    ];

    protected $casts = [
        'order_index' => 'integer',
    ];

    public function step(): BelongsTo
    {
        return $this->belongsTo(TelegramAdminAutoReplyStep::class, 'step_id');
    }
}
