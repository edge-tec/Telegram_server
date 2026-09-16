import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { X, Smartphone, Key, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

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

  // Step 2 Fields
  const [authId, setAuthId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordNeeded, setIsPasswordNeeded] = useState(false);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/accounts/request-otp', {
        phone: phone.trim(),
        api_id: parseInt(apiId.trim(), 10),
        api_hash: apiHash.trim(),
      });

      setAuthId(res.data.auth_id);
      setIsPasswordNeeded(res.data.is_password_needed || false);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send login code. Please verify API ID & Hash.');
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
        api_id: parseInt(apiId.trim(), 10),
        api_hash: apiHash.trim(),
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
      setError(err.response?.data?.message || 'Verification failed. Incorrect code or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                {step === 1 ? 'Connect Telegram Personal Account' : 'Verify MTProto Login Code'}
              </h3>
              <p className="text-xs text-slate-500">Step {step} of 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Alias / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Account 01"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  required
                  className="input-field"
                />
              </div>

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
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    API ID
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1234567"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    API Hash
                  </label>
                  <input
                    type="text"
                    placeholder="32-character hash"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed">
                Obtain your <strong>API ID</strong> & <strong>API Hash</strong> freely from{' '}
                <a
                  href="https://my.telegram.org"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold hover:text-blue-800"
                >
                  my.telegram.org
                </a>
                . Credentials and MTProto sessions are encrypted via AES-256-GCM.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Requesting Code...
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
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-2">
                  <Key className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-600">
                  Telegram has sent a verification code to your Telegram app on <strong>{phone}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telegram Verification Code (OTP)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  autoFocus
                  className="input-field text-center text-lg tracking-widest font-mono"
                />
              </div>

              {(isPasswordNeeded || true) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    2FA Cloud Password (Optional if enabled)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter 2FA password if set"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Back to credentials
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify & Activate Account
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
