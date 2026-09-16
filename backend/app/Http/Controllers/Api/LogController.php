<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\MessageLog;
use App\Models\ScheduledMessage;
use App\Models\TelegramMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    public function activity(Request $request): JsonResponse
    {
        $logs = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    public function messages(Request $request): JsonResponse
    {
        $logs = MessageLog::with(['account', 'conversation.telegramUser'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    public function scheduledQueue(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $query = ScheduledMessage::with(['conversation.telegramUser', 'template', 'campaign'])
            ->orderBy('scheduled_at', 'desc');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(30));
    }

    public function retryScheduled(string $id): JsonResponse
    {
        $scheduled = ScheduledMessage::findOrFail($id);
        $scheduled->update([
            'status' => 'pending',
            'retry_count' => 0,
            'scheduled_at' => now(),
            'error_log' => null,
        ]);

        return response()->json(['message' => 'Queued for immediate retry', 'data' => $scheduled]);
    }

    public function conversationTimeline(Request $request): JsonResponse
    {
        $conversationId = $request->query('conversation_id');
        $limit = (int)$request->query('limit', 50);

        // Fetch logs and telegram messages
        $msgLogs = MessageLog::with(['account', 'conversation.telegramUser'])
            ->when($conversationId, function ($q) use ($conversationId) {
                $q->where('conversation_id', $conversationId);
            })
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'type' => 'automation_event',
                    'event_type' => $log->event_type,
                    'status' => $log->status,
                    'account' => $log->account?->alias ?? 'Primary Account',
                    'contact' => $log->conversation?->telegramUser?->first_name ?? 'User',
                    'contact_handle' => $log->conversation?->telegramUser?->username ? '@' . $log->conversation?->telegramUser?->username : null,
                    'payload' => $log->payload,
                    'timestamp' => $log->created_at->toISOString(),
                ];
            });

        $recentChats = TelegramMessage::with(['conversation.telegramUser', 'conversation.account'])
            ->when($conversationId, function ($q) use ($conversationId) {
                $q->where('conversation_id', $conversationId);
            })
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($msg) {
                $eventType = $msg->direction === 'inbound' ? 'incoming_message' : 'outbound_reply';
                if ($msg->message_type !== 'text') {
                    $eventType = $msg->direction === 'inbound' ? 'incoming_media' : 'media_sent';
                }
                return [
                    'id' => $msg->id,
                    'type' => 'chat_message',
                    'event_type' => $eventType,
                    'status' => $msg->status,
                    'account' => $msg->conversation?->account?->alias ?? 'Account',
                    'contact' => $msg->conversation?->telegramUser?->first_name ?? 'User',
                    'contact_handle' => $msg->conversation?->telegramUser?->username ? '@' . $msg->conversation?->telegramUser?->username : null,
                    'content' => $msg->content,
                    'message_type' => $msg->message_type,
                    'timestamp' => $msg->created_at->toISOString(),
                ];
            });

        // Merge and sort chronologically descending
        $timeline = $msgLogs->concat($recentChats)->sortByDesc('timestamp')->values();

        return response()->json($timeline);
    }
}
