import React, { useState } from 'react';
import { UploadCloud, Image as ImageIcon, Film, FileText, Trash2, Check, Layers } from 'lucide-react';
import { apiClient } from '../api/client';

export interface AttachedMedia {
  id: string;
  url?: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  caption?: string;
}

interface MediaAttachmentUploaderProps {
  attachments: AttachedMedia[];
  onChange: (attachments: AttachedMedia[]) => void;
  isAlbum: boolean;
  onToggleAlbum: (val: boolean) => void;
}

export const MediaAttachmentUploader: React.FC<MediaAttachmentUploaderProps> = ({
  attachments,
  onChange,
  isAlbum,
  onToggleAlbum,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const newAttachments: AttachedMedia[] = [...attachments];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100));

        const res = await apiClient.post('/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadedItem = res.data.media;
        newAttachments.push({
          id: uploadedItem.id,
          url: uploadedItem.url || `/storage/${uploadedItem.file_path}`,
          file_name: uploadedItem.file_name,
          file_type: uploadedItem.file_type || 'photo',
          file_size: uploadedItem.file_size,
          caption: '',
        });
      }

      setUploadProgress(100);
      onChange(newAttachments);
    } catch (err) {
      console.error('Failed to upload file', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateCaption = (index: number, caption: string) => {
    const updated = attachments.map((att, i) => (i === index ? { ...att, caption } : att));
    onChange(updated);
  };

  const getIcon = (type: string) => {
    if (type === 'video') return <Film className="w-4 h-4 text-purple-600" />;
    if (type === 'photo' || type === 'image') return <ImageIcon className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-amber-600" />;
  };

  return (
    <div className="space-y-3">
      {/* Header and Album Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>Attached Media</span>
          <span className="text-[11px] font-normal text-slate-400">({attachments.length})</span>
        </label>

        {attachments.length > 1 && (
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Send as Telegram Album</span>
            <input
              type="checkbox"
              checked={isAlbum}
              onChange={(e) => onToggleAlbum(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        )}
      </div>

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center bg-slate-50/40 hover:bg-indigo-50/20 transition-all relative">
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          disabled={isUploading}
          accept="image/*,video/*,audio/*,.pdf,.docx,.zip,.txt"
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">
            {isUploading ? 'Uploading file(s)...' : 'Click or drag media here to attach'}
          </p>
          <p className="text-[11px] text-slate-400">
            Images (JPG, PNG, WEBP), Videos (MP4), GIFs, Voice notes, Documents (PDF, ZIP)
          </p>
        </div>

        {isUploading && (
          <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att, idx) => (
            <div
              key={att.id || idx}
              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-2xs hover:border-indigo-200 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200">
                {att.url && (att.file_type === 'photo' || att.file_type === 'image') ? (
                  <img src={att.url} alt={att.file_name} className="w-full h-full object-cover" />
                ) : (
                  getIcon(att.file_type)
                )}
              </div>

              {/* Info & Caption Input */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800 truncate">{att.file_name}</p>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">
                    {att.file_type}
                  </span>
                </div>
                <input
                  type="text"
                  value={att.caption || ''}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  placeholder="Optional media caption..."
                  className="w-full text-xs text-slate-600 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 mt-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove attachment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
