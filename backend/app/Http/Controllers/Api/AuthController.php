<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Your account has been deactivated.'], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'user_login',
            'description' => "User {$user->email} logged in",
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'max_telegram_accounts' => $user->max_telegram_accounts,
                'max_campaigns' => $user->max_campaigns,
                'daily_message_limit' => $user->daily_message_limit,
            ],
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $systemLimit = (int)SystemSetting::get('max_system_users', 10);
        if (User::count() >= $systemLimit) {
            return response()->json([
                'message' => "Maximum system user limit ({$systemLimit} users) reached. Contact administrator.",
            ], 422);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'nullable|string|in:super_admin,admin,manager,support_agent',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'admin',
            'is_active' => true,
            'max_telegram_accounts' => 5,
            'max_campaigns' => 10,
            'daily_message_limit' => 1000,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function users(): JsonResponse
    {
        $users = User::withCount('telegramAccounts')
            ->orderBy('created_at', 'desc')
            ->get();

        $systemLimit = (int)SystemSetting::get('max_system_users', 10);
        $totalUsers = $users->count();
        $activeUsers = $users->where('is_active', true)->count();

        return response()->json([
            'users' => $users,
            'system_limit' => $systemLimit,
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'is_limit_reached' => $totalUsers >= $systemLimit,
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin privilege required.'], 403);
        }

        $systemLimit = (int)SystemSetting::get('max_system_users', 10);
        $currentCount = User::count();

        if ($currentCount >= $systemLimit) {
            return response()->json([
                'message' => "Maximum system limit of {$systemLimit} user accounts reached. Please increase the seat limit before adding more accounts.",
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:super_admin,admin,manager,support_agent',
            'is_active' => 'boolean',
            'max_telegram_accounts' => 'nullable|integer|min:1|max:500',
            'max_campaigns' => 'nullable|integer|min:1|max:1000',
            'daily_message_limit' => 'nullable|integer|min:10|max:500000',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
            'max_telegram_accounts' => $validated['max_telegram_accounts'] ?? 5,
            'max_campaigns' => $validated['max_campaigns'] ?? 10,
            'daily_message_limit' => $validated['daily_message_limit'] ?? 1000,
        ]);

        ActivityLog::create([
            'user_id' => $currentUser->id,
            'action' => 'user_created',
            'description' => "Created user account '{$user->name}' ({$user->email}) with role {$user->role} and {$user->max_telegram_accounts} account limit",
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'User account created successfully',
            'user' => $user,
        ], 201);
    }

    public function updateUser(Request $request, string $id): JsonResponse
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin privilege required.'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'role' => 'required|string|in:super_admin,admin,manager,support_agent',
            'is_active' => 'boolean',
            'max_telegram_accounts' => 'nullable|integer|min:1|max:500',
            'max_campaigns' => 'nullable|integer|min:1|max:1000',
            'daily_message_limit' => 'nullable|integer|min:10|max:500000',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? $user->is_active,
            'max_telegram_accounts' => $validated['max_telegram_accounts'] ?? $user->max_telegram_accounts,
            'max_campaigns' => $validated['max_campaigns'] ?? $user->max_campaigns,
            'daily_message_limit' => $validated['daily_message_limit'] ?? $user->daily_message_limit,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        ActivityLog::create([
            'user_id' => $currentUser->id,
            'action' => 'user_updated',
            'description' => "Updated user '{$user->name}' ({$user->email})",
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'User account updated successfully',
            'user' => $user,
        ]);
    }

    public function updateUserRole(Request $request, string $id): JsonResponse
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'role' => 'required|in:super_admin,admin,manager,support_agent',
            'is_active' => 'boolean',
        ]);

        $user = User::findOrFail($id);
        $user->update($request->only(['role', 'is_active']));

        return response()->json(['message' => 'User updated', 'user' => $user]);
    }

    public function deleteUser(Request $request, string $id): JsonResponse
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin privilege required.'], 403);
        }

        $user = User::findOrFail($id);

        if ($currentUser->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->isSuperAdmin() && User::where('role', 'super_admin')->count() <= 1) {
            return response()->json(['message' => 'Cannot delete the system primary Super Admin.'], 422);
        }

        $userEmail = $user->email;
        $userName = $user->name;
        $user->delete();

        ActivityLog::create([
            'user_id' => $currentUser->id,
            'action' => 'user_deleted',
            'description' => "Deleted user account '{$userName}' ({$userEmail})",
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json(['message' => "User account '{$userName}' deleted successfully"]);
    }

    public function updateSystemLimit(Request $request): JsonResponse
    {
        $currentUser = $request->user();
        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Admin privilege required.'], 403);
        }

        $validated = $request->validate([
            'max_system_users' => 'required|integer|min:1|max:1000',
        ]);

        SystemSetting::set('max_system_users', $validated['max_system_users'], 'Maximum allowed team user accounts in the platform');

        ActivityLog::create([
            'user_id' => $currentUser->id,
            'action' => 'system_limit_updated',
            'description' => "Updated platform user seat limit to {$validated['max_system_users']}",
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Platform user limit updated successfully',
            'max_system_users' => $validated['max_system_users'],
        ]);
    }
}
