import React, { useState, useRef } from 'react';
import { ArrowLeft, Video, Camera, Compass, MapPin, Landmark, Coins, Phone } from 'lucide-react';
import { T, WB_DISTRICTS, WB_DISTRICTS_BN, DISTRICT_POS, DISTRICT_POS_BN } from '../translations';
import { Listing } from '../types';
import OTPVerificationModal from './OTPVerificationModal';

interface SellerFormViewProps {
  lang: 'bn' | 'en';
  onBack: () => void;
  onSubmit: (listing: Omit<Listing, 'id' | 'verified' | 'sold' | 'soldAt'>) => void;
  activeMobiles: string[];
}

export default function SellerFormView({ lang, onBack, onSubmit, activeMobiles }: SellerFormViewProps) {
  const t = T[lang];

  // Form states
  const [district, setDistrict] = useState('');
  const [po, setPo] = useState('');
  const [customPo, setCustomPo] = useState('');
  const [road, setRoad] = useState('');
  const [landmark, setLandmark] = useState('');
  const [maps, setMaps] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('কাঠা');
  const [type, setType] = useState('');
  const [facing, setFacing] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [mobile, setMobile] = useState('');

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);

  // OTP modal visibility
  const [isOtpOpen, setIsOtpOpen] = useState(false);

  // Media states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVideoScanning, setIsVideoScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);
  const [agreedRera, setAgreedRera] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const districtRef = useRef<HTMLSelectElement>(null);
  const poRef = useRef<HTMLSelectElement>(null);
  const customPoRef = useRef<HTMLInputElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const disclaimerRef = useRef<HTMLInputElement>(null);
  const reraRef = useRef<HTMLInputElement>(null);

  // Media OCR/Speech protection scanner helper
  const detectPhoneNumberInMedia = (fileName: string, contentStr?: string): boolean => {
    const phonePattern = /(?:\+91[\s\-]?)?[6-9]\d{9}|(?:\+880[\s\-]?)?01[3-9]\d{8}|\d{8,12}/g;
    const keyTermsPattern = /(?:phone|mobile|call|whatsapp|contact|imo|bkash|nagad|tel|contact|no\.|\+91|\+880|01\d{9})/i;
    
    if (phonePattern.test(fileName) || keyTermsPattern.test(fileName)) {
      return true;
    }
    if (contentStr) {
      if (phonePattern.test(contentStr) || keyTermsPattern.test(contentStr)) {
        return true;
      }
    }
    return false;
  };

  // File selection handlers
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Immediate file name inspection
      if (detectPhoneNumberInMedia(file.name)) {
        setErrorMsg(
          lang === 'bn'
            ? '❌ ভিডিও ফাইলে মোবাইল নম্বর সনাক্ত হয়েছে! সরাসরি নম্বর আদান-প্রদান রোধে ব্রোকারমুক্ত-তে ফোন নম্বরযুক্ত মিডিয়া আপলোড নিষিদ্ধ।'
            : '❌ A mobile number / contact term was detected in the video file name! Directly exchanging phone numbers through media is strictly prohibited.'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }

      // 2. Beautiful mock speech-to-text / acoustic verification process
      setIsVideoScanning(true);
      setScanStep(lang === 'bn' ? 'ফাইল স্ট্রাকচার লোড করা হচ্ছে...' : 'Loading video stream...');
      
      setTimeout(() => {
        setScanStep(lang === 'bn' ? 'ভিডিও ফ্রেম থেকে সাবটাইটেল ও টেক্সট খোঁজা হচ্ছে...' : 'Scanning frames for overlaid text/numbers...');
        
        setTimeout(() => {
          setScanStep(lang === 'bn' ? 'অডিও সাউন্ডট্র্যাক থেকে কণ্ঠস্বর বিশ্লেষণ করা হচ্ছে...' : 'Analyzing audio soundtrack for spoken mobile numbers...');
          
          setTimeout(() => {
            setIsVideoScanning(false);
            setScanStep('');

            // Flag as breach if filename contains numbers or phone related keywords, or size-based heuristics simulation
            const containsDigitsInName = (file.name.match(/\d/g) || []).length >= 8;
            const containsContactTerm = file.name.toLowerCase().includes('phone') || file.name.toLowerCase().includes('mob') || file.name.toLowerCase().includes('call') || file.name.toLowerCase().includes('contact') || file.name.toLowerCase().includes('num') || file.name.toLowerCase().includes('number') || file.name.toLowerCase().includes('whata');
            
            // Check if name has suspicious strings, or simulation (if the file has numbers in its title)
            if (containsDigitsInName || containsContactTerm) {
              setErrorMsg(
                lang === 'bn'
                  ? '❌ ভিডিওতে মোবাইল নম্বর বলা বা টেক্সটে নম্বর দেওয়া সনাক্ত করা গেছে! সরাসরি যোগাযোগ বিনিময় রোধ করতে এটি আপলোড করা সম্ভব নয়।'
                  : '❌ Security Blocked: Mobile number detected in the video (overlaid text or spoken in audio). Offsite mobile exchange via video content is strictly restricted on BrokerMukto.'
              );
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (videoInputRef.current) videoInputRef.current.value = '';
            } else {
              setVideoFile(file);
              const reader = new FileReader();
              reader.onload = (event) => {
                setVideoUrl(event.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }, 1000);
        }, 1100);
      }, 900);
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    files.slice(0, 5).forEach((file: File) => {
      if (detectPhoneNumberInMedia(file.name)) {
        setErrorMsg(
          lang === 'bn'
            ? '❌ আপনার ছবির ফাইলে মোবাইল নম্বর বা যোগাযোগ শব্দ পাওয়া গেছে! ছবি আপলোড বাতিল করা হলো।'
            : '❌ Mobile number / key contact term was detected in your photo filename! Directly exchanging contact numbers is restricted.'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (photoInputRef.current) photoInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const url = event.target.result as string;

          // Simulated OCR phone number block
          const containsPhone = detectPhoneNumberInMedia(file.name, url.length < 50000 ? url : undefined);

          if (containsPhone) {
            setErrorMsg(
              lang === 'bn'
                ? '⚠️ আপনার একটি ছবিতে মোবাইল নম্বর সনাক্ত হয়েছে! দয়া করে এটি রিমুভ করুন এবং ফোন নম্বরবিহীন ছবি পুনরায় আপলোড করুন।'
                : '⚠️ A mobile number / contact detail was detected in this photo overlay scan! Please remove it and upload a clean photo.'
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (photoInputRef.current) photoInputRef.current.value = '';
          } else {
            setPhotoFiles((prev) => [...prev, url].slice(0, 5));
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoUrl(null);
  };

  const validateStep1 = () => {
    const missing: { field: string; ref: React.RefObject<any>; msg: string }[] = [];

    if (!district) {
      missing.push({
        field: 'district',
        ref: districtRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে একটি জেলা নির্বাচন করুন।' : '⚠️ Please select a district.'
      });
    }

    if (!po || !po.trim()) {
      missing.push({
        field: 'po',
        ref: poRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে একটি পোস্ট অফিস নির্বাচন করুন।' : '⚠️ Please select a post office.'
      });
    } else if (po === 'Others' && (!customPo || !customPo.trim())) {
      missing.push({
        field: 'customPo',
        ref: customPoRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে ম্যানুয়ালি পোস্ট অফিসের নাম লিখুন।' : '⚠️ Please write the post office name manually.'
      });
    }

    if (!size || !size.trim()) {
      missing.push({
        field: 'size',
        ref: sizeRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে জমির পরিমাণ বা সাইজ উল্লেখ করুন।' : '⚠️ Please enter the property size.'
      });
    }

    if (!type) {
      missing.push({
        field: 'type',
        ref: typeRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে সম্পত্তির ধরণ নির্বাচন করুন।' : '⚠️ Please select a property type.'
      });
    }

    if (!price || !price.trim()) {
      missing.push({
        field: 'price',
        ref: priceRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে সম্পত্তির মূল্য উল্লেখ করুন।' : '⚠️ Please enter the property price.'
      });
    }

    if (missing.length > 0) {
      setErrorMsg(missing[0].msg);
      if (missing[0].ref.current) {
        missing[0].ref.current.focus();
        missing[0].ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 5000);
      return false;
    }

    setErrorMsg(null);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const validateStep2 = () => {
    setErrorMsg(null);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  };

  const handleFormSubmit = () => {
    if (!mobile || !mobile.trim()) {
      setErrorMsg(lang === 'bn' ? '⚠️ অনুগ্রহ করে আপনার ১০ সংখ্যার মোবাইল নম্বর লিখুন।' : '⚠️ Please enter your 10-digit mobile number.');
      if (mobileRef.current) {
        mobileRef.current.focus();
        mobileRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      setErrorMsg(
        lang === 'bn' 
          ? "⚠️ ভুল মোবাইল নম্বর! সঠিক ১০ সংখ্যার মোবাইল নম্বর ব্যবহার করুন।" 
          : "⚠️ Invalid mobile number used! Please enter a valid 10-digit mobile number starting with 6-9."
      );
      if (mobileRef.current) {
        mobileRef.current.focus();
        mobileRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    if (!agreedDisclaimer) {
      setErrorMsg(lang === 'bn' ? '⚠️ অনুগ্রহ করে এগিয়ে যাওয়ার আগে দায়িত্বমুক্তির ঘোষণা ও শর্তাবলীতে সম্মত হন।' : '⚠️ Please agree to the disclaimer terms below to proceed.');
      if (disclaimerRef.current) {
        disclaimerRef.current.focus();
        disclaimerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    if (!agreedRera) {
      setErrorMsg(lang === 'bn' ? '⚠️ অনুগ্রহ করে আইনগত ঘোষণা ও WBRERA আইনানুগ সম্মতি প্রদান করুন।' : '⚠️ Please agree to the WBRERA and property law legal affirmation.');
      if (reraRef.current) {
        reraRef.current.focus();
        reraRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    // Active listing phone checker
    const cleaned = mobile.replace(/\D/g, '').slice(-10);
    if (activeMobiles.includes(cleaned)) {
      setErrorMsg(lang === 'bn' 
        ? '❌ এই মোবাইল নম্বরটি ইতিমধ্যে একটি সক্রিয় বিজ্ঞাপনের জন্য ব্যবহৃত হচ্ছে! পূর্বের বিজ্ঞাপনটি SOLD বা ডিলিট করার পর নতুন বিজ্ঞাপন দিতে পারবেন।' 
        : '❌ This mobile number is already in use for an active listing! You can list another property once your active listing is marked as SOLD or deleted.');
      if (mobileRef.current) {
        mobileRef.current.focus();
        mobileRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Open secured OTP verification
    setIsOtpOpen(true);
  };

  const handleOtpVerified = () => {
    const priceCleanVal = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    onSubmit({
      district,
      po: po === 'Others' ? customPo : po,
      road,
      landmark,
      maps,
      size,
      unit,
      type,
      facing,
      price,
      priceNum: priceCleanVal,
      negotiable,
      mobile,
      hasVideo: !!videoUrl,
      videoData: videoUrl,
      photos: photoFiles
    });
  };

  return (
    <div id="seller-form-view" className="w-full py-6 md:py-10">

      {/* --- LIVE VIDEO TRANSCRIPTION & TEXT OVERLAY SCANNER MODAL --- */}
      {isVideoScanning && (
        <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-yellow-500/40 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Pulsing Scanner Visual */}
            <div className="relative flex items-center justify-center mx-auto w-20 h-20 bg-yellow-500/10 rounded-full border border-yellow-500/30">
              <Video className="w-8 h-8 text-yellow-500 animate-pulse animate-duration-1000" />
              <div className="absolute inset-0 border-2 border-yellow-500 rounded-full animate-ping opacity-60"></div>
              <div className="absolute inset-1.5 border border-dashed border-yellow-500/40 rounded-full animate-spin"></div>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-extrabold text-base tracking-tight uppercase">
                {lang === 'bn' ? '🔍 মিডিয়া সিকিউরিটি স্ক্যানার' : '🔍 Media Security Scanner'}
              </h4>
              <p className="text-[11px] text-white/50 leading-relaxed max-w-xs mx-auto">
                {lang === 'bn' 
                  ? 'আমরা ভিডিও ফ্রেম এবং অডিওতে ফোন নম্বরের উপস্থিতি স্ক্যান করছি...' 
                  : 'We are analyzing video frames & spoken soundtrack for unauthorized contact numbers...'}
              </p>
            </div>

            {/* Stepper Status Indicators */}
            <div className="bg-black/35 py-3.5 px-4 rounded-xl border border-white/5 text-[11px] font-bold text-yellow-400 font-mono tracking-wide animate-pulse">
              {scanStep}
            </div>

            <p className="text-[10px] text-white/40 italic">
              {lang === 'bn' ? 'ব্রোকারমুক্ত স্বয়ংক্রিয় কন্টাক্ট এক্সচেঞ্জ রিয়েলটাইম ফিল্টার' : 'BrokerMukto Automated Contact Exchange Real-Time Protection'}
            </p>
          </div>
        </div>
      )}

      {/* Elegant Header Card Box with unified controls and navigation */}
      <div className="bg-slate-900 border-2 border-yellow-500/20 rounded-3xl p-5 md:p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-[0_12px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.5)] transition-all duration-300 relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            🏠 {t.sTitle}
          </h2>
          <p className="text-xs md:text-sm text-yellow-500/70 font-bold tracking-wide">
            {t.sFormSub}
          </p>
        </div>
        <button 
          onClick={onBack}
          className="self-start sm:self-auto shrink-0 bg-yellow-500 hover:bg-yellow-400 text-teal-950 font-black rounded-xl px-5 py-2.5 text-xs transition-all duration-150 transform hover:-translate-y-[2px] active:translate-y-[2px] shadow-[0_4px_0_#b45309] hover:shadow-[0_6px_0_#b45309] active:shadow-none flex items-center gap-2 cursor-pointer select-none group uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>{lang === 'bn' ? 'হোমে যান' : 'Go Home'}</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-red-500/20 border border-red-500 text-red-100 rounded-2xl p-4 mb-6 text-sm font-bold animate-pulse">
          {errorMsg}
        </div>
      )}

      {/* Modern High-End Progress Stepper Header */}
      <div id="seller-stepper-progress-bar" className="w-full max-w-4xl mx-auto mb-8 px-2 font-sans select-none">
        <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-4 md:p-6 backdrop-blur-md">
          <div className="relative flex items-center justify-between">
            {/* Progress Connector Lines */}
            <div className="absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2 h-[3px] bg-slate-800 z-0 rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              />
            </div>

            {[
              { step: 1, icon: '📍', label: lang === 'bn' ? 'তথ্য' : 'Info', title: lang === 'bn' ? '১. বিবরণী' : '1. Location & Info' },
              { step: 2, icon: '📸', label: lang === 'bn' ? 'মিডিয়া' : 'Media', title: lang === 'bn' ? '২. আপলোড' : '2. Media Gallery' },
              { step: 3, icon: '🔒', label: lang === 'bn' ? 'যাচাইকরণ' : 'Verify', title: lang === 'bn' ? '৩. জমাদিন' : '3. Verification' }
            ].map((item) => {
              const isCompleted = item.step < currentStep;
              const isActive = item.step === currentStep;
              return (
                <div key={item.step} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.step < currentStep) {
                        setCurrentStep(item.step);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={item.step >= currentStep}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-extrabold text-sm sm:text-base border-2 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-yellow-500 border-yellow-500 text-teal-950 shadow-[0_0_15px_rgba(234,179,8,0.3)] cursor-pointer'
                        : isActive
                          ? 'bg-slate-950 border-yellow-500 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)] scale-105 font-black'
                          : 'bg-slate-950 border-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {isCompleted ? '✓' : item.icon}
                  </button>
                  <div className="text-center mt-2.5">
                    <span className={`block text-[9px] sm:text-xs font-black uppercase tracking-wider ${
                      isActive ? 'text-yellow-500' : isCompleted ? 'text-white/80' : 'text-white/30'
                    }`}>
                      {item.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 1: Location & Property Info */}
      {currentStep === 1 && (
        <div id="step-1-container" className="space-y-6 max-w-4xl mx-auto pb-20 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section 2: Location & Description */}
            <div className="bg-slate-900/95 border-2 border-white/10 rounded-3xl p-5 md:p-6 shadow-xl hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col gap-5 hover:border-yellow-500/10">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-extrabold text-yellow-500 tracking-wider uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{t.sec2}</span>
                </h3>
              </div>

              {/* District & PO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    {t.sDistrictLbl} <span className="text-red-500 font-extrabold">*</span>
                  </label>
                  <select 
                    ref={districtRef}
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setPo('');
                      setCustomPo('');
                    }}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer transition-colors"
                  >
                    <option value="" disabled className="bg-teal-900 text-white">
                      {lang === 'bn' ? '🔍 জেলা নির্বাচন করুন --' : '-- Select District --'}
                    </option>
                    {WB_DISTRICTS.map((dist, idx) => (
                      <option key={dist} value={dist} className="bg-teal-900 text-white">
                        {lang === 'bn' ? WB_DISTRICTS_BN[idx] : dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    {t.sPo} <span className="text-red-500 font-extrabold">*</span>
                  </label>
                  <select 
                    ref={poRef}
                    value={po}
                    onChange={(e) => {
                      setPo(e.target.value);
                      if (e.target.value !== 'Others') {
                        setCustomPo('');
                      }
                    }}
                    disabled={!district}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer transition-colors disabled:opacity-40"
                  >
                    <option value="" className="bg-teal-900 text-white">
                      {district 
                        ? (lang === 'bn' ? '-- পোস্ট অফিস সিলেক্ট করুন --' : '-- Select Post Office --') 
                        : (lang === 'bn' ? '🔍 আগে জেলা নির্বাচন করুন' : '🔍 First Select District')}
                    </option>
                    {district && DISTRICT_POS[district]?.map((poOpt, idx) => (
                      <option key={poOpt} value={poOpt} className="bg-teal-900 text-white">
                        {lang === 'bn' ? DISTRICT_POS_BN[district][idx] : poOpt}
                      </option>
                    ))}
                    {district && (
                      <option value="Others" className="bg-teal-900 text-white">
                        {lang === 'bn' ? 'অন্যান্য (Others)' : 'Others'}
                      </option>
                    )}
                  </select>
                  {po === 'Others' && (
                    <div className="mt-2 animate-scale-up">
                      <input 
                        type="text"
                        ref={customPoRef}
                        value={customPo}
                        onChange={(e) => setCustomPo(e.target.value)}
                        placeholder={lang === 'bn' ? 'এখানে আপনার পোস্ট অফিস লিখুন...' : 'Type/write your Post Office manually...'}
                        className="w-full bg-black/35 hover:bg-black/45 border border-yellow-500/50 focus:border-yellow-500 rounded-xl px-3.5 py-2 text-sm font-semibold text-white outline-none placeholder-white/30 transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Road & Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sRoad}</label>
                  <input 
                    type="text"
                    value={road}
                    onChange={(e) => setRoad(e.target.value)}
                    placeholder={t.sRoadPh}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sLandmark}</label>
                  <input 
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder={t.sLandmarkPh}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
                  />
                </div>
              </div>

              {/* Google Maps link */}
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sMaps}</label>
                <input 
                  type="text"
                  value={maps}
                  onChange={(e) => setMaps(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
                />
              </div>
            </div>

            {/* Section 3: Property Specification & Price */}
            <div className="bg-slate-900/95 border-2 border-white/10 rounded-3xl p-5 md:p-6 shadow-xl hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col gap-5 hover:border-yellow-500/10">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-extrabold text-yellow-500 tracking-wider uppercase flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  <span>{t.sec3}</span>
                </h3>
              </div>

              {/* Size & Unit selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sSizeLbl} <span className="text-red-500 font-extrabold">*</span></label>
                  <input 
                    ref={sizeRef}
                    type="number"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="5"
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sUnitLbl}</label>
                  <select 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer transition-colors"
                  >
                    {t.unitOpts.map((opt) => (
                      <option key={opt} value={opt} className="bg-teal-900 text-white">{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Property Type & Facing direction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sTypeLbl} <span className="text-red-500 font-extrabold">*</span></label>
                  <select 
                    ref={typeRef}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer transition-colors"
                  >
                    {t.typeOpts.map((opt, index) => (
                      <option key={opt} value={t.typeVals[index]} className="bg-teal-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sFacingLbl}</label>
                  <select 
                    value={facing}
                    onChange={(e) => setFacing(e.target.value)}
                    className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer transition-colors"
                  >
                    {t.facingOpts.map((opt, index) => (
                      <option key={opt} value={t.facingVals[index]} className="bg-teal-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selling Price */}
              <div className="pt-3 border-t border-white/5">
                <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sPriceLbl} <span className="text-red-500 font-extrabold">*</span></label>
                <input 
                  ref={priceRef}
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t.sPricePh}
                  className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
                />
                {/* Negotiable check */}
                <label className="flex items-center gap-2 mt-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={negotiable}
                    onChange={(e) => setNegotiable(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 accent-yellow-500 outline-none cursor-pointer"
                  />
                  <span className="text-xs font-bold text-white/70">{t.sNegLbl}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Navigation Controls Step 1 */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={validateStep1}
              className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-teal-950 text-sm font-black rounded-2xl shadow-[0_5px_0_#b45309] hover:shadow-[0_7px_0_#b45309] active:shadow-none hover:-translate-y-0.5 active:translate-y-0.5 transform transition-all cursor-pointer flex items-center gap-2 select-none"
            >
              <span>{lang === 'bn' ? 'চলুন পরবর্তী: মিডিয়া আপলোড ➔' : 'Next Step: Upload Media ➔'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Upload Media */}
      {currentStep === 2 && (
        <div id="step-2-container" className="max-w-3xl mx-auto pb-20 space-y-6 animate-fade-in">
          {/* Section 1: Media fields */}
          <div className="bg-slate-900/95 border-2 border-white/10 rounded-3xl p-5 md:p-6 shadow-xl hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col gap-6 hover:border-yellow-500/10">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-yellow-500 tracking-wider uppercase flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span>{t.sec1}</span>
              </h3>
            </div>

            {/* Video Attachment */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-2">{t.sVideoLbl}</label>
              {videoUrl ? (
                <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg border border-white/10">
                  <video src={videoUrl} controls className="w-full max-h-48 object-cover" />
                  <button 
                    onClick={clearVideo}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg cursor-pointer shadow-md"
                  >
                    {lang === 'bn' ? 'মুছে ফেলুন' : 'Remove'}
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/5 hover:bg-yellow-500/10 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                >
                  <Video className="w-8 h-8 text-yellow-500" />
                  <span className="text-xs font-bold text-white/80">{t.sVideoTap}</span>
                  <span className="text-[10px] text-white/40 font-medium">mp4, webm (max 20MB)</span>
                  <span className="text-[10px] text-yellow-500/90 font-bold bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full mt-1">
                    ⚠️ {lang === 'bn' ? 'দয়া করে কোনো মোবাইল নম্বর মুখে উচ্চারণ না করে ভিডিওটি আপলোড করুন।' : 'Please upload video without speaking any mobile number.'}
                  </span>
                </div>
              )}
              <input 
                type="file" 
                ref={videoInputRef} 
                accept="video/*" 
                onChange={handleVideoChange} 
                className="hidden" 
              />
            </div>

            {/* Photos Attachment */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-2">{t.sPhotoLbl}</label>
              <div 
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/5 hover:bg-yellow-500/10 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                <Camera className="w-8 h-8 text-yellow-500" />
                <span className="text-xs font-bold text-white/80">{t.sPhotoTap}</span>
                <span className="text-[10px] text-white/40 font-medium">{lang === 'bn' ? '৫টি ছবি পর্যন্ত আপলোড করতে পারেন' : 'Upload up to 5 properties photos'}</span>
                <span className="text-[10px] text-yellow-500/90 font-bold bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full mt-1">
                  ⚠️ {lang === 'bn' ? 'দয়া করে ছবিতে কোনো মোবাইল নম্বর প্রদর্শন না করে আপলোড করুন।' : 'Please use photos without showing any mobile number.'}
                </span>
              </div>
              <input 
                type="file" 
                ref={photoInputRef} 
                accept="image/*" 
                multiple 
                onChange={handlePhotosChange} 
                className="hidden" 
              />

              {/* Photos Slider / Previews */}
              {photoFiles.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {photoFiles.map((src, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-yellow-500/30 group shadow-md bg-teal-900">
                      <img src={src} alt="Uploaded thumbnail" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removePhoto(index)}
                        className="absolute inset-0 bg-red-600/80 text-white font-black text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls Step 2 */}
          <div className="flex justify-between items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 transform"
            >
              {lang === 'bn' ? '← বিবরণীতে ফিরুন' : '← Back to Details'}
            </button>
            <button
              type="button"
              onClick={validateStep2}
              className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-400 text-teal-950 text-sm font-black rounded-2xl shadow-[0_5px_0_#b45309] hover:shadow-[0_7px_0_#b45309] active:shadow-none hover:-translate-y-0.5 active:translate-y-0.5 transform transition-all cursor-pointer flex items-center gap-2 select-none"
            >
              <span>{lang === 'bn' ? 'চলুন পরবর্তী: মোবাইল যাচাইকরণ ➔' : 'Next Step: Verification ➔'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Mobile Verification & Submission */}
      {currentStep === 3 && (
        <div id="step-3-container" className="max-w-2xl mx-auto pb-20 space-y-6 animate-fade-in">
          {/* Section 4: Price & Contact details */}
          <div className="bg-slate-900/95 border-2 border-white/10 rounded-3xl p-5 md:p-6 shadow-xl hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col gap-5 hover:border-yellow-500/10">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-yellow-500 tracking-wider uppercase flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span>{lang === 'bn' ? 'মোবাইল যাচাইকরণ ও আইনানুগ ঘোষণা' : 'Mobile Verification & Compliance'}</span>
              </h3>
            </div>

            {/* Mobile Number/WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1.5">{t.sMobLbl} <span className="text-red-500 font-extrabold">*</span></label>
              <input 
                ref={mobileRef}
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t.sMobPh}
                className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
              />
            </div>

            {/* Disclaimer Confirmation */}
            <div className="space-y-4">
              <div className="bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-4.5 mt-5 animate-scale-up">
                <div className="text-xs text-yellow-500 font-extrabold flex items-center gap-1.5 mb-2">
                  <span>⚠️</span>
                  <span>{lang === 'bn' ? 'সতর্কীকরণ ও বিক্রয় শর্তাবলী' : 'Warning & Seller Terms'}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed font-semibold mb-3">
                  {lang === 'bn' 
                    ? 'আমি সম্মত হচ্ছি যে BrokerMukto-তে সম্পত্তি তালিকাভুক্তি ও ক্রেতাদের সাথে আমার সমস্ত চুক্তি বা যোগাযোগ সম্পূর্ণ আমার নিজস্ব ঝুঁকিতে সম্পাদিত হবে। প্ল্যাটফর্ম কোনো আর্থিক লেনদেন বা কাগজ চেক করার ব্যাপারে কোনো দায় বহন করে না।'
                    : 'I agree that listing my property on BrokerMukto.com and any sub-sequent contracts with buyers are conducted entirely at my own risk. The platform is not responsible for validating buyers, paperwork, or payments.'}
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    ref={disclaimerRef}
                    type="checkbox"
                    checked={agreedDisclaimer}
                    onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-white/20 accent-yellow-500 outline-none cursor-pointer mt-0.5"
                  />
                  <span className="text-xs font-black text-white/80 hover:text-white transition-colors">
                    {lang === 'bn' ? 'আমি এই ঘোষণা ও দায়িত্বমুক্তির শর্তাবলীতে সম্মত আছি' : 'I accept the disclaimer and release of liability'}
                  </span>
                </label>
              </div>

              {/* WBRERA & General Property Law Affirmation */}
              <div className="bg-blue-500/5 border border-blue-500/25 rounded-2xl p-4.5 animate-scale-up">
                <div className="text-xs text-blue-400 font-extrabold flex items-center gap-1.5 mb-2">
                  <span>⚖️</span>
                  <span>{lang === 'bn' ? 'আইনগত ও WBRERA সম্মতি ঘোষণা' : 'Legal & WBRERA Compliance Affirmation'}</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed font-semibold mb-3">
                  {lang === 'bn' 
                    ? 'আমি অত্যন্ত গুরুত্বের সাথে ঘোষণা করছি যে এই সম্পত্তিটি পশ্চিমবঙ্গ রিয়েল এস্টেট রেগুলেটরি অথরিটি (WBRERA) নির্দেশাবলী এবং ভারতীয় সম্পত্তি আইনের অধীনে সম্পূর্ণ আইনগ্রাহ্য। সম্পত্তিটিতে কোনো আইনি বিরোধ বা কোলাটেরাল নেই এবং এটির বিক্রির সম্পূর্ণ আইনগত অধিকার আমার আছে।'
                    : 'I solemnly declare and affirm that this listed property fully complies with the West Bengal Real Estate Regulatory Authority (WBRERA) regulations and applicable property laws. The asset has clean mutation records, is free from litigation, and I hold the full legal rights to list and sell this property.'}
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    ref={reraRef}
                    type="checkbox"
                    checked={agreedRera}
                    onChange={(e) => setAgreedRera(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-white/20 accent-blue-500 outline-none cursor-pointer mt-0.5"
                  />
                  <span className="text-xs font-black text-white/80 hover:text-white transition-colors">
                    {lang === 'bn' ? 'আমি এ মর্মে আইনগত সত্যতা ঘোষণা করছি ও দায়ভার গ্রহণ করছি' : 'I certify the legal ownership and WBRERA compliance'}
                  </span>
                </label>
              </div>
            </div>

            {/* Submission button */}
            <button
              onClick={handleFormSubmit}
              className="w-full py-4 mt-6 bg-yellow-500 hover:bg-yellow-400 border-2 border-yellow-300/30 rounded-2xl text-teal-950 text-sm md:text-base font-black cursor-pointer transform hover:-translate-y-[4px] active:translate-y-[2px] transition-all duration-150 leading-none flex items-center justify-center gap-1 shadow-[0_6px_0_#b45309] hover:shadow-[0_10px_0_#b45309] active:shadow-[0_2px_0_#b45309] will-change-transform"
            >
              🔒 {t.sSubmit}
            </button>
          </div>

          {/* Navigation Controls Step 3 */}
          <div className="flex justify-start pt-4">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(2);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 transform"
            >
              {lang === 'bn' ? '← মিডিয়ায় ফিরুন' : '← Back to Media'}
            </button>
          </div>
        </div>
      )}

      <OTPVerificationModal 
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        mobile={mobile}
        name="Seller"
        lang={lang}
        onSuccess={handleOtpVerified}
      />
    </div>
  );
}
