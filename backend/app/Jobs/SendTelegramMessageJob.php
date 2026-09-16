<?php

namespace App\Jobs;

use App\Models\ScheduledMessage;
use App\Services\FollowupAutomationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendTelegramMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30; // seconds

    public function __construct(public string $scheduledMessageId)
    {
    }

    public function handle(FollowupAutomationService $automationService): void
    {
        $scheduled = ScheduledMessage::find($this->scheduledMessageId);
        if (!$scheduled || in_array($scheduled->status, ['sent', 'cancelled'])) {
            return;
        }

        $automationService->executeSend($scheduled);
    }
}
