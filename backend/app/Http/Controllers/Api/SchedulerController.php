<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduledMessage;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchedulerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ScheduledMessage::with([
            'conversation.telegramUser',
            'conversation.account',
            'template.media',
            'campaign',
            'step',
        ])->latest('scheduled_at');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('scheduled_at', [
                Carbon::parse($request->query('start_date'))->startOfDay(),
                Carbon::parse($request->query('end_date'))->endOfDay(),
            ]);
        }

        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->query('campaign_id'));
        }

        $items = $query->paginate(50);
        return response()->json($items);
    }

    public function reschedule(Request $request, string $id): JsonResponse
    {
        $item = ScheduledMessage::findOrFail($id);

        $validated = $request->validate([
            'scheduled_at' => 'required|date',
        ]);

        $item->scheduled_at = Carbon::parse($validated['scheduled_at']);
        if ($item->status === 'failed') {
            $item->status = 'pending';
        }
        $item->save();

        return response()->json([
            'message' => 'Message successfully rescheduled',
            'item' => $item,
        ]);
    }

    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $item = ScheduledMessage::findOrFail($id);
        $action = $request->input('action', 'pause'); // pause, resume, cancel

        if ($action === 'pause') {
            $item->status = 'cancelled';
        } elseif ($action === 'resume') {
            $item->status = 'pending';
        } elseif ($action === 'cancel') {
            $item->status = 'cancelled';
        }

        $item->save();

        return response()->json([
            'message' => "Schedule item status updated to {$item->status}",
            'item' => $item,
        ]);
    }

    public function calendarSummary(Request $request): JsonResponse
    {
        $start = $request->query('start', Carbon::now()->startOfMonth()->toDateString());
        $end = $request->query('end', Carbon::now()->endOfMonth()->toDateString());

        $items = ScheduledMessage::with([
            'conversation.telegramUser',
            'template',
            'campaign',
        ])
        ->whereBetween('scheduled_at', [
            Carbon::parse($start)->startOfDay(),
            Carbon::parse($end)->endOfDay(),
        ])
        ->get();

        return response()->json($items);
    }
}
