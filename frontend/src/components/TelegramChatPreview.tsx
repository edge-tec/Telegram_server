import React from 'react';
import { CheckCheck, Send, ExternalLink, Phone, Copy, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { TelegramButton } from '../api/client';

interface TelegramChatPreviewProps {
  messageText: string;
  senderName?: string;
  senderHandle?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: string;
  buttons?: TelegramButton[];
  isAlbum?: boolean;
  albumItems?: Array<{ url?: string; caption?: string }>;
}

export const TelegramChatPreview: React.FC<TelegramChatPreviewProps> = ({
  messageText,
  senderName = 'TeleFlow Bot',
  senderHandle = '@teleflow_bot',
  mediaUrl,
  mediaCaption,
  mediaType = 'text',
  buttons = [],
  isAlbum = false,
  albumItems = [],
}) => {
  // Replace merge tags for live realistic preview
  const previewText = messageText
    .replace(/<first_name>|{{first_name}}/g, 'Alex')
    .replace(/<last_name>|{{last_name}}/g, 'Carter')
    .replace(/<username>|{{username}}/g, '@alex_carter')
    .replace(/<phone>|{{phone}}/g, '+1 (555) 234-5678')
    .replace(/<telegram_id>|{{telegram_id}}/g, '198273645')
    .replace(/<country>|{{country}}/g, 'United States')
    .replace(/<city>|{{city}}/g, 'New York')
    .replace(/<current_date>|{{current_date}}/g, new Date().toISOString().split('T')[0])
    .replace(/<current_time>|{{current_time}}/g, '14:30')
    .replace(/<campaign_name>|{{campaign_name}}/g, 'VIP Onboarding');

  return (
    <div className="bg-[#8ec3e8]/20 border border-slate-200/80 rounded-[20px] p-4 flex flex-col h-full select-none overflow-hidden relative shadow-xs">
      {/* Telegram Chat Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-xl p-2.5 px-3 flex items-center justify-between border border-slate-200/60 shadow-xs mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {senderName.charAt(0)}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">{senderName}</h4>
            <span className="text-[10px] text-blue-600 font-medium">bot • {senderHandle}</span>
          </div>
        </div>
        <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Live Preview
        </div>
      </div>

      {/* Telegram Chat Background & Stream */}
      <div className="flex-1 flex flex-col justify-end space-y-3 p-1">
        {/* Sample Incoming User Bubble */}
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-bl-xs p-3 max-w-[80%] shadow-xs border border-slate-100 text-xs text-slate-800">
            <p className="font-normal">Hello, can you tell me more about your pricing?</p>
            <div className="flex justify-end items-center gap-1 text-[9px] text-slate-400 mt-1">
              <span>14:29</span>
            </div>
          </div>
        </div>

        {/* Automated Outbound Response Bubble */}
        <div className="flex flex-col items-end">
          <div className="bg-[#eef8ff] text-slate-900 rounded-2xl rounded-br-xs p-3.5 max-w-[88%] shadow-xs border border-blue-100/60 relative">
            {/* Media Attachment Preview */}
            {mediaUrl && (
              <div className="mb-2 rounded-xl overflow-hidden bg-slate-100 border border-blue-200/40">
                {mediaType === 'video' ? (
                  <div className="aspect-video bg-slate-800 flex items-center justify-center text-white text-xs font-medium">
                    ▶ Video Preview
                  </div>
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Media preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                {mediaCaption && (
                  <p className="p-2 text-[11px] text-slate-600 italic bg-white/70">{mediaCaption}</p>
                )}
              </div>
            )}

            {/* Album Multi-Media Grid */}
            {isAlbum && albumItems.length > 0 && (
              <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
                {albumItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="aspect-square bg-slate-200 rounded-lg overflow-hidden relative">
                    {item.url ? (
                      <img src={item.url} alt="Album item" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Message Body */}
            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {previewText || (
                <span className="text-slate-400 italic">No message content configured yet...</span>
              )}
            </div>

            {/* Timestamp & Status Checkmarks */}
            <div className="flex justify-end items-center gap-1 text-[10px] text-blue-600 font-medium mt-1.5">
              <span>14:30</span>
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>

          {/* Telegram Inline Keyboard Buttons */}
          {buttons && buttons.length > 0 && (
            <div className="mt-1.5 w-full max-w-[88%] space-y-1">
              {buttons.map((btn, idx) => (
                <button
                  key={btn.id || idx}
                  type="button"
                  className="w-full py-2 px-3 bg-white/95 hover:bg-white text-blue-600 font-semibold text-xs rounded-xl shadow-2xs border border-blue-200/70 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
                >
                  {btn.type === 'open_url' && <ExternalLink className="w-3 h-3" />}
                  {btn.type === 'call_number' && <Phone className="w-3 h-3" />}
                  {btn.type === 'copy_coupon' && <Copy className="w-3 h-3" />}
                  {btn.type === 'next_message' && <ArrowRight className="w-3 h-3" />}
                  <span>{btn.label || 'Action'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
