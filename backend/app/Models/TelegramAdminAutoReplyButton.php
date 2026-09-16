<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAdminAutoReplyButton extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_admin_auto_reply_buttons';

    protected $fillable = [
        'step_id',
        'row_index',
        'col_index',
        'label',
        'button_type',
        'data',
        'order_index',
    ];

    protected $casts = [
        'row_index' => 'integer',
        'col_index' => 'integer',
        'order_index' => 'integer',
    ];

    public function step(): BelongsTo
    {
        return $this->belongsTo(TelegramAdminAutoReplyStep::class, 'step_id');
    }
}
