<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FollowupCampaign;
use App\Models\FollowupStep;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $campaigns = FollowupCampaign::with([
            'account',
            'steps' => function ($q) {
                $q->orderBy('step_order', 'asc')->with('template.media');
            }
        ])->orderBy('created_at', 'desc')->get();

        return response()->json($campaigns);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->max_campaigns > 0) {
            $existingCount = FollowupCampaign::count();
            if ($existingCount >= $user->max_campaigns) {
                return response()->json([
                    'message' => "Campaign limit reached: Your profile is limited to {$user->max_campaigns} campaigns."
                ], 422);
            }
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'status' => 'required|string|in:active,paused',
            'on_reply_action' => 'required|string|in:stop,continue,restart,pause',
            'steps' => 'required|array|min:1',
            'steps.*.delay_seconds' => 'required|integer|min:0',
            'steps.*.template_id' => 'required|uuid|exists:reply_templates,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $campaign = FollowupCampaign::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'account_id' => $validated['account_id'] ?? null,
                'status' => $validated['status'],
                'on_reply_action' => $validated['on_reply_action'],
            ]);

            foreach ($validated['steps'] as $idx => $stepData) {
                FollowupStep::create([
                    'campaign_id' => $campaign->id,
                    'step_order' => $idx + 1,
                    'delay_seconds' => $stepData['delay_seconds'],
                    'template_id' => $stepData['template_id'],
                ]);
            }

            $campaign->load(['account', 'steps.template.media']);
            return response()->json(['message' => 'Campaign created', 'campaign' => $campaign], 201);
        });
    }

    public function show(string $id): JsonResponse
    {
        $campaign = FollowupCampaign::with([
            'account',
            'steps' => function ($q) {
                $q->orderBy('step_order', 'asc')->with('template.media');
            }
        ])->findOrFail($id);

        return response()->json($campaign);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $campaign = FollowupCampaign::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'account_id' => 'nullable|uuid|exists:telegram_accounts,id',
            'status' => 'required|string|in:active,paused,completed',
            'on_reply_action' => 'required|string|in:stop,continue,restart,pause',
            'steps' => 'nullable|array',
            'steps.*.delay_seconds' => 'required|integer|min:0',
            'steps.*.template_id' => 'required|uuid|exists:reply_templates,id',
        ]);

        return DB::transaction(function () use ($campaign, $validated) {
            $campaign->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'account_id' => $validated['account_id'] ?? null,
                'status' => $validated['status'],
                'on_reply_action' => $validated['on_reply_action'],
            ]);

            if (isset($validated['steps'])) {
                FollowupStep::where('campaign_id', $campaign->id)->delete();
                foreach ($validated['steps'] as $idx => $stepData) {
                    FollowupStep::create([
                        'campaign_id' => $campaign->id,
                        'step_order' => $idx + 1,
                        'delay_seconds' => $stepData['delay_seconds'],
                        'template_id' => $stepData['template_id'],
                    ]);
                }
            }

            $campaign->load(['account', 'steps.template.media']);
            return response()->json(['message' => 'Campaign updated', 'campaign' => $campaign]);
        });
    }

    public function toggleStatus(string $id): JsonResponse
    {
        $campaign = FollowupCampaign::findOrFail($id);
        $campaign->status = ($campaign->status === 'active') ? 'paused' : 'active';
        $campaign->save();

        return response()->json(['message' => 'Status updated', 'status' => $campaign->status]);
    }

    public function destroy(string $id): JsonResponse
    {
        $campaign = FollowupCampaign::findOrFail($id);
        $campaign->delete();

        return response()->json(['message' => 'Campaign deleted']);
    }
}
