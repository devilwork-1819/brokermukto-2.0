import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, HelpCircle, Key, Check } from 'lucide-react';
import { T } from '../translations';
import { Listing } from '../types';

interface SellerPaymentViewProps {
  lang: 'bn' | 'en';
  pendingListing: Omit<Listing, 'id' | 'verified' | 'sold' | 'soldAt'> | null;
  onBack: () => void;
  onPaymentSuccess: (paymentId: string) => void;
}

export default function SellerPaymentView({
  lang,
  pendingListing,
  onBack,
  onPaymentSuccess
}: SellerPaymentViewProps) {
  const t = T[lang];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);

  // OTP Resend & Timer
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Secure API Session Details
  const [isSimulated, setIsSimulated] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');

  useEffect(() => {
    let interval: any;
    if (otpSent) {
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
  }, [otpSent]);

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    setOtpInput(['', '', '', '', '', '']);
    setOtpTimer(30);
    setCanResendOtp(false);
    setOtpError(null);

    const mobileStr = pendingListing?.mobile || '';

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Seller", mobile: mobileStr.trim() })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }

      if (!res.ok) {
        setOtpError(data.error || "Failed to resend listing verification code.");
        return;
      }

      if (data.simulated) {
        setIsSimulated(true);
        setSimulatedCode(data.code);
      } else {
        setIsSimulated(false);
        setSimulatedCode('');
      }
    } catch {
      setOtpError("Server lookup timeout error.");
    }
  };

  const startPayment = async () => {
    setLoading(true);
    setOtpError(null);

    const mobileStr = pendingListing?.mobile || '';

    // Verify valid Indian prefix first
    if (!/^[6-9]\d{9}$/.test(mobileStr.trim())) {
      setLoading(false);
      setOtpError(lang === 'bn' 
        ? "⚠️ ভুল মোবাইল নম্বর! বিজ্ঞাপন প্রকাশ করতে সঠিক ১০ সংখ্যার মোবাইল নম্বর ব্যবহার করুন।" 
        : "⚠️ Invalid mobile number used! Please go back and correct your 10-digit mobile number.");
      return;
    }

    // Direct Instant Publish (Bypassing OTP verification as requested)
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setOtpSent(false);
      setOtpError(null);
      onPaymentSuccess(`pay_mock_${Math.random().toString(36).substring(7).toUpperCase()}`);
    }, 800);
  };

  const handleOtpInput = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);

    // Focus previous/next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`sp-otp-${index + 1}`);
      nextInput?.focus();
    } else if (!value && index > 0) {
      const prevInput = document.getElementById(`sp-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const entered = otpInput.join('');
    if (entered.length !== 6) {
      setOtpError(t.otpTooShort);
      return;
    }

    setLoading(true);
    const mobileStr = pendingListing?.mobile || '';

    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileStr.trim(), code: entered })
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
        setOtpError(data.error || t.otpWrong);
        setOtpInput(['', '', '', '', '', '']);
        document.getElementById('sp-otp-0')?.focus();
        return;
      }

      // Success! 
      setSuccess(true);
      setOtpError(null);
      onPaymentSuccess(`pay_mock_${Math.random().toString(36).substring(7).toUpperCase()}`);
    } catch {
      setLoading(false);
      setOtpError("Failed to communicate with verification firewall.");
    }
  };

  return (
    <div id="seller-pay-view" className="w-full max-w-xl mx-auto py-6 md:py-10 relative">
      {/* Elegant Header Card Box with unified controls and navigation */}
      {!success && (
        <div className="bg-slate-900/90 border border-yellow-500/25 rounded-3xl p-5 md:p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="space-y-1 text-left">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              🔒 {t.spTitle}
            </h2>
            <p className="text-xs md:text-sm text-yellow-500/70 font-bold tracking-wide">
              {t.spSub}
            </p>
          </div>
          <button 
            onClick={onBack}
            className="self-start sm:self-auto shrink-0 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-teal-950 border border-yellow-500/30 hover:border-yellow-400 rounded-xl px-5 py-2.5 text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer select-none group uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>{lang === 'bn' ? 'হোমে যান' : 'Go Home'}</span>
          </button>
        </div>
      )}

      {success ? (
        /* Success message window */
        <div className="bg-gradient-to-br from-green-900/60 to-emerald-950/60 border-2 border-yellow-500 rounded-3xl p-6 md:p-8 text-center shadow-2xl mt-8">
          <div className="w-14 h-14 bg-yellow-500/10 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            🎉
          </div>
          <h4 className="text-lg md:text-xl font-extrabold text-yellow-500 mb-2">
            {t.spTyTitle}
          </h4>
          <p className="text-xs md:text-sm text-white/80 leading-relaxed mb-6 font-medium">
            {t.spTyText}
          </p>
          <button 
            onClick={onBack}
            className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-400 border-none rounded-xl text-teal-950 font-extrabold text-sm shadow-md transition-all active:scale-95 cursor-pointer leading-none"
          >
            {lang === 'bn' ? 'হোমে ফিরে যান' : 'Go to Home'}
          </button>
        </div>
      ) : (
        /* Payment and OTP Panels */
        <div className="space-y-6 mt-6">
          
          <div className="bg-slate-900/95 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="text-center mb-6">
              <span className="text-xs font-extrabold text-green-400 bg-green-950/80 border border-green-500/20 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                {t.spPayLabel}
              </span>
              <div className="text-5xl font-black text-yellow-500 my-2">
                ₹0 <span className="text-2xl text-white/40 line-through font-normal ml-2">₹499</span>
              </div>
              <p className="text-xs text-white/60 font-semibold max-w-xs mx-auto">
                {lang === 'bn' 
                  ? 'সম্পত্তির বিজ্ঞাপন তালিকাভুক্তি ১০০% ফ্রী সার্ভিস!' 
                  : 'Property advertisement and directory listing is 100% FREE!'}
              </p>
            </div>

            <div className="text-center bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-4.5 mb-6 text-xs text-yellow-500 font-bold leading-relaxed">
              🎯 {lang === 'bn' 
                ? '১০০% ফ্রি সার্ভিস অফার: কোনো ক্রেডিট কার্ড বা পেমেন্ট ফি দেয়ার প্রয়োজন নেই।' 
                : '100% Free Service: No credit cards or registration payments required.'}
            </div>

            {/* Simulated Checkout Button */}
            {!otpSent && (
              <button
                onClick={startPayment}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-40 rounded-2xl text-teal-950 text-sm md:text-base font-extrabold cursor-pointer hover:shadow-lg active:scale-97 transition-all leading-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-teal-950 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{t.spPayBtn}</span>
                  </>
                )}
              </button>
            )}

            <div className="text-[10px] text-white/40 text-center mt-3 font-semibold">
              {t.spSecure}
            </div>
          </div>

          {/* OTP panel */}
          {otpSent && (
            <div className="bg-slate-950/90 border-2 border-yellow-500/50 rounded-3xl p-5 md:p-6 shadow-xl animate-scale-up">
              <div className="text-center mb-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                  🔐
                </div>
                <h3 className="text-sm md:text-base font-black text-white">{t.spOtpTitle}</h3>
                <p className="text-xs text-white/60 max-w-sm mx-auto mt-1 leading-relaxed font-semibold">
                  {t.spOtpSubtitle}
                </p>
              </div>

              {/* Secure Tip Alert Hint */}
              <div className="bg-white/5 border border-white/5 text-[11px] sm:text-xs text-yellow-500/90 p-3 rounded-2xl mb-4 text-center font-bold">
                {t.spOtpHint}
              </div>



              {otpError && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold rounded-xl p-2.5 mb-4 text-center">
                  {otpError}
                </div>
              )}

              {/* Code blocks inputs */}
              <div className="flex gap-2.5 justify-center mb-4">
                {otpInput.map((val, idx) => (
                  <input
                    key={idx}
                    id={`sp-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpInput(e.target.value, idx)}
                    className="w-10 h-12 sm:w-12 sm:h-14 bg-black/55 border-2 border-white/10 focus:border-yellow-500 rounded-xl text-center text-xl font-black text-white outline-none focus:bg-black/80 focus:shadow-inner transition-all animate-fade-in"
                  />
                ))}
              </div>

              {/* Live Countdown Resend Code Section like Amazon / Flipkart */}
              <div className="text-center pb-3">
                {canResendOtp ? (
                  <button
                    onClick={handleResendOtp}
                    className="text-xs text-yellow-500 hover:text-yellow-400 font-extrabold underline cursor-pointer transition-colors"
                  >
                    {lang === 'bn' ? '🔄 আবার ওটিপি পাঠান (Resend OTP)' : '🔄 Resend OTP Code'}
                  </button>
                ) : (
                  <span className="text-[11px] text-white/40 font-semibold">
                    {lang === 'bn' 
                      ? `ওটিপি আবার পাঠান ${otpTimer} সেকেন্ডের মধ্যে` 
                      : `Resend OTP in ${otpTimer}s`}
                  </span>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 border-none rounded-2xl text-teal-950 text-sm md:text-base font-black cursor-pointer hover:shadow-lg active:scale-97 transition-all leading-none flex items-center justify-center gap-1.5"
              >
                <Key className="w-4 h-4" />
                <span>{t.spOtpSubmit}</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
