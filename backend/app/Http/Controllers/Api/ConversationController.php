<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\BlacklistUser;
use App\Models\TelegramConversation;
use App\Models\TelegramMessage;
use App\Models\UserTag;
use App\Services\TelegramBridgeClient;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(protected TelegramBridgeClient $bridgeClient)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $search = $request->query('search');
        $accountId = $request->query('account_id');

        $query = TelegramConversation::with(['account', 'telegramUser', 'latestMessage', 'tags'])
            ->orderBy('last_message_at', 'desc');

        if ($accountId) {
            $query->where('account_id', $accountId);
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->whereHas('telegramUser', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('telegram_id', 'like', "%{$search}%");
            });
        }

        $conversations = $query->paginate(25);
        return response()->json($conversations);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $conversation = TelegramConversation::with([
            'account',
            'telegramUser.blacklistEntry',
            'messages' => function ($q) {
                $q->orderBy('created_at', 'asc');
            },
            'tags',
            'scheduledMessages.template'
        ])->findOrFail($id);

        // Mark as read
        if ($conversation->unread_count > 0) {
            $conversation->update(['unread_count' => 0]);
        }

        return response()->json($conversation);
    }

    public function sendReply(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'content' => 'required_without:media_path|nullable|string',
            'media_path' => 'nullable|string',
            'message_type' => 'nullable|string|in:text,photo,video,voice,audio,document',
        ]);

        $conversation = TelegramConversation::with(['account', 'telegramUser'])->findOrFail($id);
        $account = $conversation->account;
        $user = $conversation->telegramUser;

        if (!$account || $account->status !== 'connected') {
            return response()->json(['message' => 'Connected Telegram account required to send message'], 400);
        }

        if ($user->is_blacklisted) {
            return response()->json(['message' => 'Cannot send message to blacklisted user'], 400);
        }

        try {
            $msgType = $request->message_type ?? ($request->media_path ? 'photo' : 'text');

            $res = $this->bridgeClient->sendMessage(
                accountId: $account->id,
                recipientId: $user->telegram_id,
                content: $request->content,
                mediaPath: $request->media_path,
                messageType: $msgType
            );

            $msg = TelegramMessage::create([
                'conversation_id' => $conversation->id,
                'direction' => 'outbound',
                'sender_id' => $account->telegram_id ?? 0,
                'message_type' => $msgType,
                'content' => $request->content,
                'media_path' => $request->media_path,
                'status' => 'sent',
                'telegram_message_id' => (string)($res['message_id'] ?? ''),
            ]);

            $conversation->update(['last_message_at' => now()]);

            return response()->json([
                'message' => 'Sent successfully',
                'data' => $msg,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function updateNotes(Request $request, string $id): JsonResponse
    {
        $request->validate(['notes' => 'nullable|string']);
        $conversation = TelegramConversation::findOrFail($id);
        $conversation->update(['notes' => $request->notes]);

        return response()->json(['message' => 'Notes updated', 'conversation' => $conversation]);
    }

    public function updateTags(Request $request, string $id): JsonResponse
    {
        $request->validate(['tags' => 'array']);
        $conversation = TelegramConversation::findOrFail($id);

        UserTag::where('conversation_id', $conversation->id)->delete();
        foreach ($request->tags as $tag) {
            if (!empty(trim($tag))) {
                UserTag::create([
                    'conversation_id' => $conversation->id,
                    'tag_name' => trim($tag),
                ]);
            }
        }

        return response()->json(['message' => 'Tags updated', 'tags' => $conversation->tags()->get()]);
    }

    public function toggleBlacklist(Request $request, string $id): JsonResponse
    {
        $conversation = TelegramConversation::with('telegramUser')->findOrFail($id);
        $user = $conversation->telegramUser;

        if ($user->is_blacklisted) {
            $user->update(['is_blacklisted' => false]);
            $conversation->update(['status' => 'active']);
            BlacklistUser::where('telegram_user_id', $user->id)->delete();
            $msg = 'User removed from blacklist';
        } else {
            $user->update(['is_blacklisted' => true]);
            $conversation->update(['status' => 'blacklisted']);
            BlacklistUser::create([
                'telegram_user_id' => $user->id,
                'reason' => $request->reason ?? 'Manual blacklist by agent',
                'created_by' => $request->user()?->id,
            ]);
            $msg = 'User added to blacklist';
        }

        return response()->json(['message' => $msg, 'is_blacklisted' => $user->is_blacklisted]);
    }
}
