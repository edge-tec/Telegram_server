<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAssistantController extends Controller
{
    public function transform(Request $request, AiAssistantService $ai): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|string|in:improve,translate,shorten,expand,tone_professional,tone_friendly,tone_sales,tone_support,bangla_to_english,english_to_bangla,emoji_suggestion,grammar_fix',
            'text' => 'required|string',
            'options' => 'nullable|array',
        ]);

        $result = $ai->process(
            $validated['action'],
            $validated['text'],
            $validated['options'] ?? []
        );

        return response()->json([
            'action' => $validated['action'],
            'original' => $validated['text'],
            'result' => $result,
        ]);
    }
}
