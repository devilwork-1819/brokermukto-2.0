import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Key, Timer, RefreshCw, Smartphone, Check } from 'lucide-react';
import { T } from '../translations';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mobile: string;
  name: string;
  lang: 'bn' | 'en';
  onSuccess: () => void;
}

export default function OTPVerificationModal({
  isOpen,
  onClose,
  mobile,
  name,
  lang,
  onSuccess
}: OTPVerificationModalProps) {
  const t = T[lang];

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Countdown timer and sandbox preview variables
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [successVerified, setSuccessVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send OTP on modal open or mobile change
  useEffect(() => {
    if (isOpen && mobile) {
      triggerSendOtp();
    } else {
      // Reset state when closed
      setOtpSent(false);
      setOtpInput(['', '', '', '', '', '']);
      setOtpError(null);
      setIsSimulated(false);
      setSimulatedCode('');
      setGatewayError(null);
      setSuccessVerified(false);
    }
  }, [isOpen, mobile]);

  // Handle resend countdown
  useEffect(() => {
    let interval: any;
    if (otpSent && !successVerified) {
      setOtpTimer(30);
      setCanResendOtp(false);
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, successVerified]);

  const triggerSendOtp = async () => {
    setLoading(true);
    setOtpError(null);
    setOtpInput(['', '', '', '', '', '']);
    
    // Quick sanitization of mobile number
    const targetMobile = mobile.trim();
    if (!targetMobile) {
      setOtpError(lang === 'bn' ? '⚠️ কোনো মোবাইল নম্বর পাওয়া যায়নি' : '⚠️ No mobile number provided');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, mobile: targetMobile })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }
      setLoading(false);

      if (!res.ok) {
        setOtpError(data.error || (lang === 'bn' ? "OTP পাঠাতে ব্যর্থ হয়েছে।" : "Failed to send validation OTP."));
        return;
      }

      setOtpSent(true);
      if (data.simulated) {
        setIsSimulated(true);
        setSimulatedCode(data.code || '');
        setGatewayError(data.gatewayError || null);
      } else {
        setIsSimulated(false);
        setSimulatedCode('');
        setGatewayError(null);
      }
    } catch (err) {
      setLoading(false);
      setOtpError(lang === 'bn' ? '❌ নেটওয়ার্ক বা সার্ভার সংযোগ ত্রুটি।' : '❌ Network or server connection timeout.');
    }
  };

  const handleInputChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);

    // Auto-focus next input box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      // Auto-focus back on deletion
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtpSubmit = async () => {
    const enteredCode = otpInput.join('');
    if (enteredCode.length !== 6) {
      setOtpError(lang === 'bn' ? '⚠️ অনুগ্রহ করে ৬ সংখ্যার ওটিপি দিন।' : '⚠️ Please enter all 6 OTP digits.');
      return;
    }

    setLoading(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), code: enteredCode })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }
      setLoading(false);

      if (!res.ok) {
        setOtpError(data.error || (lang === 'bn' ? "❌ ভুল ওটিপি! আবার চেষ্টা করুন।" : "❌ Incorrect verification OTP. Please try again."));
        setOtpInput(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Handled successfully
      setSuccessVerified(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch {
      setLoading(false);
      setOtpError(lang === 'bn' ? '❌ সংযোগের সময় শেষ হয়েছে।' : '❌ Connection timed out.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div 
        id="otp-verification-dialog"
        className="w-full max-w-md bg-slate-950 border-2 border-yellow-500/40 rounded-3xl p-6 md:p-8 relative shadow-2xl flex flex-col gap-5 overflow-hidden"
      >
        {/* Banner Gradient */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-teal-500"></div>
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button unless success */}
        {!successVerified && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg cursor-pointer transition-all"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Success Visual */}
        {successVerified ? (
          <div className="py-8 flex flex-col items-center justify-center gap-4 text-center animate-fade-in">
            <div className="p-4 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 scale-110 animate-pulse">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {lang === 'bn' ? '✓ মোবাইল নম্বর যাচাইকৃত!' : '✓ Number Verified!'}
              </h3>
              <p className="text-xs text-white/50">
                {lang === 'bn' ? 'সফলভাবে ওটিপি যাচাই নিশ্চিত করা হয়েছে।' : 'OTP verification was completed successfully.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header portion */}
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex items-center gap-1.5 bg-yellow-500/15 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-yellow-500/10">
                <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                <span>{lang === 'bn' ? 'ওটিপি মোবাইল যাচাইকরণ' : 'Secured OTP-Verification'}</span>
              </div>
              <h2 className="text-base md:text-lg font-black text-white tracking-tight leading-tight">
                {lang === 'bn' ? 'নিরাপদ মোবাইল অথেন্টিকেশন' : 'Authorize Your Submission'}
              </h2>
              <p className="text-[11px] text-white/60 max-w-xs mx-auto leading-normal">
                {lang === 'bn' 
                  ? `আপনার দেওয়া মোবাইল নম্বরটি (${mobile}) সত্যতা নিশ্চিত করতে একটি ওটিপি পাঠানো হয়েছে।`
                  : `For absolute security, an SMS containing a 6-digit OTP code was dispatched to your mobile number (${mobile}).`}
              </p>
            </div>

            {/* Error Banner */}
            {otpError && (
              <div className="bg-red-500/15 border border-red-500/35 text-red-300 rounded-xl p-3 text-[11px] font-bold tracking-wide animate-pulse">
                {otpError}
              </div>
            )}

            {/* Simulated sandbox mode notice (Very important for seamless preview) */}
            {isSimulated && (
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-3.5 text-center space-y-1.5 animate-fade-in">
                <p className="text-[10px] font-black tracking-normal text-teal-400 uppercase">
                  🧪 {lang === 'bn' ? 'স্যান্ডবক্স ওটিপি সিমুলেশন' : 'Developer Sandbox Mode'}
                </p>
                <div className="text-lg font-black tracking-widest text-[#26ba9b] select-all">
                  {simulatedCode}
                </div>
                <p className="text-[9px] text-[#26ba9b]/70 font-semibold leading-none">
                  {lang === 'bn' ? 'এসএমএস গেটওয়ে কনফিগার না থাকায় উপরে দেওয়া ওটিপি ব্যবহার করুন।' : 'Fast2SMS config absent. Enter the verification code above to progress.'}
                </p>
                {gatewayError && (
                  <div className="mt-1.5 pt-1.5 border-t border-teal-500/10 text-left text-[9px] font-mono leading-normal text-amber-400/80">
                    <span className="font-bold uppercase text-[8px] text-amber-500 block mb-0.5">⚠️ Fast2SMS Gateway Info:</span>
                    {gatewayError}
                  </div>
                )}
              </div>
            )}

            {/* Core 6 digit code layout */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {otpInput.map((val, idx) => (
                  <input
                    key={idx}
                    id={`modal-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleInputChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    className="w-11 h-12 md:w-12 md:h-13 bg-black/40 border border-white/10 hover:border-white/20 focus:border-yellow-500 focus:bg-yellow-500/5 rounded-xl text-center text-lg font-bold text-white outline-none transition-all placeholder-transparent"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={loading}
                    placeholder="-"
                  />
                ))}
              </div>

              {/* Verify CTA */}
              <button
                type="button"
                onClick={handleVerifyOtpSubmit}
                disabled={loading}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/30 text-teal-950 font-black rounded-xl text-xs sm:text-sm transition-all duration-150 transform hover:-translate-y-[2px] active:translate-y-[2px] shadow-lg cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-950" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-teal-950" />
                )}
                <span>{lang === 'bn' ? 'ওটিপি যাচাই করুন ও নিশ্চিত হন' : 'Verify OTP & Complete'}</span>
              </button>
            </div>

            {/* Timer and Resend controls */}
            <div className="text-center pt-1 border-t border-white/5 flex items-center justify-between text-[11px] font-bold px-1 text-white/50">
              <div className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-white/40" />
                <span>
                  {otpTimer > 0 
                    ? (lang === 'bn' ? `${otpTimer} সেকেন্ড পর` : `Resend in ${otpTimer}s`)
                    : (lang === 'bn' ? 'কোড প্রস্তুত' : 'Ready')}
                </span>
              </div>

              <button
                type="button"
                onClick={triggerSendOtp}
                disabled={!canResendOtp || loading}
                className={`flex items-center gap-1 cursor-pointer transition-all ${
                  canResendOtp && !loading 
                    ? 'text-yellow-500 hover:text-yellow-400' 
                    : 'text-white/25 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>{lang === 'bn' ? 'আবার ওটিপি পাঠান' : 'Resend OTP'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
