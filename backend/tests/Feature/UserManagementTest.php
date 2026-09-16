<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        SystemSetting::set('max_system_users', 10);
    }

    public function test_admin_can_fetch_users_with_system_limit(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.local',
            'password' => 'secret123',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'users',
                'system_limit',
                'total_users',
                'active_users',
                'is_limit_reached',
            ])
            ->assertJson([
                'system_limit' => 10,
                'total_users' => 1,
                'is_limit_reached' => false,
            ]);
    }

    public function test_admin_can_create_user_with_limits(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.local',
            'password' => 'secret123',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $payload = [
            'name' => 'Agent John',
            'email' => 'john@test.local',
            'password' => 'password123',
            'role' => 'manager',
            'is_active' => true,
            'max_telegram_accounts' => 3,
            'max_campaigns' => 5,
            'daily_message_limit' => 500,
        ];

        $response = $this->actingAs($admin)->postJson('/api/users', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'User account created successfully',
                'user' => [
                    'name' => 'Agent John',
                    'email' => 'john@test.local',
                    'role' => 'manager',
                    'max_telegram_accounts' => 3,
                    'max_campaigns' => 5,
                    'daily_message_limit' => 500,
                ]
            ]);

        $this->assertDatabaseHas('users', ['email' => 'john@test.local', 'role' => 'manager']);
    }

    public function test_system_user_limit_is_enforced(): void
    {
        SystemSetting::set('max_system_users', 2);

        $admin = User::create([
            'name' => 'Admin 1',
            'email' => 'admin1@test.local',
            'password' => 'secret123',
            'role' => 'admin',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'User 2',
            'email' => 'user2@test.local',
            'password' => 'secret123',
            'role' => 'manager',
            'is_active' => true,
        ]);

        // Trying to add 3rd user when limit is 2
        $response = $this->actingAs($admin)->postJson('/api/users', [
            'name' => 'User 3',
            'email' => 'user3@test.local',
            'password' => 'password123',
            'role' => 'support_agent',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Maximum system limit of 2 user accounts reached. Please increase the seat limit before adding more accounts.',
            ]);
    }

    public function test_admin_can_update_user_and_limits(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.local',
            'password' => 'secret123',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $user = User::create([
            'name' => 'Old Name',
            'email' => 'old@test.local',
            'password' => 'secret123',
            'role' => 'support_agent',
            'is_active' => true,
            'max_telegram_accounts' => 1,
        ]);

        $response = $this->actingAs($admin)->putJson("/api/users/{$user->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@test.local',
            'role' => 'manager',
            'is_active' => false,
            'max_telegram_accounts' => 8,
            'max_campaigns' => 20,
            'daily_message_limit' => 2000,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'name' => 'Updated Name',
                    'email' => 'updated@test.local',
                    'role' => 'manager',
                    'is_active' => false,
                    'max_telegram_accounts' => 8,
                    'max_campaigns' => 20,
                    'daily_message_limit' => 2000,
                ]
            ]);
    }

    public function test_admin_can_update_system_user_limit(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.local',
            'password' => 'secret123',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->postJson('/api/users/system-limit', [
            'max_system_users' => 25,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'max_system_users' => 25,
            ]);

        $this->assertEquals(25, (int)SystemSetting::get('max_system_users'));
    }

    public function test_user_cannot_delete_themselves(): void
    {
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@test.local',
            'password' => 'secret123',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/users/{$admin->id}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'You cannot delete your own account.',
            ]);
    }
}
