<?php

use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AutoReplyController;
use App\Http\Controllers\Api\BlacklistController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\LogController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\RuleController;
use App\Http\Controllers\Api\SchedulerController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TelegramAccountController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\VariableController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Telegram Messaging Automation Module v3.0
|--------------------------------------------------------------------------
*/

// Public Authentication
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Internal MTProto Bridge Inbound Webhook
Route::post('/internal/telegram/webhook', [WebhookController::class, 'handle']);

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth & User Management
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Team & User Management with Limits
    Route::get('/users', [AuthController::class, 'users']);
    Route::post('/users', [AuthController::class, 'storeUser']);
    Route::put('/users/{id}', [AuthController::class, 'updateUser']);
    Route::put('/users/{id}/role', [AuthController::class, 'updateUserRole']);
    Route::delete('/users/{id}', [AuthController::class, 'deleteUser']);
    Route::post('/users/system-limit', [AuthController::class, 'updateSystemLimit']);

    // Telegram MTProto Accounts
    Route::get('/accounts', [TelegramAccountController::class, 'index']);
    Route::post('/accounts/request-otp', [TelegramAccountController::class, 'requestOtp']);
    Route::post('/accounts/verify-otp', [TelegramAccountController::class, 'verifyOtp']);
    Route::post('/accounts/{id}/toggle-listener', [TelegramAccountController::class, 'toggleListener']);
    Route::delete('/accounts/{id}', [TelegramAccountController::class, 'destroy']);

    // Conversation CRM Inbox
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{id}', [ConversationController::class, 'show']);
    Route::post('/conversations/{id}/reply', [ConversationController::class, 'sendReply']);
    Route::put('/conversations/{id}/notes', [ConversationController::class, 'updateNotes']);
    Route::put('/conversations/{id}/tags', [ConversationController::class, 'updateTags']);
    Route::post('/conversations/{id}/toggle-blacklist', [ConversationController::class, 'toggleBlacklist']);

    // Telegram Auto Reply Builder (Module v3.0)
    Route::get('/auto-replies', [AutoReplyController::class, 'index']);
    Route::post('/auto-replies', [AutoReplyController::class, 'store']);
    Route::get('/auto-replies/{id}', [AutoReplyController::class, 'show']);
    Route::put('/auto-replies/{id}', [AutoReplyController::class, 'update']);
    Route::delete('/auto-replies/{id}', [AutoReplyController::class, 'destroy']);
    Route::post('/auto-replies/{id}/toggle', [AutoReplyController::class, 'toggle']);
    Route::post('/auto-replies/{id}/duplicate', [AutoReplyController::class, 'duplicate']);
    Route::post('/auto-replies/test-trigger', [AutoReplyController::class, 'testTrigger']);

    // Follow-up Campaigns & Sequences
    Route::apiResource('campaigns', CampaignController::class);
    Route::post('/campaigns/{id}/toggle', [CampaignController::class, 'toggleStatus']);

    // Message Templates
    Route::apiResource('templates', TemplateController::class);
    Route::post('/templates/{id}/duplicate', [TemplateController::class, 'duplicate'] ?? [AutoReplyController::class, 'duplicate']);

    // Media Library
    Route::get('/media', [MediaController::class, 'index']);
    Route::post('/media', [MediaController::class, 'store']);
    Route::delete('/media/{id}', [MediaController::class, 'destroy']);

    // Variables Manager (Module v3.0)
    Route::get('/variables', [VariableController::class, 'index']);
    Route::post('/variables', [VariableController::class, 'store']);
    Route::put('/variables/{id}', [VariableController::class, 'update']);
    Route::delete('/variables/{id}', [VariableController::class, 'destroy']);
    Route::post('/variables/preview', [VariableController::class, 'preview']);

    // AI Message Assistant (Module v3.0)
    Route::post('/ai-assistant/transform', [AiAssistantController::class, 'transform']);

    // Scheduler & Calendar (Module v3.0)
    Route::get('/scheduler/queue', [SchedulerController::class, 'index']);
    Route::post('/scheduler/queue/{id}/reschedule', [SchedulerController::class, 'reschedule']);
    Route::post('/scheduler/queue/{id}/toggle', [SchedulerController::class, 'toggleStatus']);
    Route::get('/scheduler/calendar-summary', [SchedulerController::class, 'calendarSummary']);

    // Automation Settings (Module v3.0)
    Route::get('/settings/automation', [SettingsController::class, 'getSettings']);
    Route::post('/settings/automation', [SettingsController::class, 'updateSettings']);

    // Keyword & Legacy Rules
    Route::apiResource('rules', RuleController::class);

    // Analytics Dashboard
    Route::get('/analytics/dashboard', [AnalyticsController::class, 'dashboard']);

    // Blacklist Management
    Route::get('/blacklist', [BlacklistController::class, 'index']);
    Route::post('/blacklist', [BlacklistController::class, 'store']);
    Route::delete('/blacklist/{id}', [BlacklistController::class, 'destroy']);

    // System & Queue Logs & Timeline
    Route::get('/logs/activity', [LogController::class, 'activity']);
    Route::get('/logs/messages', [LogController::class, 'messages']);
    Route::get('/logs/scheduled', [LogController::class, 'scheduledQueue']);
    Route::get('/logs/timeline', [LogController::class, 'conversationTimeline']);
    Route::post('/logs/scheduled/{id}/retry', [LogController::class, 'retryScheduled']);
});
