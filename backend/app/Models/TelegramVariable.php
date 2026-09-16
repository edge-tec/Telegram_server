<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramVariable extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_variables';

    protected $fillable = [
        'key',
        'name',
        'category',
        'fallback_value',
        'description',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }
}
