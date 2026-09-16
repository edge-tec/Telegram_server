import React, { useState, useEffect, useRef } from 'react';
import { MediaItem, apiClient } from '../api/client';
import {
  FolderOpen,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Music,
  File,
  Trash2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export const MediaLibrary: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photo' | 'video' | 'voice' | 'audio' | 'document'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, [activeFilter]);

  const fetchMedia = async () => {
    try {
      const res = await apiClient.get('/media', {
        params: { type: activeFilter },
      });
      setMediaItems(res.data);
    } catch (err) {
      console.error('Error fetching media', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      await apiClient.post('/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchMedia();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload media file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete media item "${name}"?`)) return;
    try {
      await apiClient.delete(`/media/${id}`);
      fetchMedia();
    } catch (err) {
      console.error(err);
    }
  };

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const filterTabs = [
    { id: 'all', label: 'All Media' },
    { id: 'photo', label: 'Photos / Images' },
    { id: 'video', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
    { id: 'document', label: 'Documents (PDF/Doc)' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Media Asset Library</h2>
          <p className="text-sm text-slate-500 mt-1">
            Central repository for reusable photos, videos, voice notes, PDFs, and documents used in templates.
          </p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.mp3,.ogg,.pdf,.docx,.zip"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-primary text-sm shadow-md shadow-blue-500/10"
          >
            <UploadCloud className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload Media File'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {filterTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveFilter(t.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === t.id
                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {mediaItems.length === 0 ? (
        <div className="card p-12 text-center max-w-md mx-auto">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">No Media Uploaded</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Upload images, brochures, videos or audio to attach them to auto-replies.
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs mx-auto">
            <UploadCloud className="w-3.5 h-3.5" /> Upload File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {mediaItems.map((m) => {
            const isPhoto = m.file_type === 'photo';
            const isVideo = m.file_type === 'video';
            const isAudio = m.file_type === 'audio' || m.file_type === 'voice';

            return (
              <div key={m.id} className="card p-3 flex flex-col justify-between hover:shadow-hover transition-all group">
                <div className="space-y-2">
                  {/* Thumbnail Preview Area */}
                  <div className="h-32 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative border border-slate-200/60">
                    {isPhoto ? (
                      <img src={m.url} alt={m.file_name} className="w-full h-full object-cover" />
                    ) : isVideo ? (
                      <Video className="w-10 h-10 text-slate-400" />
                    ) : isAudio ? (
                      <Music className="w-10 h-10 text-slate-400" />
                    ) : (
                      <File className="w-10 h-10 text-slate-400" />
                    )}
                    <span className="badge absolute top-2 right-2 bg-white/90 text-slate-700 text-[10px] shadow-xs uppercase font-bold">
                      {m.file_type}
                    </span>
                  </div>

                  {/* File Info */}
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs truncate" title={m.file_name}>
                      {m.file_name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatFileSize(m.file_size)} • {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-slate-400">
                  <button
                    onClick={() => copyUrl(m.id, m.url)}
                    className="hover:text-blue-600 transition-colors p-1"
                    title="Copy Public URL"
                  >
                    {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-700 transition-colors p-1"
                    title="View Original"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleDelete(m.id, m.file_name)}
                    className="hover:text-rose-600 transition-colors p-1"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
