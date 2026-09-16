import React from 'react';
import { Plus, Trash2, ExternalLink, Phone, Copy, ArrowRight, ArrowLeft, Menu, Hash } from 'lucide-react';
import { TelegramButton } from '../api/client';

interface TelegramButtonsBuilderProps {
  buttons: TelegramButton[];
  onChange: (buttons: TelegramButton[]) => void;
}

export const TelegramButtonsBuilder: React.FC<TelegramButtonsBuilderProps> = ({
  buttons,
  onChange,
}) => {
  const addButton = () => {
    const newBtn: TelegramButton = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'open_url',
      label: 'Open Website',
      data: 'https://',
    };
    onChange([...buttons, newBtn]);
  };

  const removeButton = (index: number) => {
    const updated = buttons.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateButton = (index: number, field: keyof TelegramButton, val: string) => {
    const updated = buttons.map((btn, i) => {
      if (i === index) {
        return { ...btn, [field]: val };
      }
      return btn;
    });
    onChange(updated);
  };

  const getButtonIcon = (type: string) => {
    switch (type) {
      case 'open_url':
        return <ExternalLink className="w-3.5 h-3.5 text-blue-500" />;
      case 'call_number':
        return <Phone className="w-3.5 h-3.5 text-emerald-500" />;
      case 'copy_coupon':
        return <Copy className="w-3.5 h-3.5 text-amber-500" />;
      case 'next_message':
        return <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />;
      case 'previous_message':
        return <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />;
      case 'menu_button':
        return <Menu className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Hash className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>Telegram Inline Keyboard Buttons</span>
          <span className="text-[11px] font-normal text-slate-400">({buttons.length})</span>
        </label>
        <button
          type="button"
          onClick={addButton}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Button
        </button>
      </div>

      {buttons.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
          <p className="text-xs text-slate-400">
            No buttons configured. Click <b>Add Button</b> to attach Telegram inline actions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {buttons.map((btn, index) => (
            <div
              key={btn.id || index}
              className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 shadow-2xs hover:border-indigo-200 transition-colors"
            >
              <div className="p-1.5 bg-slate-50 rounded-lg">{getButtonIcon(btn.type)}</div>

              {/* Type select */}
              <div className="w-40 shrink-0">
                <select
                  value={btn.type}
                  onChange={(e) => updateButton(index, 'type', e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="open_url">Open URL</option>
                  <option value="call_number">Call Number</option>
                  <option value="copy_coupon">Copy Coupon</option>
                  <option value="callback">Callback Event</option>
                  <option value="next_message">Next Message</option>
                  <option value="previous_message">Previous Message</option>
                  <option value="menu_button">Menu Button</option>
                </select>
              </div>

              {/* Label */}
              <div className="w-44 shrink-0">
                <input
                  type="text"
                  value={btn.label}
                  onChange={(e) => updateButton(index, 'label', e.target.value)}
                  placeholder="Button label..."
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Data / URL */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={btn.data}
                  onChange={(e) => updateButton(index, 'data', e.target.value)}
                  placeholder={
                    btn.type === 'open_url'
                      ? 'https://example.com'
                      : btn.type === 'call_number'
                      ? '+1234567890'
                      : btn.type === 'copy_coupon'
                      ? 'DISCOUNT50'
                      : 'action_payload_data'
                  }
                  className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeButton(index)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove button"
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
