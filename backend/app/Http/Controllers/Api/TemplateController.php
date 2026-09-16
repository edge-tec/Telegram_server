<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReplyTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $templates = ReplyTemplate::with('media')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'trigger_type' => 'required|string|in:auto_reply,keyword,followup,rule',
            'delay_type' => 'required|string|in:instant,fixed,random',
            'delay_seconds' => 'nullable|integer|min:0',
            'random_delay_min' => 'nullable|integer|min:0',
            'random_delay_max' => 'nullable|integer|min:0',
            'reply_type' => 'required|string|in:text,photo,video,voice,audio,sticker,gif,document',
            'message_body' => 'nullable|string',
            'media_id' => 'nullable|uuid|exists:media_library,id',
            'is_active' => 'boolean',
        ]);

        $template = ReplyTemplate::create($validated);
        $template->load('media');

        return response()->json(['message' => 'Template created', 'template' => $template], 201);
    }

    public function show(string $id): JsonResponse
    {
        $template = ReplyTemplate::with('media')->findOrFail($id);
        return response()->json($template);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $template = ReplyTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'trigger_type' => 'required|string|in:auto_reply,keyword,followup,rule',
            'delay_type' => 'required|string|in:instant,fixed,random',
            'delay_seconds' => 'nullable|integer|min:0',
            'random_delay_min' => 'nullable|integer|min:0',
            'random_delay_max' => 'nullable|integer|min:0',
            'reply_type' => 'required|string|in:text,photo,video,voice,audio,sticker,gif,document',
            'message_body' => 'nullable|string',
            'media_id' => 'nullable|uuid|exists:media_library,id',
            'is_active' => 'boolean',
        ]);

        $template->update($validated);
        $template->load('media');

        return response()->json(['message' => 'Template updated', 'template' => $template]);
    }

    public function destroy(string $id): JsonResponse
    {
        $template = ReplyTemplate::findOrFail($id);
        $template->delete();

        return response()->json(['message' => 'Template deleted']);
    }
}
