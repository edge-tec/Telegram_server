<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaLibrary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $query = MediaLibrary::orderBy('created_at', 'desc');

        if ($type && $type !== 'all') {
            $query->where('file_type', $type);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:51200|mimes:jpg,jpeg,png,webp,gif,mp4,mov,mp3,ogg,pdf,docx,zip',
        ]);

        $file = $request->file('file');
        $origName = $file->getClientOriginalName();
        $mime = $file->getClientMimeType();
        $size = $file->getSize();
        $ext = strtolower($file->getClientOriginalExtension());

        // Determine file type
        $type = 'document';
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
            $type = 'photo';
        } elseif (in_array($ext, ['mp4', 'mov'])) {
            $type = 'video';
        } elseif ($ext === 'ogg') {
            $type = 'voice';
        } elseif ($ext === 'mp3') {
            $type = 'audio';
        }

        $filename = Str::uuid() . '.' . $ext;
        $path = $file->storeAs('media', $filename, 'public');

        $media = MediaLibrary::create([
            'user_id' => $request->user()?->id,
            'file_name' => $origName,
            'file_path' => $path,
            'mime_type' => $mime,
            'file_size' => $size,
            'file_type' => $type,
        ]);

        return response()->json(['message' => 'Media uploaded successfully', 'media' => $media], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $media = MediaLibrary::findOrFail($id);
        Storage::disk('public')->delete($media->file_path);
        $media->delete();

        return response()->json(['message' => 'Media deleted successfully']);
    }
}
