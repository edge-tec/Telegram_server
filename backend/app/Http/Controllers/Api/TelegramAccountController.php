<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\TelegramAccount;
use App\Services\TelegramBridgeClient;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramAccountController extends Controller
{
    public function __construct(protected TelegramBridgeClient $bridgeClient)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $accounts = TelegramAccount::withCount(['conversations', 'campaigns'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($accounts);
    }

    public function getApiCredentials(): JsonResponse
    {
        list($apiId, $apiHash) = $this->resolveApiCredentials(null, null);

        return response()->json([
            'has_credentials' => !empty($apiId) && !empty($apiHash),
            'api_id' => $apiId ? (string)$apiId : '',
            'api_hash' => $apiHash ?: '',
            'api_hash_masked' => $apiHash ? (substr($apiHash, 0, 4) . '••••••••' . substr($apiHash, -4)) : '',
        ]);
    }

    public function saveApiCredentials(Request $request): JsonResponse
    {
        $request->validate([
            'api_id' => 'required|numeric',
            'api_hash' => 'required|string',
        ]);

        \App\Models\SystemSetting::set('default_telegram_api_id', (string)$request->api_id, 'Default Telegram API ID');
        \App\Models\SystemSetting::set('default_telegram_api_hash', trim($request->api_hash), 'Default Telegram API Hash');

        return response()->json([
            'message' => 'Default Telegram API credentials saved successfully',
            'has_credentials' => true,
            'api_id' => (string)$request->api_id,
        ]);
    }

    protected function resolveApiCredentials(?string $apiId, ?string $apiHash): array
    {
        $resolvedId = $apiId;
        $resolvedHash = $apiHash;

        if (empty($resolvedId) || empty($resolvedHash)) {
            $sysId = \App\Models\SystemSetting::get('default_telegram_api_id');
            $sysHash = \App\Models\SystemSetting::get('default_telegram_api_hash');

            if ($sysId && $sysHash) {
                $resolvedId = $sysId;
                $resolvedHash = $sysHash;
            } else {
                $existing = TelegramAccount::whereNotNull('api_id_encrypted')->latest()->first();
                if ($existing && $existing->api_id && $existing->api_hash) {
                    $resolvedId = (string)$existing->api_id;
                    $resolvedHash = $existing->api_hash;
                    \App\Models\SystemSetting::set('default_telegram_api_id', $resolvedId);
                    \App\Models\SystemSetting::set('default_telegram_api_hash', $resolvedHash);
                }
            }
        } else {
            \App\Models\SystemSetting::set('default_telegram_api_id', (string)$resolvedId);
            \App\Models\SystemSetting::set('default_telegram_api_hash', trim($resolvedHash));
        }

        return [$resolvedId, $resolvedHash];
    }

    public function requestOtp(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->max_telegram_accounts > 0) {
            $existingCount = TelegramAccount::where('user_id', $user->id)->count();
            if ($existingCount >= $user->max_telegram_accounts) {
                return response()->json([
                    'message' => "Account limit reached: Your profile is limited to {$user->max_telegram_accounts} connected Telegram accounts."
                ], 422);
            }
        }

        $request->validate([
            'phone' => 'required|string',
            'api_id' => 'nullable|numeric',
            'api_hash' => 'nullable|string',
        ]);

        list($apiId, $apiHash) = $this->resolveApiCredentials($request->api_id, $request->api_hash);

        if (empty($apiId) || empty($apiHash)) {
            return response()->json([
                'message' => 'API ID and API Hash are required for the initial setup. Please obtain them from my.telegram.org.'
            ], 422);
        }

        try {
            $result = $this->bridgeClient->sendLoginCode(
                phone: trim($request->phone),
                apiId: (int)$apiId,
                apiHash: trim($apiHash)
            );

            $result['api_id'] = (int)$apiId;
            $result['api_hash'] = trim($apiHash);

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->max_telegram_accounts > 0) {
            $existingCount = TelegramAccount::where('user_id', $user->id)->count();
            if ($existingCount >= $user->max_telegram_accounts) {
                return response()->json([
                    'message' => "Account limit reached: Your profile is limited to {$user->max_telegram_accounts} connected Telegram accounts."
                ], 422);
            }
        }

        $request->validate([
            'alias' => 'required|string|max:100',
            'phone' => 'required|string',
            'api_id' => 'nullable|numeric',
            'api_hash' => 'nullable|string',
            'auth_id' => 'required|string',
            'code' => 'required|string',
            'password' => 'nullable|string',
        ]);

        list($apiId, $apiHash) = $this->resolveApiCredentials($request->api_id, $request->api_hash);

        if (empty($apiId) || empty($apiHash)) {
            return response()->json([
                'message' => 'Missing API ID or API Hash.'
            ], 422);
        }

        try {
            $authResult = $this->bridgeClient->verifyLoginCode(
                authId: $request->auth_id,
                code: trim($request->code),
                password: $request->password
            );

            if (!empty($authResult['is_password_needed']) && $authResult['is_password_needed'] === true) {
                return response()->json($authResult, 200);
            }

            // Create account in database with encrypted credentials
            $account = new TelegramAccount();
            $account->user_id = $request->user()?->id;
            $account->alias = $request->alias;
            $account->phone = trim($request->phone);
            $account->api_id = (int)$apiId;
            $account->api_hash = trim($apiHash);
            $account->session_string = $authResult['session_string'];
            $account->telegram_id = (string)($authResult['telegram_id'] ?? '');
            $account->username = $authResult['username'] ?? '';
            $account->first_name = $authResult['first_name'] ?? '';
            $account->last_name = $authResult['last_name'] ?? '';
            $account->status = 'connected';
            $account->last_connected_at = now();
            $account->save();

            // Start listener on python microservice
            $this->bridgeClient->startListener($account);

            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'action' => 'telegram_account_connected',
                'description' => "Connected Telegram account {$account->alias} (@{$account->username})",
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Telegram account connected and listener started',
                'account' => $account,
            ], 201);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function toggleListener(Request $request, string $id): JsonResponse
    {
        $account = TelegramAccount::findOrFail($id);

        if ($account->status === 'connected') {
            $this->bridgeClient->stopListener($account);
            $account->update(['status' => 'disconnected']);
            $msg = 'Listener stopped';
        } else {
            $success = $this->bridgeClient->startListener($account);
            if (!$success) {
                return response()->json(['message' => 'Failed to connect. Session may have expired.'], 400);
            }
            $msg = 'Listener started';
        }

        return response()->json([
            'message' => $msg,
            'status' => $account->status,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $account = TelegramAccount::findOrFail($id);
        $this->bridgeClient->stopListener($account);
        $account->delete();

        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'telegram_account_deleted',
            'description' => "Removed Telegram account {$account->alias}",
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Account removed successfully']);
    }
}
