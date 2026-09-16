<?php

namespace App\Console\Commands;

use App\Models\ScheduledMessage;
use App\Services\FollowupAutomationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessScheduledMessages extends Command
{
    protected $signature = 'telegram:process-scheduled-messages {--limit=100}';
    protected $description = 'Process and dispatch due scheduled telegram follow-ups and delayed auto-replies';

    public function handle(FollowupAutomationService $automationService): int
    {
        $limit = (int)$this->option('limit');
        $now = Carbon::now();

        $dueMessages = ScheduledMessage::where('status', 'pending')
            ->where('scheduled_at', '<=', $now)
            ->where('retry_count', '<', 3)
            ->orderBy('scheduled_at', 'asc')
            ->limit($limit)
            ->get();

        if ($dueMessages->isEmpty()) {
            return Command::SUCCESS;
        }

        $this->info("Processing {$dueMessages->count()} due scheduled follow-up messages...");

        foreach ($dueMessages as $msg) {
            $automationService->executeSend($msg);
        }

        return Command::SUCCESS;
    }
}
