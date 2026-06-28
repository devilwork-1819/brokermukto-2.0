import React, { useState, useRef } from 'react';
import { ArrowLeft, Search, Phone, MapPin, Coins, BookOpen } from 'lucide-react';
import { T, WB_DISTRICTS, WB_DISTRICTS_BN, DISTRICT_POS, DISTRICT_POS_BN } from '../translations';
import { BuyerLead } from '../types';
import OTPVerificationModal from './OTPVerificationModal';

interface BuyerFormViewProps {
  lang: 'bn' | 'en';
  onBack: () => void;
  onSubmit: (lead: Omit<BuyerLead, 'date' | 'source'>) => void;
}

export default function BuyerFormView({ lang, onBack, onSubmit }: BuyerFormViewProps) {
  const t = T[lang];

  // State managers
  const [mobile, setMobile] = useState('');
  const [po, setPo] = useState('');
  const [customPo, setCustomPo] = useState('');
  const [district, setDistrict] = useState('');
  const [budget, setBudget] = useState('');
  const [type, setType] = useState('Residential');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);
  const [agreedLegal, setAgreedLegal] = useState(false);

  // Refs for focusing mandatory fields from the top down
  const mobileRef = useRef<HTMLInputElement>(null);
  const districtRef = useRef<HTMLSelectElement>(null);
  const poRef = useRef<HTMLSelectElement>(null);
  const customPoRef = useRef<HTMLInputElement>(null);
  const disclaimerRef = useRef<HTMLInputElement>(null);
  const legalRef = useRef<HTMLInputElement>(null);

  // OTP triggers
  const [isOtpOpen, setIsOtpOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const missing: { field: string; ref: React.RefObject<any>; msg: string }[] = [];

    if (!mobile || !mobile.trim()) {
      missing.push({
        field: 'mobile',
        ref: mobileRef,
        msg: t.bError
      });
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      missing.push({
        field: 'mobile',
        ref: mobileRef,
        msg: lang === 'bn' 
          ? "⚠️ ভুল মোবাইল নম্বর! সঠিক ১০ সংখ্যার মোবাইল নম্বর ব্যবহার করুন।" 
          : "⚠️ Invalid mobile number used! Please enter a valid 10-digit mobile number starting with 6-9."
      });
    }

    if (!district) {
      missing.push({
        field: 'district',
        ref: districtRef,
        msg: lang === 'bn' ? '⚠️ অনুগ্রহ করে একটি জেলা নির্বাচন করুন।' : '⚠️ Please select a district.'
      });
    }

    if (!po) {
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

    if (missing.length > 0) {
      setErrorMsg(missing[0].msg);
      if (missing[0].ref.current) {
        missing[0].ref.current.focus();
        missing[0].ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 3500);
      return;
    }

    if (!agreedDisclaimer) {
      setErrorMsg(lang === 'bn' ? '⚠️ এগিয়ে যাওয়ার আগে দায়িত্বমুক্তির ঘোষণা ও শর্তাবলীতে সম্মত হন।' : '⚠️ Please agree to the disclaimer terms below to proceed.');
      if (disclaimerRef.current) {
        disclaimerRef.current.focus();
        disclaimerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    if (!agreedLegal) {
      setErrorMsg(lang === 'bn' ? '⚠️ এগিয়ে যাওয়ার আগে অনুগ্রহ করে ডীড ও আইনি যাচাইকরণের সম্মতি স্বীকার করুন।' : '⚠️ Please agree to the deeds and legal due-diligence verification terms to proceed.');
      if (legalRef.current) {
        legalRef.current.focus();
        legalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    setIsOtpOpen(true);
  };

  const handleOtpVerified = () => {
    onSubmit({
      mobile,
      po: po === 'Others' ? customPo : po,
      district,
      budget,
      type,
      remarks
    });
  };

  return (
    <div id="buyer-form-view" className="w-full py-6 md:py-10">
      {/* Elegant Header Card Box with unified controls and navigation */}
      <div className="bg-slate-900 border-2 border-yellow-500/20 rounded-3xl p-5 md:p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-[0_12px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.5)] transition-all duration-300 relative overflow-hidden backdrop-blur-md hover:-translate-y-0.5">
        <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            🔍 {t.bTitle}
          </h2>
          <p className="text-xs md:text-sm text-yellow-500/70 font-bold tracking-wide">
            {t.bFormSub}
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

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-100 rounded-2xl p-4 mb-6 text-sm font-bold animate-pulse">
          {errorMsg}
        </div>
      )}

      {/* Buyer Fee Details Banner */}
      <div className="bg-slate-900/95 border-2 border-white/5 rounded-3xl p-5 mb-8 text-center relative overflow-hidden shadow-xl hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-xl pointer-events-none"></div>
        <div className="text-xs md:text-sm text-white/95 font-extrabold mb-4 flex items-center justify-center gap-1.5 uppercase tracking-wider">
          <span>📋</span>
          <span>{t.bFeeTitle}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-4 border-t border-b border-white/5 py-4">
          <div className="text-center border-r border-white/5 pr-4">
            <div className="text-2xl font-black text-green-400">{t.bFeeFree}</div>
            <div className="text-[10px] text-white/40 font-bold uppercase mt-1 tracking-wider">{t.bFeeFreeSub}</div>
          </div>
          <div className="text-center pl-4">
            <div className="text-2xl font-black text-yellow-500">₹99</div>
            <div className="text-[10px] text-white/40 font-bold uppercase mt-1 tracking-wider">{t.bFeeUnlockSub}</div>
          </div>
        </div>
        
        <div className="text-[10px] text-white/35 font-semibold">
          {t.bFeeNote}
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900/95 border-2 border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-5 shadow-2xl hover:shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-yellow-500/10 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mobile input */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1">
              <Phone className="w-3 h-3 text-yellow-500" />
              <span>{t.bMobLbl} <span className="text-red-500 font-extrabold">*</span></span>
            </label>
            <input 
              ref={mobileRef}
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={t.bMobPh}
              className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
            />
          </div>

          {/* District select */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-yellow-500" />
              <span>{t.bDistrictLbl} <span className="text-red-500 font-extrabold">*</span></span>
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Post Office (PO) */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-yellow-500" />
              <span>{t.bPoLbl} <span className="text-red-500 font-extrabold">*</span></span>
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

          {/* Budget input */}
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-500" />
              <span>{t.bBudgetLbl}</span>
            </label>
            <input 
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={t.bBudgetPh}
              className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
            />
          </div>
        </div>

        {/* Property Type select */}
        <div>
          <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-yellow-500" />
            <span>{t.bTypeLbl}</span>
          </label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer transition-colors"
          >
            {t.bTypeOpts.map((opt) => (
              <option key={opt} value={opt} className="bg-teal-900 text-white">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Remarks / Message */}
        <div>
          <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center gap-1">
            📝
            <span>{t.bRemarksLbl}</span>
          </label>
          <textarea 
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={t.bRemarksPh}
            rows={3}
            className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors resize-none filter-select-thumb"
          />
        </div>

        {/* Disclaimer Confirmation */}
        <div className="space-y-4">
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4.5 mt-2">
            <div className="text-xs text-yellow-500 font-extrabold flex items-center gap-1.5 mb-2">
              <span>⚠️</span>
              <span>{lang === 'bn' ? 'সতর্কীকরণ ও ক্রেতা শর্তাবলী' : 'Warning & Buyer Terms'}</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed font-semibold mb-3">
              {lang === 'bn' 
                ? 'আমি সম্মত হচ্ছি যে BrokerMukto-তে সম্পত্তির প্রয়োজনীয়তা চাওয়া এবং বিক্রেতাদের সাথে আমার যাবতীয় লেনদেন সম্পূর্ণরূপে আমার নিজস্ব ঝুঁকিতে সম্পাদিত হবে। এই প্ল্যাটফর্ম জমির কাগজ যাচাই করে না।'
                : 'I agree that seeking properties on BrokerMukto.com and any sub-sequent deals are conducted entirely at my own risk. The platform does not verify titles or legal documents of listed properties.'}
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
                {lang === 'bn' ? 'আমি এই ঘোষণা এবং দায়িত্বমুক্তির শর্তাবলীতে সম্মত আছি' : 'I accept the disclaimer and release of liability'}
              </span>
            </label>
          </div>

          {/* Legal Due diligence property compliance check checklist */}
          <div className="bg-blue-500/5 border border-blue-500/25 rounded-2xl p-4.5">
            <div className="text-xs text-blue-400 font-extrabold flex items-center gap-1.5 mb-2">
              <span>⚖️</span>
              <span>{lang === 'bn' ? 'আইনি সত্যতা যাচাইকরণ প্রতিশ্রুতি' : 'Legal Property Title Due Diligence Affirmation'}</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed font-semibold mb-3">
              {lang === 'bn' 
                ? 'আমি প্রতিশ্রুতি দিচ্ছি যে যেকোনো সম্পত্তি ক্রয়, অ্যাডভান্স বা বায়নানামা করার পূর্বে নিজস্ব আইনি পরামর্শদাতার দ্বারা জমির মূল দলিলপত্র (Deeds), মিউটেশন, সার্চিং রিপোর্ট এবং WBRERA (প্রযোজ্য ক্ষেত্রে) আইনানুগ স্থিতি পুঙ্খানুপুঙ্খভাবে খতিয়ে দেখবো।'
                : 'I certify that prior to entering any property transaction, advance payment, or sale agreement, I will conduct complete independent legal title searches, mutation checks, deed verification, and WBRERA registration validation (where applicable) via certified legal professionals.'}
            </p>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input 
                ref={legalRef}
                type="checkbox"
                checked={agreedLegal}
                onChange={(e) => setAgreedLegal(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-white/20 accent-blue-500 outline-none cursor-pointer mt-0.5"
              />
              <span className="text-xs font-black text-white/80 hover:text-white transition-colors">
                {lang === 'bn' ? 'আমি আইনগত যাচাইকরণের ব্যাপারে সম্পূর্ণ সম্মত ও সচেতন আছি' : 'I accept full responsibility for conducting legal due diligence'}
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 mt-4 bg-yellow-500 hover:bg-yellow-400 border-2 border-yellow-300/30 rounded-2xl text-teal-950 text-sm md:text-base font-black cursor-pointer transform hover:-translate-y-[4px] active:translate-y-[2px] transition-all duration-150 leading-none flex items-center justify-center gap-1.5 shadow-[0_6px_0_#b45309] hover:shadow-[0_10px_0_#b45309] active:shadow-[0_2px_0_#b45309] will-change-transform"
        >
          <Search className="w-4 h-4" />
          <span>{t.bSubmit}</span>
        </button>
      </form>

      <OTPVerificationModal 
        isOpen={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        mobile={mobile}
        name="Buyer"
        lang={lang}
        onSuccess={handleOtpVerified}
      />
    </div>
  );
}
