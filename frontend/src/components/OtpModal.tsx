import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  X,
  Smartphone,
  Key,
  Lock,
  ArrowRight,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Settings2,
  Sparkles,
} from 'lucide-react';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [alias, setAlias] = useState('');
  const [phone, setPhone] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');

  // Persistent API Credentials State
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [showApiInputs, setShowApiInputs] = useState(false);

  // Step 2 Fields
  const [authId, setAuthId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordNeeded, setIsPasswordNeeded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSavedCredentials();
    }
  }, [isOpen]);

  const loadSavedCredentials = async () => {
    try {
      // 1. Check local storage first
      const localId = localStorage.getItem('teleflow_tg_api_id') || '';
      const localHash = localStorage.getItem('teleflow_tg_api_hash') || '';

      if (localId && localHash) {
        setApiId(localId);
        setApiHash(localHash);
        setHasSavedCredentials(true);
        setShowApiInputs(false);
      }

      // 2. Fetch from backend system settings / connected accounts
      const res = await apiClient.get('/accounts/api-credentials');
      if (res.data?.has_credentials) {
        const fetchedId = res.data.api_id || localId;
        const fetchedHash = res.data.api_hash || localHash;

        setApiId(fetchedId);
        setApiHash(fetchedHash);
        setHasSavedCredentials(true);
        setShowApiInputs(false);

        // Cache in localStorage
        if (fetchedId) localStorage.setItem('teleflow_tg_api_id', fetchedId);
        if (fetchedHash) localStorage.setItem('teleflow_tg_api_hash', fetchedHash);
      } else if (!localId) {
        setHasSavedCredentials(false);
        setShowApiInputs(true);
      }
    } catch (err) {
      console.error('Failed to load saved API credentials', err);
    }
  };

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Cache credentials locally so user never has to re-type
      if (apiId.trim()) localStorage.setItem('teleflow_tg_api_id', apiId.trim());
      if (apiHash.trim()) localStorage.setItem('teleflow_tg_api_hash', apiHash.trim());

      const res = await apiClient.post('/accounts/request-otp', {
        phone: phone.trim(),
        api_id: apiId.trim() ? parseInt(apiId.trim(), 10) : undefined,
        api_hash: apiHash.trim() || undefined,
      });

      setAuthId(res.data.auth_id);
      setIsPasswordNeeded(res.data.is_password_needed || false);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send login code. Please verify phone number & API credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/accounts/verify-otp', {
        alias: alias.trim() || 'My Telegram Account',
        phone: phone.trim(),
        api_id: apiId.trim() ? parseInt(apiId.trim(), 10) : undefined,
        api_hash: apiHash.trim() || undefined,
        auth_id: authId,
        code: otpCode.trim(),
        password: password ? password.trim() : null,
      });

      if (res.data.is_password_needed) {
        setIsPasswordNeeded(true);
        setError('2FA Two-Step Verification is active on this account. Please enter your Cloud Password.');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Incorrect code or 2FA password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {step === 1 ? 'Connect Telegram Account' : 'Verify MTProto Login Code'}
              </h3>
              <p className="text-xs text-slate-500">Step {step} of 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              {/* Account Alias */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Alias / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Account 01, Support Rep"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  required
                  className="input-field text-xs"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telegram Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 202 555 0199 (with country code)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input-field text-xs font-medium"
                />
              </div>

              {/* API Credentials Remembered Banner */}
              {hasSavedCredentials && !showApiInputs && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Telegram API Connected
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowApiInputs(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" />
                      Change API
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Using saved <b>API ID ({apiId})</b>. You can connect any Telegram phone number without entering API details again!
                  </p>
                </div>
              )}

              {/* API ID and Hash Inputs (Shown if no saved credentials or if user clicked Change API) */}
              {(!hasSavedCredentials || showApiInputs) && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-indigo-600" />
                      Telegram MTProto API Credentials
                    </span>
                    {hasSavedCredentials && (
                      <button
                        type="button"
                        onClick={() => setShowApiInputs(false)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                      >
                        Hide
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    💡 <b>Enter this once:</b> It will be automatically saved and reused for all your future Telegram accounts.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        API ID *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1234567"
                        value={apiId}
                        onChange={(e) => setApiId(e.target.value)}
                        required={!hasSavedCredentials}
                        className="input-field text-xs py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        API Hash *
                      </label>
                      <input
                        type="text"
                        placeholder="32-char hash"
                        value={apiHash}
                        onChange={(e) => setApiHash(e.target.value)}
                        required={!hasSavedCredentials}
                        className="input-field text-xs py-1.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Get freely from{' '}
                    <a
                      href="https://my.telegram.org"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold text-indigo-600"
                    >
                      my.telegram.org
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-xs font-semibold py-2.5 px-4">
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      Send Login Code
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-xs text-indigo-900">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <p>
                  A login confirmation code was sent via <b>Telegram app</b> to <b>{phone}</b>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telegram Verification Code (OTP) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  autoFocus
                  className="input-field text-center tracking-widest text-lg font-bold"
                />
              </div>

              {isPasswordNeeded && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-indigo-600" />
                    2FA Cloud Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter your Telegram 2FA password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Required because Two-Step Verification is enabled on your Telegram account.
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  ← Back to details
                </button>

                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="btn-secondary text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading || !otpCode.trim()} className="btn-primary text-xs font-semibold py-2.5 px-4">
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Account'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
