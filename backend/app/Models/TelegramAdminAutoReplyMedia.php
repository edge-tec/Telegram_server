<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramAdminAutoReplyMedia extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_admin_auto_reply_media';

    protected $fillable = [
        'step_id',
        'media_library_id',
        'media_type',
        'file_name',
        'file_path',
        'file_url',
        'mime_type',
        'file_size',
        'caption',
        'order_index',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'order_index' => 'integer',
    ];

    protected $appends = ['url'];

    public function step(): BelongsTo
    {
        return $this->belongsTo(TelegramAdminAutoReplyStep::class, 'step_id');
    }

    public function mediaLibrary(): BelongsTo
    {
        return $this->belongsTo(MediaLibrary::class, 'media_library_id');
    }

    public function getUrlAttribute(): ?string
    {
        if ($this->file_url) {
            return $this->file_url;
        }
        if ($this->file_path) {
            return asset('storage/' . $this->file_path);
        }
        return null;
    }
}
