<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MessageLog;
use App\Services\FollowupAutomationService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(protected FollowupAutomationService $automationService)
    {
    }

    public function handle(Request $request): JsonResponse
    {
        $secret = $request->header('X-Bridge-Secret');
        $expectedSecret = env('BRIDGE_WEBHOOK_SECRET', 'bridge-internal-secret-key-2026');

        if ($secret !== $expectedSecret) {
            Log::warning('Unauthorized webhook call to /api/internal/telegram/webhook');
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $payload = $request->all();

        try {
            $result = $this->automationService->processInbound($payload);

            MessageLog::create([
                'account_id' => $payload['account_id'] ?? null,
                'event_type' => 'inbound_message',
                'payload' => $payload,
                'status' => 'processed',
            ]);

            return response()->json(['success' => true, 'result' => $result]);
        } catch (Exception $e) {
            Log::error('Webhook processing error: ' . $e->getMessage(), ['exception' => $e]);

            MessageLog::create([
                'account_id' => $payload['account_id'] ?? null,
                'event_type' => 'inbound_error',
                'payload' => ['error' => $e->getMessage(), 'request' => $payload],
                'status' => 'failed',
            ]);

            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
