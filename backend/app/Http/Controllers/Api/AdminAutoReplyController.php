<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaLibrary;
use App\Models\TelegramAdminAutoReply;
use App\Models\TelegramAdminAutoReplyStep;
use App\Models\TelegramAdminAutoReplyMedia;
use App\Models\TelegramAdminAutoReplyLink;
use App\Models\TelegramAdminAutoReplyButton;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminAutoReplyController extends Controller
{
    /**
     * Display a listing of admin auto replies with relations.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TelegramAdminAutoReply::with([
            'account',
            'steps' => function ($q) {
                $q->orderBy('step_number', 'asc')->with(['media', 'links', 'buttons']);
            }
        ])
        ->orderBy('priority', 'desc')
        ->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('visibility') && $request->visibility !== 'all') {
            $query->where('visibility', $request->visibility);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        $items = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Store a newly created admin auto reply with complete step structure.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'account_id' => 'nullable|exists:telegram_accounts,id',
            'status' => 'nullable|in:active,paused,draft',
            'priority' => 'nullable|integer|min:1|max:100',
            'trigger_type' => 'nullable|string',
            'trigger_keywords' => 'nullable|array',
            'is_global' => 'nullable|boolean',
            'force_auto_reply' => 'nullable|boolean',
            'disable_user_editing' => 'nullable|boolean',
            'lock_message' => 'nullable|boolean',
            'lock_media' => 'nullable|boolean',
            'lock_links' => 'nullable|boolean',
            'visibility' => 'nullable|in:admin_only,all_users,selected_users,selected_plans',
            'target_plans' => 'nullable|array',
            'target_users' => 'nullable|array',
            
            // Steps array
            'steps' => 'nullable|array',
            'steps.*.step_number' => 'required_with:steps|integer|min:1',
            'steps.*.step_name' => 'nullable|string|max:150',
            'steps.*.delay_value' => 'nullable|integer|min:0',
            'steps.*.delay_unit' => 'nullable|in:seconds,minutes,hours,days',
            'steps.*.message_format' => 'nullable|in:markdown,html,rich',
            'steps.*.message_text' => 'nullable|string',
            'steps.*.is_active' => 'nullable|boolean',
            'steps.*.media' => 'nullable|array',
            'steps.*.links' => 'nullable|array',
            'steps.*.buttons' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $autoReply = TelegramAdminAutoReply::create([
                'user_id' => $request->user()?->id,
                'account_id' => $validated['account_id'] ?? null,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'active',
                'priority' => $validated['priority'] ?? 10,
                'trigger_type' => $validated['trigger_type'] ?? 'all_messages',
                'trigger_keywords' => $validated['trigger_keywords'] ?? null,
                'is_global' => $validated['is_global'] ?? false,
                'force_auto_reply' => $validated['force_auto_reply'] ?? false,
                'disable_user_editing' => $validated['disable_user_editing'] ?? false,
                'lock_message' => $validated['lock_message'] ?? false,
                'lock_media' => $validated['lock_media'] ?? false,
                'lock_links' => $validated['lock_links'] ?? false,
                'visibility' => $validated['visibility'] ?? 'all_users',
                'target_plans' => $validated['target_plans'] ?? null,
                'target_users' => $validated['target_users'] ?? null,
            ]);

            if (!empty($validated['steps'])) {
                foreach ($validated['steps'] as $idx => $s) {
                    $step = $autoReply->steps()->create([
                        'step_number' => $s['step_number'] ?? ($idx + 1),
                        'step_name' => $s['step_name'] ?? ('Step ' . ($idx + 1)),
                        'delay_value' => $s['delay_value'] ?? 0,
                        'delay_unit' => $s['delay_unit'] ?? 'seconds',
                        'message_format' => $s['message_format'] ?? 'markdown',
                        'message_text' => $s['message_text'] ?? '',
                        'is_active' => $s['is_active'] ?? true,
                    ]);

                    // Save Media
                    if (!empty($s['media'])) {
                        foreach ($s['media'] as $mIdx => $m) {
                            $step->media()->create([
                                'media_library_id' => $m['media_library_id'] ?? null,
                                'media_type' => $m['media_type'] ?? 'photo',
                                'file_name' => $m['file_name'] ?? null,
                                'file_path' => $m['file_path'] ?? null,
                                'file_url' => $m['file_url'] ?? null,
                                'mime_type' => $m['mime_type'] ?? null,
                                'file_size' => $m['file_size'] ?? 0,
                                'caption' => $m['caption'] ?? null,
                                'order_index' => $mIdx,
                            ]);
                        }
                    }

                    // Save Links
                    if (!empty($s['links'])) {
                        foreach ($s['links'] as $lIdx => $l) {
                            $step->links()->create([
                                'link_type' => $l['link_type'] ?? 'inline_url',
                                'label' => $l['label'] ?? '',
                                'url' => $l['url'] ?? '',
                                'order_index' => $lIdx,
                            ]);
                        }
                    }

                    // Save Buttons
                    if (!empty($s['buttons'])) {
                        foreach ($s['buttons'] as $bIdx => $b) {
                            $step->buttons()->create([
                                'row_index' => $b['row_index'] ?? 0,
                                'col_index' => $b['col_index'] ?? $bIdx,
                                'label' => $b['label'] ?? 'Button',
                                'button_type' => $b['button_type'] ?? 'url',
                                'data' => $b['data'] ?? '',
                                'order_index' => $bIdx,
                            ]);
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Admin Auto Reply created successfully.',
                'data' => $autoReply->load('steps.media', 'steps.links', 'steps.buttons')
            ], 201);
        });
    }

    /**
     * Show single admin auto reply.
     */
    public function show($id): JsonResponse
    {
        $item = TelegramAdminAutoReply::with([
            'account',
            'steps' => function ($q) {
                $q->orderBy('step_number', 'asc')->with(['media', 'links', 'buttons']);
            }
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $item,
        ]);
    }

    /**
     * Update admin auto reply and its steps.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $autoReply = TelegramAdminAutoReply::findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'account_id' => 'nullable|exists:telegram_accounts,id',
            'status' => 'nullable|in:active,paused,draft',
            'priority' => 'nullable|integer|min:1|max:100',
            'trigger_type' => 'nullable|string',
            'trigger_keywords' => 'nullable|array',
            'is_global' => 'nullable|boolean',
            'force_auto_reply' => 'nullable|boolean',
            'disable_user_editing' => 'nullable|boolean',
            'lock_message' => 'nullable|boolean',
            'lock_media' => 'nullable|boolean',
            'lock_links' => 'nullable|boolean',
            'visibility' => 'nullable|in:admin_only,all_users,selected_users,selected_plans',
            'target_plans' => 'nullable|array',
            'target_users' => 'nullable|array',
            'steps' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($autoReply, $validated) {
            $autoReply->update(array_filter([
                'name' => $validated['name'] ?? $autoReply->name,
                'description' => array_key_exists('description', $validated) ? $validated['description'] : $autoReply->description,
                'account_id' => array_key_exists('account_id', $validated) ? $validated['account_id'] : $autoReply->account_id,
                'status' => $validated['status'] ?? $autoReply->status,
                'priority' => $validated['priority'] ?? $autoReply->priority,
                'trigger_type' => $validated['trigger_type'] ?? $autoReply->trigger_type,
                'trigger_keywords' => array_key_exists('trigger_keywords', $validated) ? $validated['trigger_keywords'] : $autoReply->trigger_keywords,
                'is_global' => array_key_exists('is_global', $validated) ? $validated['is_global'] : $autoReply->is_global,
                'force_auto_reply' => array_key_exists('force_auto_reply', $validated) ? $validated['force_auto_reply'] : $autoReply->force_auto_reply,
                'disable_user_editing' => array_key_exists('disable_user_editing', $validated) ? $validated['disable_user_editing'] : $autoReply->disable_user_editing,
                'lock_message' => array_key_exists('lock_message', $validated) ? $validated['lock_message'] : $autoReply->lock_message,
                'lock_media' => array_key_exists('lock_media', $validated) ? $validated['lock_media'] : $autoReply->lock_media,
                'lock_links' => array_key_exists('lock_links', $validated) ? $validated['lock_links'] : $autoReply->lock_links,
                'visibility' => $validated['visibility'] ?? $autoReply->visibility,
                'target_plans' => array_key_exists('target_plans', $validated) ? $validated['target_plans'] : $autoReply->target_plans,
                'target_users' => array_key_exists('target_users', $validated) ? $validated['target_users'] : $autoReply->target_users,
            ], fn($val) => !is_null($val)));

            if (isset($validated['steps'])) {
                $keptStepIds = [];
                foreach ($validated['steps'] as $idx => $s) {
                    $stepData = [
                        'step_number' => $s['step_number'] ?? ($idx + 1),
                        'step_name' => $s['step_name'] ?? ('Step ' . ($idx + 1)),
                        'delay_value' => $s['delay_value'] ?? 0,
                        'delay_unit' => $s['delay_unit'] ?? 'seconds',
                        'message_format' => $s['message_format'] ?? 'markdown',
                        'message_text' => $s['message_text'] ?? '',
                        'is_active' => $s['is_active'] ?? true,
                    ];

                    if (!empty($s['id'])) {
                        $existingStep = TelegramAdminAutoReplyStep::where('auto_reply_id', $autoReply->id)->find($s['id']);
                        if ($existingStep) {
                            $existingStep->update($stepData);
                            $step = $existingStep;
                        } else {
                            $step = $autoReply->steps()->create($stepData);
                        }
                    } else {
                        $step = $autoReply->steps()->create($stepData);
                    }
                    $keptStepIds[] = $step->id;

                    // Replace media
                    if (array_key_exists('media', $s)) {
                        $step->media()->delete();
                        if (!empty($s['media'])) {
                            foreach ($s['media'] as $mIdx => $m) {
                                $step->media()->create([
                                    'media_library_id' => $m['media_library_id'] ?? null,
                                    'media_type' => $m['media_type'] ?? 'photo',
                                    'file_name' => $m['file_name'] ?? null,
                                    'file_path' => $m['file_path'] ?? null,
                                    'file_url' => $m['file_url'] ?? null,
                                    'mime_type' => $m['mime_type'] ?? null,
                                    'file_size' => $m['file_size'] ?? 0,
                                    'caption' => $m['caption'] ?? null,
                                    'order_index' => $mIdx,
                                ]);
                            }
                        }
                    }

                    // Replace links
                    if (array_key_exists('links', $s)) {
                        $step->links()->delete();
                        if (!empty($s['links'])) {
                            foreach ($s['links'] as $lIdx => $l) {
                                $step->links()->create([
                                    'link_type' => $l['link_type'] ?? 'inline_url',
                                    'label' => $l['label'] ?? '',
                                    'url' => $l['url'] ?? '',
                                    'order_index' => $lIdx,
                                ]);
                            }
                        }
                    }

                    // Replace buttons
                    if (array_key_exists('buttons', $s)) {
                        $step->buttons()->delete();
                        if (!empty($s['buttons'])) {
                            foreach ($s['buttons'] as $bIdx => $b) {
                                $step->buttons()->create([
                                    'row_index' => $b['row_index'] ?? 0,
                                    'col_index' => $b['col_index'] ?? $bIdx,
                                    'label' => $b['label'] ?? 'Button',
                                    'button_type' => $b['button_type'] ?? 'url',
                                    'data' => $b['data'] ?? '',
                                    'order_index' => $bIdx,
                                ]);
                            }
                        }
                    }
                }

                $autoReply->steps()->whereNotIn('id', $keptStepIds)->delete();
            }

            return response()->json([
                'success' => true,
                'message' => 'Admin Auto Reply updated successfully.',
                'data' => $autoReply->fresh()->load('steps.media', 'steps.links', 'steps.buttons')
            ]);
        });
    }

    /**
     * Toggle status between active and paused.
     */
    public function toggle($id): JsonResponse
    {
        $item = TelegramAdminAutoReply::findOrFail($id);
        $item->status = $item->status === 'active' ? 'paused' : 'active';
        $item->save();

        return response()->json([
            'success' => true,
            'message' => "Auto Reply status updated to {$item->status}.",
            'data' => $item,
        ]);
    }

    /**
     * Duplicate an existing admin auto reply with deep relations.
     */
    public function duplicate($id): JsonResponse
    {
        $source = TelegramAdminAutoReply::with(['steps.media', 'steps.links', 'steps.buttons'])->findOrFail($id);

        return DB::transaction(function () use ($source) {
            $clone = $source->replicate(['total_sent', 'total_contacts']);
            $clone->name = $source->name . ' (Copy)';
            $clone->status = 'draft';
            $clone->save();

            foreach ($source->steps as $srcStep) {
                $newStep = $clone->steps()->create([
                    'step_number' => $srcStep->step_number,
                    'step_name' => $srcStep->step_name,
                    'delay_value' => $srcStep->delay_value,
                    'delay_unit' => $srcStep->delay_unit,
                    'message_format' => $srcStep->message_format,
                    'message_text' => $srcStep->message_text,
                    'is_active' => $srcStep->is_active,
                ]);

                foreach ($srcStep->media as $m) {
                    $newStep->media()->create($m->only([
                        'media_library_id', 'media_type', 'file_name', 'file_path', 'file_url', 'mime_type', 'file_size', 'caption', 'order_index'
                    ]));
                }

                foreach ($srcStep->links as $l) {
                    $newStep->links()->create($l->only(['link_type', 'label', 'url', 'order_index']));
                }

                foreach ($srcStep->buttons as $b) {
                    $newStep->buttons()->create($b->only(['row_index', 'col_index', 'label', 'button_type', 'data', 'order_index']));
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Admin Auto Reply duplicated successfully.',
                'data' => $clone->load('steps.media', 'steps.links', 'steps.buttons')
            ]);
        });
    }

    /**
     * Delete an admin auto reply (soft delete).
     */
    public function destroy($id): JsonResponse
    {
        $item = TelegramAdminAutoReply::findOrFail($id);
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Admin Auto Reply deleted successfully.'
        ]);
    }

    /**
     * Secure upload for media attachments.
     */
    public function uploadMedia(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:52428800|mimes:jpg,jpeg,png,webp,gif,mp4,mov,webm,pdf,docx,xlsx,zip,txt,mp3,ogg',
        ]);

        $file = $request->file('file');
        $origName = $file->getClientOriginalName();
        $mime = $file->getClientMimeType();
        $size = $file->getSize();
        $ext = strtolower($file->getClientOriginalExtension());

        // Categorize media type
        $mediaType = 'document';
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
            $mediaType = 'photo';
        } elseif ($ext === 'gif') {
            $mediaType = 'gif';
        } elseif (in_array($ext, ['mp4', 'mov', 'webm'])) {
            $mediaType = 'video';
        } elseif (in_array($ext, ['mp3', 'ogg'])) {
            $mediaType = 'audio';
        }

        $safeName = Str::uuid() . '.' . $ext;
        $path = $file->storeAs('admin_media', $safeName, 'public');

        $media = MediaLibrary::create([
            'user_id' => $request->user()?->id,
            'file_name' => $origName,
            'file_path' => $path,
            'mime_type' => $mime,
            'file_size' => $size,
            'file_type' => $mediaType,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $media->id,
                'file_name' => $origName,
                'file_path' => $path,
                'url' => asset('storage/' . $path),
                'mime_type' => $mime,
                'file_size' => $size,
                'media_type' => $mediaType,
            ]
        ]);
    }
}
