<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlacklistUser;
use App\Models\TelegramUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BlacklistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $blacklist = BlacklistUser::with(['telegramUser', 'creator'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($blacklist);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'telegram_id' => 'required|numeric',
            'reason' => 'required|string|max:255',
        ]);

        $user = TelegramUser::firstOrCreate(
            ['telegram_id' => (int)$request->telegram_id],
            ['username' => 'user_' . $request->telegram_id]
        );

        $user->update(['is_blacklisted' => true]);

        $entry = BlacklistUser::updateOrCreate(
            ['telegram_user_id' => $user->id],
            [
                'reason' => $request->reason,
                'created_by' => $request->user()?->id,
            ]
        );

        $entry->load(['telegramUser', 'creator']);

        return response()->json(['message' => 'User added to blacklist', 'data' => $entry], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $entry = BlacklistUser::findOrFail($id);
        if ($entry->telegramUser) {
            $entry->telegramUser->update(['is_blacklisted' => false]);
        }
        $entry->delete();

        return response()->json(['message' => 'User unblacklisted successfully']);
    }
}
