<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramAutoReply;
use App\Services\VariableReplacerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutoReplyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TelegramAutoReply::with(['account', 'media'])->orderBy('priority', 'desc')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', $request->query('account_id'));
        }

        if ($request->filled('trigger_type')) {
            $query->where('trigger_type', $request->query('trigger_type'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'name' => 'required|string|max:150',
            'status' => 'nullable|string|in:active,draft,paused',
            'priority' => 'nullable|integer',
            'trigger_type' => 'required|string',
            'trigger_keywords' => 'nullable|array',
            'is_case_sensitive' => 'boolean',
            'delay_type' => 'nullable|string|in:instant,fixed,random',
            'delay_seconds' => 'nullable|integer|min:0',
            'random_delay_min' => 'nullable|integer|min:0',
            'random_delay_max' => 'nullable|integer|min:0',
            'message_type' => 'nullable|string',
            'message_body' => 'nullable|string',
            'media_id' => 'nullable|uuid|exists:media_library,id',
            'media_caption' => 'nullable|string',
            'is_album' => 'boolean',
            'media_attachments' => 'nullable|array',
            'inline_buttons' => 'nullable|array',
        ]);

        $reply = TelegramAutoReply::create($validated);
        $reply->load(['account', 'media']);

        return response()->json(['message' => 'Auto-reply created successfully', 'auto_reply' => $reply], 201);
    }

    public function show(string $id): JsonResponse
    {
        $reply = TelegramAutoReply::with(['account', 'media'])->findOrFail($id);
        return response()->json($reply);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $reply = TelegramAutoReply::findOrFail($id);

        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'name' => 'sometimes|required|string|max:150',
            'status' => 'nullable|string|in:active,draft,paused',
            'priority' => 'nullable|integer',
            'trigger_type' => 'sometimes|required|string',
            'trigger_keywords' => 'nullable|array',
            'is_case_sensitive' => 'boolean',
            'delay_type' => 'nullable|string|in:instant,fixed,random',
            'delay_seconds' => 'nullable|integer|min:0',
            'random_delay_min' => 'nullable|integer|min:0',
            'random_delay_max' => 'nullable|integer|min:0',
            'message_type' => 'nullable|string',
            'message_body' => 'nullable|string',
            'media_id' => 'nullable|uuid|exists:media_library,id',
            'media_caption' => 'nullable|string',
            'is_album' => 'boolean',
            'media_attachments' => 'nullable|array',
            'inline_buttons' => 'nullable|array',
        ]);

        $reply->update($validated);
        $reply->load(['account', 'media']);

        return response()->json(['message' => 'Auto-reply updated successfully', 'auto_reply' => $reply]);
    }

    public function destroy(string $id): JsonResponse
    {
        $reply = TelegramAutoReply::findOrFail($id);
        $reply->delete();

        return response()->json(['message' => 'Auto-reply deleted successfully']);
    }

    public function toggle(string $id): JsonResponse
    {
        $reply = TelegramAutoReply::findOrFail($id);
        $reply->status = ($reply->status === 'active') ? 'paused' : 'active';
        $reply->save();

        return response()->json([
            'message' => "Auto-reply status changed to {$reply->status}",
            'status' => $reply->status,
        ]);
    }

    public function duplicate(string $id): JsonResponse
    {
        $original = TelegramAutoReply::findOrFail($id);
        $clone = $original->replicate([
            'triggered_count',
            'sent_count',
            'last_triggered_at',
            'created_at',
            'updated_at',
        ]);
        $clone->name = "Copy of " . $original->name;
        $clone->status = 'draft';
        $clone->save();
        $clone->load(['account', 'media']);

        return response()->json([
            'message' => 'Auto-reply duplicated successfully',
            'auto_reply' => $clone,
        ], 201);
    }

    public function testTrigger(Request $request, VariableReplacerService $replacer): JsonResponse
    {
        $request->validate([
            'message_body' => 'required|string',
            'test_input' => 'nullable|string',
            'sample_user' => 'nullable|array',
        ]);

        $user = new \App\Models\TelegramUser([
            'first_name' => $request->input('sample_user.first_name', 'Mizan'),
            'last_name' => $request->input('sample_user.last_name', 'Rahman'),
            'username' => $request->input('sample_user.username', 'mizanur'),
            'phone' => $request->input('sample_user.phone', '+8801700000000'),
            'telegram_id' => 987654321,
        ]);

        $rendered = $replacer->replace($request->input('message_body'), $user);

        return response()->json([
            'original' => $request->input('message_body'),
            'rendered' => $rendered,
            'simulated_delay_seconds' => rand(2, 5),
        ]);
    }
}
