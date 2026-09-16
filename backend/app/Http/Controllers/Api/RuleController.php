<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KeywordRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rules = KeywordRule::with(['template.media', 'account'])
            ->orderBy('priority', 'desc')
            ->get();

        return response()->json($rules);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'keywords' => 'required|array|min:1',
            'keywords.*' => 'required|string',
            'match_type' => 'required|string|in:exact,contains',
            'is_case_sensitive' => 'boolean',
            'priority' => 'required|integer',
            'template_id' => 'required|uuid|exists:reply_templates,id',
            'is_active' => 'boolean',
        ]);

        $rule = KeywordRule::create($validated);
        $rule->load(['template.media', 'account']);

        return response()->json(['message' => 'Rule created', 'rule' => $rule], 201);
    }

    public function show(string $id): JsonResponse
    {
        $rule = KeywordRule::with(['template.media', 'account'])->findOrFail($id);
        return response()->json($rule);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $rule = KeywordRule::findOrFail($id);

        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'keywords' => 'required|array|min:1',
            'keywords.*' => 'required|string',
            'match_type' => 'required|string|in:exact,contains',
            'is_case_sensitive' => 'boolean',
            'priority' => 'required|integer',
            'template_id' => 'required|uuid|exists:reply_templates,id',
            'is_active' => 'boolean',
        ]);

        $rule->update($validated);
        $rule->load(['template.media', 'account']);

        return response()->json(['message' => 'Rule updated', 'rule' => $rule]);
    }

    public function destroy(string $id): JsonResponse
    {
        $rule = KeywordRule::findOrFail($id);
        $rule->delete();

        return response()->json(['message' => 'Rule deleted']);
    }
}
