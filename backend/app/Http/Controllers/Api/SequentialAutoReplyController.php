<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TelegramAutoReplySequence;
use App\Models\TelegramAutoReplyStep;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SequentialAutoReplyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sequences = TelegramAutoReplySequence::with(['account', 'steps' => fn($q) => $q->orderBy('step_number', 'asc')])
            ->withCount('steps')
            ->latest()
            ->get();

        return response()->json($sequences);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,paused,draft',
            'steps' => 'required|array|min:1',
            'steps.*.step_number' => 'required|integer|min:1',
            'steps.*.delay_value' => 'nullable|integer|min:0',
            'steps.*.delay_unit' => 'nullable|string|in:seconds,minutes,hours,days',
            'steps.*.message_text' => 'required|string',
            'steps.*.media_url' => 'nullable|string',
            'steps.*.media_type' => 'nullable|string',
            'steps.*.media_caption' => 'nullable|string',
            'steps.*.links' => 'nullable|array',
            'steps.*.inline_buttons' => 'nullable|array',
            'steps.*.is_active' => 'boolean',
        ]);

        $sequence = DB::transaction(function () use ($validated) {
            $seq = TelegramAutoReplySequence::create([
                'account_id' => $validated['account_id'] ?? null,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'active',
            ]);

            foreach ($validated['steps'] as $index => $stepData) {
                TelegramAutoReplyStep::create([
                    'sequence_id' => $seq->id,
                    'step_number' => $stepData['step_number'] ?? ($index + 1),
                    'delay_value' => $stepData['delay_value'] ?? 0,
                    'delay_unit' => $stepData['delay_unit'] ?? 'seconds',
                    'message_text' => $stepData['message_text'],
                    'media_url' => $stepData['media_url'] ?? null,
                    'media_type' => $stepData['media_type'] ?? 'text',
                    'media_caption' => $stepData['media_caption'] ?? null,
                    'links' => $stepData['links'] ?? null,
                    'inline_buttons' => $stepData['inline_buttons'] ?? null,
                    'is_active' => $stepData['is_active'] ?? true,
                ]);
            }

            return $seq;
        });

        $sequence->load(['account', 'steps']);
        return response()->json(['message' => 'Sequential auto reply created successfully', 'sequence' => $sequence], 201);
    }

    public function show(string $id): JsonResponse
    {
        $sequence = TelegramAutoReplySequence::with(['account', 'steps' => fn($q) => $q->orderBy('step_number', 'asc')])->findOrFail($id);
        return response()->json($sequence);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $sequence = TelegramAutoReplySequence::findOrFail($id);

        $validated = $request->validate([
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'name' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,paused,draft',
            'steps' => 'sometimes|required|array|min:1',
            'steps.*.step_number' => 'required|integer|min:1',
            'steps.*.delay_value' => 'nullable|integer|min:0',
            'steps.*.delay_unit' => 'nullable|string|in:seconds,minutes,hours,days',
            'steps.*.message_text' => 'required|string',
            'steps.*.media_url' => 'nullable|string',
            'steps.*.media_type' => 'nullable|string',
            'steps.*.media_caption' => 'nullable|string',
            'steps.*.links' => 'nullable|array',
            'steps.*.inline_buttons' => 'nullable|array',
            'steps.*.is_active' => 'boolean',
        ]);

        DB::transaction(function () use ($sequence, $validated) {
            $sequence->update([
                'account_id' => $validated['account_id'] ?? $sequence->account_id,
                'name' => $validated['name'] ?? $sequence->name,
                'description' => $validated['description'] ?? $sequence->description,
                'status' => $validated['status'] ?? $sequence->status,
            ]);

            if (isset($validated['steps'])) {
                // Delete old steps and recreate to respect new order
                $sequence->steps()->delete();
                foreach ($validated['steps'] as $index => $stepData) {
                    TelegramAutoReplyStep::create([
                        'sequence_id' => $sequence->id,
                        'step_number' => $stepData['step_number'] ?? ($index + 1),
                        'delay_value' => $stepData['delay_value'] ?? 0,
                        'delay_unit' => $stepData['delay_unit'] ?? 'seconds',
                        'message_text' => $stepData['message_text'],
                        'media_url' => $stepData['media_url'] ?? null,
                        'media_type' => $stepData['media_type'] ?? 'text',
                        'media_caption' => $stepData['media_caption'] ?? null,
                        'links' => $stepData['links'] ?? null,
                        'inline_buttons' => $stepData['inline_buttons'] ?? null,
                        'is_active' => $stepData['is_active'] ?? true,
                    ]);
                }
            }
        });

        $sequence->load(['account', 'steps']);
        return response()->json(['message' => 'Sequential auto reply updated successfully', 'sequence' => $sequence]);
    }

    public function destroy(string $id): JsonResponse
    {
        $sequence = TelegramAutoReplySequence::findOrFail($id);
        $sequence->delete();

        return response()->json(['message' => 'Sequence deleted successfully']);
    }

    public function toggle(string $id): JsonResponse
    {
        $sequence = TelegramAutoReplySequence::findOrFail($id);
        $sequence->status = ($sequence->status === 'active') ? 'paused' : 'active';
        $sequence->save();

        return response()->json(['message' => "Sequence is now {$sequence->status}", 'status' => $sequence->status]);
    }

    public function duplicate(string $id): JsonResponse
    {
        $original = TelegramAutoReplySequence::with('steps')->findOrFail($id);

        $clone = DB::transaction(function () use ($original) {
            $newSeq = $original->replicate(['total_contacts', 'created_at', 'updated_at']);
            $newSeq->name = "Copy of " . $original->name;
            $newSeq->status = 'draft';
            $newSeq->save();

            foreach ($original->steps as $step) {
                $newStep = $step->replicate(['sent_count', 'created_at', 'updated_at']);
                $newStep->sequence_id = $newSeq->id;
                $newStep->save();
            }

            return $newSeq;
        });

        $clone->load(['account', 'steps']);
        return response()->json(['message' => 'Sequence duplicated successfully', 'sequence' => $clone], 201);
    }
}
