<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FollowupCampaign;
use App\Models\FollowupStep;
use App\Models\TelegramFollowupQueue;
use App\Services\SequentialFollowupSchedulerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SequentialFollowupController extends Controller
{
    protected SequentialFollowupSchedulerService $schedulerService;

    public function __construct(SequentialFollowupSchedulerService $schedulerService)
    {
        $this->schedulerService = $schedulerService;
    }

    /**
     * List all follow-up campaigns with step counts and queue stats
     */
    public function index(Request $request)
    {
        $campaigns = FollowupCampaign::with(['steps' => function ($q) {
            $q->orderBy('step_number', 'asc');
        }])
        ->withCount([
            'queue as pending_queue_count' => function ($q) {
                $q->where('status', 'pending');
            },
            'queue as sent_queue_count' => function ($q) {
                $q->where('status', 'sent');
            },
            'queue as failed_queue_count' => function ($q) {
                $q->where('status', 'failed');
            },
            'queue as cancelled_queue_count' => function ($q) {
                $q->where('status', 'cancelled');
            }
        ])
        ->orderBy('created_at', 'desc')
        ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $campaigns
        ]);
    }

    /**
     * Create a new campaign with sequential steps
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'telegram_account_id' => 'nullable|exists:telegram_accounts,id',
            'trigger_type' => 'nullable|string',
            'trigger_keywords' => 'nullable|array',
            'status' => 'nullable|in:active,draft,paused,completed',
            'stop_on_reply' => 'nullable|boolean',
            'timezone' => 'nullable|string',
            'working_hours_enabled' => 'nullable|boolean',
            'working_hours_start' => 'nullable|string',
            'working_hours_end' => 'nullable|string',
            'working_days' => 'nullable|array',
            'steps' => 'nullable|array',
            'steps.*.step_number' => 'required_with:steps|integer|min:1',
            'steps.*.timing_type' => 'nullable|in:relative,exact',
            'steps.*.delay_value' => 'nullable|integer|min:0',
            'steps.*.delay_unit' => 'nullable|in:seconds,minutes,hours,days,weeks,months',
            'steps.*.exact_time' => 'nullable|date',
            'steps.*.message_type' => 'nullable|string',
            'steps.*.content' => 'required_with:steps|string',
            'steps.*.media_url' => 'nullable|string',
            'steps.*.buttons' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($validated) {
            $campaign = FollowupCampaign::create([
                'name' => $validated['name'],
                'telegram_account_id' => $validated['telegram_account_id'] ?? null,
                'trigger_type' => $validated['trigger_type'] ?? 'all_messages',
                'trigger_keywords' => $validated['trigger_keywords'] ?? null,
                'status' => $validated['status'] ?? 'active',
                'stop_on_reply' => $validated['stop_on_reply'] ?? true,
                'timezone' => $validated['timezone'] ?? 'UTC',
                'working_hours_enabled' => $validated['working_hours_enabled'] ?? false,
                'working_hours_start' => $validated['working_hours_start'] ?? null,
                'working_hours_end' => $validated['working_hours_end'] ?? null,
                'working_days' => $validated['working_days'] ?? null,
            ]);

            if (!empty($validated['steps'])) {
                foreach ($validated['steps'] as $idx => $s) {
                    $campaign->steps()->create([
                        'step_number' => $s['step_number'] ?? ($idx + 1),
                        'timing_type' => $s['timing_type'] ?? 'relative',
                        'delay_value' => $s['delay_value'] ?? 10,
                        'delay_unit' => $s['delay_unit'] ?? 'minutes',
                        'exact_time' => $s['exact_time'] ?? null,
                        'delay_minutes' => $s['delay_unit'] === 'hours' ? ($s['delay_value'] * 60) : ($s['delay_value'] ?? 10),
                        'message_type' => $s['message_type'] ?? 'text',
                        'content' => $s['content'],
                        'media_url' => $s['media_url'] ?? null,
                        'buttons' => $s['buttons'] ?? null,
                        'status' => 'active',
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Sequential Follow-Up campaign created successfully.',
                'data' => $campaign->load('steps')
            ], 201);
        });
    }

    /**
     * Show single campaign with steps
     */
    public function show($id)
    {
        $campaign = FollowupCampaign::with(['steps' => function ($q) {
            $q->orderBy('step_number', 'asc');
        }])
        ->withCount([
            'queue as pending_queue_count' => function ($q) {
                $q->where('status', 'pending');
            },
            'queue as sent_queue_count' => function ($q) {
                $q->where('status', 'sent');
            },
            'queue as failed_queue_count' => function ($q) {
                $q->where('status', 'failed');
            },
            'queue as cancelled_queue_count' => function ($q) {
                $q->where('status', 'cancelled');
            }
        ])
        ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $campaign
        ]);
    }

    /**
     * Update campaign and optionally replace its steps
     */
    public function update(Request $request, $id)
    {
        $campaign = FollowupCampaign::findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'telegram_account_id' => 'nullable|exists:telegram_accounts,id',
            'trigger_type' => 'nullable|string',
            'trigger_keywords' => 'nullable|array',
            'status' => 'nullable|in:active,draft,paused,completed',
            'stop_on_reply' => 'nullable|boolean',
            'timezone' => 'nullable|string',
            'working_hours_enabled' => 'nullable|boolean',
            'working_hours_start' => 'nullable|string',
            'working_hours_end' => 'nullable|string',
            'working_days' => 'nullable|array',
            'steps' => 'nullable|array',
            'steps.*.id' => 'nullable|integer',
            'steps.*.step_number' => 'required_with:steps|integer|min:1',
            'steps.*.timing_type' => 'nullable|in:relative,exact',
            'steps.*.delay_value' => 'nullable|integer|min:0',
            'steps.*.delay_unit' => 'nullable|in:seconds,minutes,hours,days,weeks,months',
            'steps.*.exact_time' => 'nullable|date',
            'steps.*.message_type' => 'nullable|string',
            'steps.*.content' => 'required_with:steps|string',
            'steps.*.media_url' => 'nullable|string',
            'steps.*.buttons' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($campaign, $validated) {
            $campaign->update(array_filter([
                'name' => $validated['name'] ?? $campaign->name,
                'telegram_account_id' => array_key_exists('telegram_account_id', $validated) ? $validated['telegram_account_id'] : $campaign->telegram_account_id,
                'trigger_type' => $validated['trigger_type'] ?? $campaign->trigger_type,
                'trigger_keywords' => array_key_exists('trigger_keywords', $validated) ? $validated['trigger_keywords'] : $campaign->trigger_keywords,
                'status' => $validated['status'] ?? $campaign->status,
                'stop_on_reply' => array_key_exists('stop_on_reply', $validated) ? $validated['stop_on_reply'] : $campaign->stop_on_reply,
                'timezone' => $validated['timezone'] ?? $campaign->timezone,
                'working_hours_enabled' => array_key_exists('working_hours_enabled', $validated) ? $validated['working_hours_enabled'] : $campaign->working_hours_enabled,
                'working_hours_start' => array_key_exists('working_hours_start', $validated) ? $validated['working_hours_start'] : $campaign->working_hours_start,
                'working_hours_end' => array_key_exists('working_hours_end', $validated) ? $validated['working_hours_end'] : $campaign->working_hours_end,
                'working_days' => array_key_exists('working_days', $validated) ? $validated['working_days'] : $campaign->working_days,
            ], fn($v) => !is_null($v)));

            if (isset($validated['steps'])) {
                $keptStepIds = [];
                foreach ($validated['steps'] as $idx => $s) {
                    $stepData = [
                        'step_number' => $s['step_number'] ?? ($idx + 1),
                        'timing_type' => $s['timing_type'] ?? 'relative',
                        'delay_value' => $s['delay_value'] ?? 10,
                        'delay_unit' => $s['delay_unit'] ?? 'minutes',
                        'exact_time' => $s['exact_time'] ?? null,
                        'delay_minutes' => ($s['delay_unit'] ?? 'minutes') === 'hours' ? (($s['delay_value'] ?? 1) * 60) : ($s['delay_value'] ?? 10),
                        'message_type' => $s['message_type'] ?? 'text',
                        'content' => $s['content'],
                        'media_url' => $s['media_url'] ?? null,
                        'buttons' => $s['buttons'] ?? null,
                        'status' => 'active',
                    ];

                    if (!empty($s['id'])) {
                        $existing = FollowupStep::where('campaign_id', $campaign->id)->find($s['id']);
                        if ($existing) {
                            $existing->update($stepData);
                            $keptStepIds[] = $existing->id;
                            continue;
                        }
                    }

                    $newStep = $campaign->steps()->create($stepData);
                    $keptStepIds[] = $newStep->id;
                }

                // Delete any steps no longer present
                $campaign->steps()->whereNotIn('id', $keptStepIds)->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'Campaign updated successfully.',
                'data' => $campaign->fresh()->load('steps')
            ]);
        });
    }

    /**
     * Toggle campaign active/paused
     */
    public function toggle($id)
    {
        $campaign = FollowupCampaign::findOrFail($id);
        $campaign->status = $campaign->status === 'active' ? 'paused' : 'active';
        $campaign->save();

        return response()->json([
            'success' => true,
            'message' => "Campaign status changed to {$campaign->status}.",
            'data' => $campaign
        ]);
    }

    /**
     * Delete campaign and related queue
     */
    public function destroy($id)
    {
        $campaign = FollowupCampaign::findOrFail($id);
        $campaign->delete();

        return response()->json([
            'success' => true,
            'message' => 'Campaign deleted successfully.'
        ]);
    }

    /**
     * Live queue view with filtering
     */
    public function queue(Request $request)
    {
        $query = TelegramFollowupQueue::with(['campaign', 'step', 'conversation'])
            ->orderBy('scheduled_at', 'asc');

        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->input('campaign_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('conversation', function ($q) use ($search) {
                $q->where('telegram_username', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('telegram_user_id', 'like', "%{$search}%");
            });
        }

        $items = $query->paginate(30);

        return response()->json([
            'success' => true,
            'data' => $items
        ]);
    }

    /**
     * Cancel an item in queue
     */
    public function cancelQueueItem($id)
    {
        $item = TelegramFollowupQueue::findOrFail($id);
        $item->update([
            'status' => 'cancelled',
            'error_message' => 'Cancelled by user.'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Queue item cancelled.'
        ]);
    }

    /**
     * Retry a failed item immediately
     */
    public function retryQueueItem($id)
    {
        $item = TelegramFollowupQueue::findOrFail($id);
        $item->update([
            'status' => 'pending',
            'scheduled_at' => now(),
            'error_message' => null,
        ]);

        // Immediately trigger process
        $this->schedulerService->processDueQueue();

        return response()->json([
            'success' => true,
            'message' => 'Queue item scheduled for immediate retry.'
        ]);
    }

    /**
     * Trigger queue processing manually
     */
    public function processQueueNow()
    {
        $processed = $this->schedulerService->processDueQueue();

        return response()->json([
            'success' => true,
            'message' => "Queue processed {$processed} due item(s).",
            'processed_count' => $processed
        ]);
    }
}
