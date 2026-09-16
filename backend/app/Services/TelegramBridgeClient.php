<?php

namespace App\Services;

use App\Models\TelegramAccount;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramBridgeClient
{
    protected string $baseUrl;
    protected string $secretKey;

    public function __construct()
    {
        $this->baseUrl = config('services.telegram_bridge.url', env('TELEGRAM_BRIDGE_URL', 'http://127.0.0.1:8001'));
        $this->secretKey = config('services.telegram_bridge.secret', env('BRIDGE_WEBHOOK_SECRET', 'bridge-internal-secret-key-2026'));
    }

    protected function client()
    {
        return Http::baseUrl($this->baseUrl)
            ->withHeaders([
                'X-Bridge-Secret' => $this->secretKey,
                'Accept' => 'application/json',
            ])
            ->timeout(20);
    }

    public function sendLoginCode(string $phone, int $apiId, string $apiHash): array
    {
        $res = $this->client()->post('/api/auth/send-code', [
            'phone' => $phone,
            'api_id' => $apiId,
            'api_hash' => $apiHash,
        ]);

        if ($res->failed()) {
            throw new Exception($res->json('detail') ?? 'Failed to send login code from Telegram bridge');
        }

        return $res->json();
    }

    public function verifyLoginCode(string $authId, string $code, ?string $password = null): array
    {
        $res = $this->client()->post('/api/auth/verify-code', [
            'auth_id' => $authId,
            'code' => $code,
            'password' => $password,
        ]);

        if ($res->failed()) {
            throw new Exception($res->json('detail') ?? 'Failed to verify OTP code');
        }

        return $res->json();
    }

    public function startListener(TelegramAccount $account): bool
    {
        try {
            $res = $this->client()->post('/api/accounts/start-listener', [
                'account_id' => $account->id,
                'api_id' => $account->api_id,
                'api_hash' => $account->api_hash,
                'session_string' => $account->session_string,
            ]);

            if ($res->successful()) {
                $account->update([
                    'status' => 'connected',
                    'last_connected_at' => now(),
                ]);
                return true;
            }

            Log::error('Bridge start listener error: ' . $res->body());
            $account->update(['status' => 'expired']);
            return false;
        } catch (Exception $e) {
            Log::error('Exception connecting to bridge startListener: ' . $e->getMessage());
            $account->update(['status' => 'disconnected']);
            return false;
        }
    }

    public function stopListener(TelegramAccount $account): bool
    {
        try {
            $res = $this->client()->post('/api/accounts/stop-listener', [
                'account_id' => $account->id,
            ]);
            $account->update(['status' => 'disconnected']);
            return $res->successful();
        } catch (Exception $e) {
            Log::error('Exception in bridge stopListener: ' . $e->getMessage());
            return false;
        }
    }

    public function sendMessage(
        string $accountId,
        int $recipientId,
        ?string $content = null,
        ?string $mediaPath = null,
        string $messageType = 'text'
    ): array {
        $res = $this->client()->post('/api/messages/send', [
            'account_id' => $accountId,
            'recipient_id' => $recipientId,
            'content' => $content,
            'media_path' => $mediaPath,
            'message_type' => $messageType,
        ]);

        if ($res->failed()) {
            throw new Exception($res->json('detail') ?? 'Failed to send outbound message via MTProto bridge');
        }

        return $res->json();
    }

    public function getHealth(): array
    {
        try {
            $res = Http::baseUrl($this->baseUrl)->timeout(3)->get('/api/health');
            return $res->json() ?? ['status' => 'down'];
        } catch (Exception $e) {
            return ['status' => 'down', 'error' => $e->getMessage()];
        }
    }
}
