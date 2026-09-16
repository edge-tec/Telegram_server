<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramVariable;
use App\Services\VariableReplacerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VariableController extends Controller
{
    public function index(): JsonResponse
    {
        $variables = TelegramVariable::orderBy('is_system', 'desc')
            ->orderBy('category', 'asc')
            ->orderBy('key', 'asc')
            ->get();

        return response()->json($variables);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key' => 'required|string|max:50|regex:/^[a-zA-Z0-9_]+$/|unique:telegram_variables,key',
            'name' => 'required|string|max:150',
            'category' => 'nullable|string|max:50',
            'fallback_value' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $validated['is_system'] = false;
        $variable = TelegramVariable::create($validated);

        return response()->json([
            'message' => 'Custom variable created successfully',
            'variable' => $variable,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $variable = TelegramVariable::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'category' => 'nullable|string|max:50',
            'fallback_value' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $variable->update($validated);

        return response()->json([
            'message' => 'Variable updated successfully',
            'variable' => $variable,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $variable = TelegramVariable::findOrFail($id);

        if ($variable->is_system) {
            return response()->json(['error' => 'System variables cannot be deleted'], 403);
        }

        $variable->delete();

        return response()->json(['message' => 'Variable deleted successfully']);
    }

    public function preview(Request $request, VariableReplacerService $replacer): JsonResponse
    {
        $request->validate([
            'template_text' => 'required|string',
            'custom_values' => 'nullable|array',
        ]);

        $user = new \App\Models\TelegramUser([
            'first_name' => $request->input('custom_values.first_name', 'Mizan'),
            'last_name' => $request->input('custom_values.last_name', 'Rahman'),
            'username' => $request->input('custom_values.username', 'mizanur'),
            'phone' => $request->input('custom_values.phone', '+8801700000000'),
            'telegram_id' => 987654321,
        ]);

        $extra = $request->input('custom_values', []);
        $rendered = $replacer->replace($request->input('template_text'), $user, $extra);

        return response()->json([
            'original' => $request->input('template_text'),
            'rendered' => $rendered,
        ]);
    }
}
