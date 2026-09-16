<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramButtonAction extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'telegram_button_actions';

    protected $fillable = [
        'action_type',
        'button_label',
        'button_data',
        'click_count',
    ];

    protected function casts(): array
    {
        return [
            'click_count' => 'integer',
        ];
    }
}
