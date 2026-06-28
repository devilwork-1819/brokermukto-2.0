import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Wallet, FileText, CheckCircle, Percent, ArrowRight } from 'lucide-react';
import { WB_DISTRICTS, WB_DISTRICTS_BN } from '../translations';

interface PropertyToolkitProps {
  lang: 'bn' | 'en';
}

export default function PropertyToolkit({ lang }: PropertyToolkitProps) {
  const [activeTab, setActiveTab] = useState<'stamp' | 'valuation' | 'loan' | 'verify'>('stamp');

  // --- TAB 1: Stamp Duty & Registration state ---
  const [stampValue, setStampValue] = useState<number>(1500000);
  const [isUrban, setIsUrban] = useState<boolean>(true); // Urban vs Rural
  const [gender, setGender] = useState<'male' | 'female' | 'joint'>('male');

  // --- TAB 2: Valuation Estimator state ---
  const [propType, setPropType] = useState<string>('residential');
  const [valDistrict, setValDistrict] = useState<string>('Birbhum');
  const [roadType, setRoadType] = useState<string>('pwd');
  const [propSize, setPropSize] = useState<number>(5);
  const [propUnit, setPropUnit] = useState<string>('katha');
  const [estimationResult, setEstimationResult] = useState<{ low: number; high: number } | null>(null);

  // --- TAB 3: Loan EMI state ---
  const [loanAmount, setLoanAmount] = useState<number>(2000000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [loanTenure, setLoanTenure] = useState<number>(15);
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>(45000);

  // --- TAB 4: Banglarbhumi Verification check list state ---
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
  });
  const [mockDag, setMockDag] = useState<string>('');
  const [mockKhatian, setMockKhatian] = useState<string>('');
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Toggle checklist step
  const toggleStep = (stepKey: string) => {
    setCheckedSteps(prev => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  // Run mock land database search
  const handleMockSearch = () => {
    if (!mockDag.trim() && !mockKhatian.trim()) {
      setVerificationFeedback(
        lang === 'bn' 
          ? '⚠️ অনুগ্রহ করে দাগ নম্বর বা খতিয়ান নম্বর লিখুন!' 
          : '⚠️ Please enter a Plot (Dag) or Khatian number!'
      );
      return;
    }
    const suffix = lang === 'bn' 
      ? ' দাগ/খতিয়ানের বিরুদ্ধে কোনো কোর্টকেস বা ব্যাংক লিয়েন নেই। এটি সুরক্ষিত ও মিউটেশন সম্পন্ন।' 
      : ' Dag/Khatian record registered successfully. Clear ownership history, no bank lien or active land disputes detected.';
    setVerificationFeedback(
      (lang === 'bn' ? '✓ সফলভাবে যাচাই করা হয়েছে! ' : '✓ Search results complete! ') + 
      (mockDag ? `Plot (Dag) #${mockDag} ` : '') + 
      (mockKhatian ? `Khatian #${mockKhatian}` : '') + suffix
    );
  };

  // --- WB Stamp Duty Calculation Logic ---
  const calculateStampDuty = () => {
    const value = stampValue;
    // Registration Fee is exactly 1% of the property market value in West Bengal
    const regFee = Math.round(value * 0.01);
    
    // Stamp Duty Rates in WB:
    // Urban (Municipal): Up to 40L -> Male: 5%, Female: 4%, Joint: 4.5%
    //                  Above 40L -> Male: 6%, Female: 5%, Joint: 5.5%
    // Rural (Panchayat): Up to 40L -> Male: 4%, Female: 3%, Joint: 3.5%
    //                  Above 40L -> Male: 5%, Female: 4%, Joint: 4.5%
    
    let rate = 5;
    const isAbove40L = value > 4000000;

    if (isUrban) {
      if (isAbove40L) {
        if (gender === 'male') rate = 6;
        else if (gender === 'female') rate = 5;
        else rate = 5.5;
      } else {
        if (gender === 'male') rate = 5;
        else if (gender === 'female') rate = 4;
        else rate = 4.5;
      }
    } else {
      // Rural
      if (isAbove40L) {
        if (gender === 'male') rate = 5;
        else if (gender === 'female') rate = 4;
        else rate = 4.5;
      } else {
        if (gender === 'male') rate = 4;
        else if (gender === 'female') rate = 3;
        else rate = 3.5;
      }
    }

    const stampDuty = Math.round((value * rate) / 100);
    const totalCharges = stampDuty + regFee;

    return { rate, stampDuty, regFee, totalCharges };
  };

  const { rate: stampRate, stampDuty, regFee, totalCharges } = calculateStampDuty();

  // --- Real-Estate Valuation Calculation Logic ---
  const calculateValuation = () => {
    // Standard conversion to Decimal unit
    // 1 Katha = 1.65 Decimal (approx in WB)
    // 1 Bigha = 33 Decimal
    // 1 Acre = 100 Decimal
    let convertedInDecimal = propSize;
    if (propUnit === 'katha') {
      convertedInDecimal = propSize * 1.65;
    } else if (propUnit === 'bigha') {
      convertedInDecimal = propSize * 33;
    } else if (propUnit === 'acre') {
      convertedInDecimal = propSize * 100;
    }

    // Base value per decimal based on district tiering
    let districtTierMultiplier = 1.0;
    const highValueDistricts = ['Kolkata', 'North 24 Parganas', 'Howrah', 'Hooghly'];
    const midValueDistricts = ['Paschim Bardhaman', 'Nadia', 'Darjeeling', 'South 24 Parganas', 'Purba Medinipur'];
    
    if (highValueDistricts.includes(valDistrict)) {
      districtTierMultiplier = 2.5;
    } else if (midValueDistricts.includes(valDistrict)) {
      districtTierMultiplier = 1.5;
    } else {
      districtTierMultiplier = 0.9;
    }

    // Base rate per Decimal by property type
    let baseRate = 20000; // Agricultural
    if (propType === 'residential') {
      baseRate = 95000;
    } else if (propType === 'commercial') {
      baseRate = 180500;
    } else if (propType === 'garden') {
      baseRate = 35000;
    } else if (propType === 'pond') {
      baseRate = 25000;
    }

    // Road connecting multiplier
    let roadMultiplier = 1.0;
    if (roadType === 'highway_national') {
      roadMultiplier = 1.8;
    } else if (roadType === 'pwd') {
      roadMultiplier = 1.45;
    } else if (roadType === 'concrete') {
      roadMultiplier = 1.2;
    } else if (roadType === 'moram') {
      roadMultiplier = 1.0;
    } else if (roadType === 'kacha') {
      roadMultiplier = 0.8;
    }

    const calculatedValue = Math.round(convertedInDecimal * baseRate * districtTierMultiplier * roadMultiplier);
    
    // Define a 15% lower and upper bounds
    const low = Math.round(calculatedValue * 0.88);
    const high = Math.round(calculatedValue * 1.12);

    return { low, high };
  };

  useEffect(() => {
    const values = calculateValuation();
    setEstimationResult(values);
  }, [propType, valDistrict, roadType, propSize, propUnit]);

  // --- Loan EMI Calculator Logic ---
  const calculateEMI = () => {
    const P = loanAmount;
    const r = (interestRate / 12) / 100;
    const n = loanTenure * 12;

    const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) || 0;
    const totalRepayment = emi * n;
    const totalInterest = totalRepayment - P;

    const principalPercent = Math.round((P / totalRepayment) * 100) || 0;
    const interestPercent = 100 - principalPercent;

    // Loan eligibility: generally EMI should not exceed 45% of monthly net income
    const maxSuggestedEMI = Math.round((Number(monthlyIncome) || 0) * 0.45);
    const passesAffordability = emi <= maxSuggestedEMI;

    return { emi, totalRepayment, totalInterest, principalPercent, interestPercent, maxSuggestedEMI, passesAffordability };
  };

  const emiMetrics = calculateEMI();

  // Helper formatting INR
  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const maxVal = Math.max(50000000, stampValue || 0);

  // Convert real stampValue to visual slider percentage (0 to 100)
  const valToSlider = (val: number): number => {
    const currentMax = Math.max(50000000, val);
    if (!val || val <= 0) return 0;
    if (val <= 5000000) {
      // Map 0 - 50 Lakh to 0% - 33.333%
      return (val / 5000000) * (100 / 3);
    }
    if (val <= 10000000) {
      // Map 50 Lakh - 1 Crore to 33.333% - 66.666%
      return (100 / 3) + ((val - 5000000) / (10000000 - 5000000)) * (100 / 3);
    }
    // Map 1 Crore - currentMax to 66.666% - 100%
    return (200 / 3) + ((val - 10000000) / (currentMax - 10000000)) * (100 / 3);
  };

  // Convert visual slider percentage (0 to 100) to real stampValue
  const sliderToVal = (slider: number): number => {
    const currentMax = Math.max(50000000, stampValue);
    let val = 0;
    if (slider <= 0) {
      val = 0;
    } else if (slider <= (100 / 3)) {
      // Map 0 - 33.333 to 0 - 50 Lakh
      const ratio = slider / (100 / 3);
      val = ratio * 5000000;
    } else if (slider <= (200 / 3)) {
      // Map 33.333 - 66.666 to 50 Lakh - 1 Crore
      const ratio = (slider - (100 / 3)) / (100 / 3);
      val = 5000000 + ratio * (10000000 - 5000000);
    } else {
      // Map 66.666 - 100 to 1 Crore - currentMax
      const ratio = (slider - (200 / 3)) / (100 / 3);
      val = 10000000 + ratio * (currentMax - 10000000);
    }
    // Round to nearest 50k if below 10 Lakh, otherwise round to nearest 1 Lakh (100,000)
    if (val < 1000000) {
      return Math.round(val / 50000) * 50000;
    }
    return Math.round(val / 100000) * 100000;
  };

  return (
    <section id="premium-property-toolkit" className="bg-[#C0DD73] border border-[#a6c359] rounded-2.5xl p-4 sm:p-5 md:p-6 shadow-md relative overflow-hidden text-slate-900 font-sans max-w-[1650px] mx-auto w-full transition-all">
      {/* Background graphic elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-black/10 pb-4.5 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/40 text-[#1e3a12] rounded-xl border border-black/5">
            <Calculator className="w-5 sm:w-6 h-5 sm:h-6" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
              {lang === 'bn' ? 'স্মার্ট সম্পত্তি টুলকিট ও ক্যালকুলেটর' : 'Smart Property Toolkit & Utility Hub'}
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-800 font-extrabold pb-0.5">
              {lang === 'bn' ? 'দলিল খরচ, বাজার দর এবং লোন যোগ্যতা যাচাই করার নির্ভরযোগ্য মাধ্যম' : 'Calculate stamp duty, estimate land value, calculate EMI & verify land deeds'}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white/30 p-1 rounded-xl border border-black/5">
          <button
            onClick={() => setActiveTab('stamp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1 ${
              activeTab === 'stamp' ? 'bg-[#b0cc61] border border-[#9db355] text-[#1e3a12] shadow-sm' : 'text-slate-750 hover:text-slate-950 hover:bg-white/10'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'স্ট্যাম্প ডিউটি' : 'Stamp Duty'}</span>
          </button>
          <button
            onClick={() => setActiveTab('valuation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1 ${
              activeTab === 'valuation' ? 'bg-[#b0cc61] border border-[#9db355] text-[#1e3a12] shadow-sm' : 'text-slate-750 hover:text-slate-950 hover:bg-white/10'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'বাজার দর' : 'Valuation'}</span>
          </button>
          <button
            onClick={() => setActiveTab('loan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1 ${
              activeTab === 'loan' ? 'bg-[#b0cc61] border border-[#9db355] text-[#1e3a12] shadow-sm' : 'text-slate-750 hover:text-slate-950 hover:bg-white/10'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ইএমআই' : 'Loan EMI'}</span>
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none flex items-center gap-1 ${
              activeTab === 'verify' ? 'bg-[#b0cc61] border border-[#9db355] text-[#1e3a12] shadow-sm' : 'text-slate-750 hover:text-slate-950 hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'মূল দলিল যাচাই' : 'Deed Verify'}</span>
          </button>
        </div>
      </div>

      {/* TABS CONTENT PANELS */}
      
      {/* TAB 1: Stamp Duty & Registration */}
      {activeTab === 'stamp' && (
        <div id="stamp-duty-tab" className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch animate-fade-in">
          {/* Inputs */}
          <div className="md:col-span-7 bg-black/35 border border-white/5 p-4 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2 pb-2 border-b border-white/5">
                <label className="text-xs font-extrabold text-white/80">
                  {lang === 'bn' ? 'সম্পত্তির আনুমানিক মূল্য বা সরকারি দর:' : 'Property Valuation or Circle Rate:'}
                </label>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.1)] focus-within:border-yellow-400 focus-within:shadow-[0_0_15px_rgba(234,179,8,0.25)] transition-all">
                    <span className="text-[10px] text-yellow-400 font-extrabold">₹</span>
                    <input
                      type="number"
                      value={stampValue || ''}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        if (valStr === '') {
                          setStampValue(0);
                        } else {
                          const val = Number(valStr);
                          setStampValue(isNaN(val) ? 0 : val);
                        }
                      }}
                      className="w-28 bg-transparent text-xs font-black text-yellow-400 outline-none text-right font-mono"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-[11px] font-black text-sky-400 flex items-center gap-1">
                    <span>✨ {lang === 'bn' ? 'শব্দে মূল্য:' : 'In Words:'}</span>
                    <span>{formatINR(stampValue)}</span>
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={valToSlider(stampValue || 0)}
                onChange={(e) => setStampValue(sliderToVal(Number(e.target.value)))}
                className="w-full accent-yellow-500 h-1.5 bg-white/10 rounded-lg cursor-pointer transition-all duration-350"
              />
              {/* Perfect horizontal static ticks under the slider */}
              <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-white/40 font-bold mt-2.5 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-white/5 select-none">
                <button type="button" className="hover:text-yellow-400 transition-colors cursor-pointer flex flex-col items-start gap-0.5 focus:outline-none" onClick={() => setStampValue(0)}>
                  <span className="w-0.5 h-1 bg-yellow-400/20"></span>
                  <span>{lang === 'bn' ? '₹০' : '₹0'}</span>
                </button>
                <button type="button" className="hover:text-yellow-400 transition-colors cursor-pointer flex flex-col items-center gap-0.5 focus:outline-none" onClick={() => setStampValue(5000000)}>
                  <span className="w-0.5 h-1 bg-yellow-400/20"></span>
                  <span>{lang === 'bn' ? '₹৫০ লাখ' : '₹50 Lakh'}</span>
                </button>
                <button type="button" className="hover:text-yellow-400 transition-colors cursor-pointer flex flex-col items-center gap-0.5 focus:outline-none" onClick={() => setStampValue(10000000)}>
                  <span className="w-0.5 h-1 bg-yellow-400/20"></span>
                  <span>{lang === 'bn' ? '₹১ কোটি' : '₹1 Cr'}</span>
                </button>
                <button type="button" className="hover:text-yellow-400 transition-colors cursor-pointer flex flex-col items-end gap-0.5 focus:outline-none" onClick={() => setStampValue(50000000)}>
                  <span className="w-0.5 h-1 bg-yellow-400/20"></span>
                  <span>{maxVal > 50000000 ? `${formatINR(maxVal)}+` : (lang === 'bn' ? '₹৫ কোটি+' : '₹5 Crore+')}</span>
                </button>
              </div>
            </div>

            {/* Area Type Option */}
            <div>
              <label className="block text-xs font-bold text-white/80 mb-2">{lang === 'bn' ? 'সম্পত্তিটি কোন এলাকায় অবস্থিত?' : 'Where is the property located?'}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsUrban(true)}
                  className={`p-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer select-none text-center flex flex-col items-center justify-center gap-1 ${
                    isUrban 
                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' 
                      : 'bg-black/20 border-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <span className="text-base">🏢</span>
                  <span>{lang === 'bn' ? 'পৌরসভা / কর্পোরেশন (Urban)' : 'Municipal/Urban Area'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUrban(false)}
                  className={`p-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer select-none text-center flex flex-col items-center justify-center gap-1 ${
                    !isUrban 
                      ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' 
                      : 'bg-black/20 border-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  <span className="text-base">🌾</span>
                  <span>{lang === 'bn' ? 'গ্রাম পঞ্চায়েত এলাকা (Rural)' : 'Gram Panchayat/Rural Area'}</span>
                </button>
              </div>
            </div>

            {/* Buyer Gender */}
            <div>
              <label className="block text-xs font-bold text-white/80 mb-2">{lang === 'bn' ? 'সম্পত্তির প্রথমাংশ বা মূল ক্রেতা কে?' : 'Who is the primary buyer?'}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['male', 'female', 'joint'] as const).map((genderVal) => (
                  <button
                    key={genderVal}
                    type="button"
                    onClick={() => setGender(genderVal)}
                    className={`py-2 px-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer select-none text-center ${
                      gender === genderVal 
                        ? 'bg-yellow-500/15 border-yellow-500 text-yellow-300' 
                        : 'bg-black/20 border-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>
                      {genderVal === 'male' && (lang === 'bn' ? '👨 পুরুষ (Male)' : '👨 Male')}
                      {genderVal === 'female' && (lang === 'bn' ? '👩 মহিলা (Female)' : '👩 Female')}
                      {genderVal === 'joint' && (lang === 'bn' ? '👥 যৌথ (Joint)' : '👥 Joint Buyer')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Outputs / Summary Invoice */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-yellow-500/25 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest border-b border-white/5 pb-2">
              📋 {lang === 'bn' ? 'রেজিস্ট্রেশন ফি ও স্ট্যাম্প ডিউটি হিসাব' : 'Government Fees Breakup'}
            </h4>
            
            <div className="space-y-2.5 my-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">{lang === 'bn' ? 'প্রযোজ্য স্ট্যাম্প ডিউটি হার:' : 'Applicable Stamp Duty Rate:'}</span>
                <span className="font-bold text-white">{stampRate}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">{lang === 'bn' ? 'রেজিস্ট্রেশন চার্জ হার:' : 'Universal Reg Fee Rate:'}</span>
                <span className="font-bold text-white">1%</span>
              </div>
              <div className="border-t border-white/5 my-1" />
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/50">{lang === 'bn' ? 'মোট স্ট্যাম্প ডিউটি ফি:' : 'Stamp Duty Amount:'}</span>
                <span className="font-bold text-white">{formatINR(stampDuty)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/50">{lang === 'bn' ? 'দলিল রেজিস্ট্রেশন ফি:' : 'Registration Fee:'}</span>
                <span className="font-bold text-white">{formatINR(regFee)}</span>
              </div>
              
              <div className="border-t border-yellow-500/10 my-2" />
              <div className="flex justify-between items-center bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                <span className="text-xs font-black text-yellow-500">{lang === 'bn' ? 'মোট সরকারি খরচ:' : 'Total Govt charges:'}</span>
                <span className="text-sm font-black text-yellow-400">{formatINR(totalCharges)}</span>
              </div>
            </div>

            <p className="text-[9px] text-white/40 leading-normal text-center italic bg-black/40 p-2.5 rounded-lg">
              {lang === 'bn' 
                ? 'দ্রষ্টব্য: পশ্চিমবঙ্গের ভূমি ও রাজস্ব দপ্তরের নিয়ম অনুযায়ী (বাজেট ২০২৪ পর্যন্ত সংশোধিত রেট) স্ট্যাম্প ডিউটি গণনা করা হয়েছে। অতিরিক্ত ১% রিবেট নারী ক্রেতাদের ক্ষেত্রে প্রযোজ্য।' 
                : 'Disclaimer: Rates are estimated as per West Bengal IGR rules (Amended till FY 2024-25). For exact assessment, check official e-Registration calculator.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Smart Valuation Estimator */}
      {activeTab === 'valuation' && (
        <div id="property-valuation-tab" className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch animate-fade-in">
          {/* Input block */}
          <div className="md:col-span-7 bg-white border border-black/10 p-4 rounded-2xl space-y-3.5 shadow-sm text-slate-900">
            <div className="grid grid-cols-2 gap-3.5">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">{lang === 'bn' ? 'সম্পত্তির ধরণ:' : 'Property Type'}</label>
                <select
                  value={propType}
                  onChange={(e) => setPropType(e.target.value)}
                  className="w-full bg-slate-100 border border-black/15 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                >
                  <option value="residential">{lang === 'bn' ? 'বাসস্থান / বাস্তু জমি' : 'Residential Land'}</option>
                  <option value="agricultural">{lang === 'bn' ? 'কৃষি জমি / শালি' : 'Agricultural/Shali Land'}</option>
                  <option value="commercial">{lang === 'bn' ? 'বাণিজ্যিক জমি (Commercial)' : 'Commercial Area'}</option>
                  <option value="garden">{lang === 'bn' ? 'বাগান / পতিত জমি' : 'Orchard / Bagan'}</option>
                  <option value="pond">{lang === 'bn' ? 'পুকুর / জলাশয়' : 'Pond / Water body'}</option>
                </select>
              </div>

              {/* District locator */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">{lang === 'bn' ? 'পশ্চিমবঙ্গের জেলা:' : 'Select District'}</label>
                <select
                  value={valDistrict}
                  onChange={(e) => setValDistrict(e.target.value)}
                  className="w-full bg-slate-100 border border-black/15 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                >
                  {WB_DISTRICTS.map((d, index) => (
                    <option key={d} value={d}>
                      {lang === 'bn' ? WB_DISTRICTS_BN[index] : d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Road Connective */}
              <div className="col-span-2">
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">{lang === 'bn' ? 'রাস্তা সংযোগ ব্যবস্থা:' : 'Street/Road Width'}</label>
                <select
                  value={roadType}
                  onChange={(e) => setRoadType(e.target.value)}
                  className="w-full bg-slate-100 border border-black/15 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                >
                  <option value="kacha">{lang === 'bn' ? 'কাঁচা মাটির রাস্তা' : 'Kacha Mud Street'}</option>
                  <option value="moram">{lang === 'bn' ? 'মোরাম বা পিচ গ্রামের রাস্তা' : 'Moram/Village Path'}</option>
                  <option value="concrete">{lang === 'bn' ? 'পঞ্চায়েত ঢালাই / ৪-১২ ফুট রাস্তা' : 'Panchayat Concrete Road'}</option>
                  <option value="pwd">{lang === 'bn' ? 'পিডব্লিউডি বা রাজ্য হাইওয়ে কানেক্ট' : 'PWD/State Highway Connect'}</option>
                  <option value="highway_national">{lang === 'bn' ? 'জাতীয় সড়ক সংলগ্ন (National Highway)' : 'Adjacent National Highway'}</option>
                </select>
              </div>

              {/* Size details */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5">{lang === 'bn' ? 'পরিমাণ:' : 'Size Value'}</label>
                <input
                  type="number"
                  min="1"
                  value={propSize}
                  onChange={(e) => setPropSize(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-100 border border-black/15 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                />
              </div>
            </div>

            {/* Area Unit toggler */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1.5">{lang === 'bn' ? 'পরিমাপের একক:' : 'Measurement Unit'}</label>
              <div className="grid grid-cols-4 gap-2">
                {['katha', 'bigha', 'decimal', 'acre'].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setPropUnit(unit)}
                    className={`py-1.5 px-0.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer select-none text-center uppercase tracking-wide ${
                      propUnit === unit 
                        ? 'bg-emerald-700 border-emerald-600 text-white shadow-sm' 
                        : 'bg-slate-100 border-black/10 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>
                      {unit === 'katha' && (lang === 'bn' ? 'কাঠা' : 'Katha')}
                      {unit === 'bigha' && (lang === 'bn' ? 'বিঘা' : 'Bigha')}
                      {unit === 'decimal' && (lang === 'bn' ? 'ডেসিমাল' : 'Decimal')}
                      {unit === 'acre' && (lang === 'bn' ? 'একর' : 'Acre')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Valuations Estimate result */}
          <div className="md:col-span-5 bg-white border border-[#a6c359] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm text-slate-900">
            <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-black/10 pb-2">
              📈 {lang === 'bn' ? 'আনুমানিক বাজার দর বিবরণ' : 'Estimated Pricing Range'}
            </h4>
            
            {estimationResult && (
              <div className="text-center my-auto space-y-2.5">
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{lang === 'bn' ? 'তথা আনুমানিক যুক্তিগ্রাহ্য পরিসীমা' : 'Flipped Fair Market Range'}</div>
                <div className="text-xl sm:text-2xl font-black text-[#1e3a12] leading-none">
                  {formatINR(estimationResult.low)} - {formatINR(estimationResult.high)}
                </div>
                
                <div className="text-[10px] bg-emerald-600/10 text-emerald-900 px-3 py-1.5 rounded-md inline-block font-black border border-emerald-600/15">
                  {lang === 'bn' ? 'সম্পূর্ণ ব্রোকারেজ বা দালাল মুক্ত এস্টিমেট' : 'Direct Owner - Pure Broker Free Pricing'}
                </div>
              </div>
            )}

            <p className="text-[9px] text-slate-500 leading-normal text-center italic bg-slate-100 p-2 rounded-lg mt-2">
              {lang === 'bn' 
                ? 'দ্রষ্টব্য: এই দরটি পশ্চিমবঙ্গের সংশ্লিষ্ট জেলার গড় জমির মার্কেট ট্রেনঁ, এলাকা প্রকার ও রাস্তার সংযোগ সুবিধার ওপর ভিত্তি করে আনুমানিকভাবে গণনা করা হয়েছে। রেজিস্ট্রি অফিসে ডিড করার আগে সরকারি মৌজা অনুযায়ী সার্কেল রেট মিলিয়ে দেখা বাঞ্ছনীয়।' 
                : 'Note: Property values vary with specific locations, soil classification, mouza boundaries & localized guidelines. Use this as a reference rate.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Loan EMI Calculator */}
      {activeTab === 'loan' && (
        <div id="home-loan-tab" className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch animate-fade-in">
          {/* Inputs Section */}
          <div className="md:col-span-7 bg-black/35 border border-white/5 p-4 rounded-2xl space-y-4">
            {/* Amount */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-white/80">{lang === 'bn' ? 'কাঙ্ক্ষিত লোন বা ঋণের পরিমাণ:' : 'Loan Portfolio Amount:'}</label>
                <span className="text-xs font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">{formatINR(loanAmount)}</span>
              </div>
              <input
                type="range"
                min="100000"
                max="10000000"
                step="50000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-yellow-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Interest */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-white/80">{lang === 'bn' ? 'বার্ষিক সুদের হার (%):' : 'Annual Interest Rate (%):'}</label>
                <span className="text-xs font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">{interestRate}%</span>
              </div>
              <input
                type="range"
                min="6"
                max="15"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full accent-yellow-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Period */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-white/80">{lang === 'bn' ? 'ঋণের সময়সীমা (বছর):' : 'Repayment Period (Years):'}</label>
                <span className="text-xs font-black text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">{loanTenure} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={loanTenure}
                onChange={(e) => setLoanTenure(Number(e.target.value))}
                className="w-full accent-yellow-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Income field to check Eligibility check */}
            <div className="border-t border-white/5 pt-3">
              <label className="block text-xs font-bold text-white/70 mb-1.5">{lang === 'bn' ? 'আপনার মাসিক পরিবারের মোট আয় (₹):' : 'Your Net Monthly Household Income (₹):'}</label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setMonthlyIncome('');
                  } else {
                    const parsed = Number(val);
                    setMonthlyIncome(isNaN(parsed) ? 0 : Math.max(0, parsed));
                  }
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          {/* EMI Output summary panel */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-yellow-500/25 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest border-b border-white/5 pb-2">
              🪙 {lang === 'bn' ? 'মায়াবী কিস্তি ও সুদের হিসাব' : 'EMI Breakup & Affordable Indicator'}
            </h4>
            
            <div className="space-y-3 my-auto">
              {/* EMI display */}
              <div className="text-center">
                <div className="text-[10px] text-white/50 uppercase font-black tracking-wider mb-0.5">{lang === 'bn' ? 'অনুমেয় মাসিক কিস্তি (EMI)' : 'Monthly Installment (EMI)'}</div>
                <div className="text-2xl font-black text-yellow-400">{formatINR(emiMetrics.emi)} <span className="text-xs text-white/40 font-semibold">/ {lang === 'bn' ? 'মাস' : 'mo'}</span></div>
              </div>

              {/* Graphical distribution bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-white/40 font-bold">
                  <span>{lang === 'bn' ? 'আসল:' : 'Principal:'} {emiMetrics.principalPercent}%</span>
                  <span>{lang === 'bn' ? 'মোট সুদ:' : 'Total Interest:'} {emiMetrics.interestPercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full flex overflow-hidden">
                  <div className="bg-yellow-500" style={{ width: `${emiMetrics.principalPercent}%` }}></div>
                  <div className="bg-amber-600" style={{ width: `${emiMetrics.interestPercent}%` }}></div>
                </div>
              </div>

              <div className="text-[10px] text-white/60 space-y-1.5 pt-1.5 border-t border-white/5">
                <div className="flex justify-between">
                  <span>{lang === 'bn' ? 'প্রদেয় মোট সুদ:' : 'Total Interest:'}</span>
                  <span className="font-bold text-white">{formatINR(emiMetrics.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'bn' ? 'সর্বমোট পরিশোধনীয়:' : 'Total Payback Amount:'}</span>
                  <span className="font-bold text-white">{formatINR(emiMetrics.totalRepayment)}</span>
                </div>
              </div>

              {/* Affordability Badge */}
              <div className={`p-2 rounded-xl text-center border text-[10px] font-bold ${
                emiMetrics.passesAffordability 
                  ? 'bg-green-500/10 border-green-500/20 text-green-300' 
                  : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}>
                {emiMetrics.passesAffordability 
                  ? (lang === 'bn' ? '✓ আপনার আয়ের সাপেক্ষে এই ঋণটি পরিশোধযোগ্য।' : '✓ Secure: Affordability looks good for your income stream!') 
                  : (lang === 'bn' ? '⚠️ সতর্কতা: আয়ের অনুপাতে এই কিস্তিটি কিছুটা বেশি!' : '⚠️ Warning: EMI exceeds 45% of your declared income!')
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Banglarbhumi Verification Assistant */}
      {activeTab === 'verify' && (
        <div id="land-verification-tab" className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch animate-fade-in">
          {/* Interactive Deed Verification Assistant */}
          <div className="md:col-span-7 bg-black/35 border border-white/5 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-yellow-500 uppercase tracking-wide flex items-center gap-1.5">
              <span>🛡️</span>
              <span>{lang === 'bn' ? 'সরকারি জমির রেকর্ড ও মিউটেশন ভেরিফিকেশন খাতা' : 'How to Verify Land & Deed Legally?'}</span>
            </h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-semibold">
              {lang === 'bn' 
                ? 'পশ্চিমবঙ্গে জমি কেনার সময় জালিয়াতি এড়াতে সরাসরি এই ৬টি সহজ পদক্ষেপের চেকলিস্ট অনুকরণ করুন:' 
                : 'Follow this robust 6-step verification plan on the official West Bengal Land Portal (Banglarbhumi) to ensure clear titles:'}
            </p>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {[
                { key: 'step1', bn: '১. দাগ ও খতিয়ান নম্বর সংগ্রহ করুন', en: '1. Collect Dag & Khatian details' },
                { key: 'step2', bn: '২. Banglarbhumi পোর্টালে সাবমিট করুন', en: '2. Check status on Banglarbhumi' },
                { key: 'step3', bn: '৩. দাগের মানচিত্র (Plot Map) দেখুন', en: '3. Verify actual Plot Map' },
                { key: 'step4', bn: '৪. পিঠ দলিল (Chain Deeds) পর্যালোচনা', en: '4. Check minimum 30-yr Chain Deeds' },
                { key: 'step5', bn: '৫. রেকর্ড আপডেট / মিউটেশন খতিয়ান', en: '5. Verify Mutation Khaza Records' },
                { key: 'step6', bn: '৬. কোট কেস বা আইনি নোটিশ তল্লাশি', en: '6. Check for pending court cases' },
              ].map((item) => (
                <label 
                  key={item.key} 
                  className={`flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer select-none border border-white/5 ${
                    checkedSteps[item.key] ? 'bg-yellow-500/5 text-yellow-300 border-yellow-500/20' : 'bg-black/20 text-white/70 hover:text-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checkedSteps[item.key]}
                    onChange={() => toggleStep(item.key)}
                    className="w-4 h-4 accent-yellow-500 mt-0.5"
                  />
                  <span className="text-[10px] md:text-xs font-extrabold leading-tight">
                    {lang === 'bn' ? item.bn : item.en}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Mock Dag/Khatian search sandbox */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-yellow-500/25 p-5 rounded-2xl flex flex-col justify-between space-y-3.5">
            <div>
              <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-widest border-b border-white/5 pb-2">
                🔎 {lang === 'bn' ? 'রেকর্ড সত্যতা পরীক্ষা উইজেট' : 'Deed Registry Integrity Tool'}
              </h4>
              <p className="text-[10px] text-white/60 leading-normal mt-2.5 mb-3 font-semibold">
                {lang === 'bn' 
                  ? 'নিরাপত্তা সুবিধার্থে আপনার ক্রয়যোগ্য দাগ বা খতিয়ান নম্বরটি নিচের ফিল্ডে বসিয়ে প্রাথমিক তল্লাশি চালান:' 
                  : 'Test land integrity details by typing in the Plot or Khatian registry values below:'}
              </p>

              {/* Test inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-white/50 uppercase mb-1">{lang === 'bn' ? 'দাগ নম্বর (Plot)' : 'Plot (Dag)'}</label>
                  <input
                    type="text"
                    value={mockDag}
                    onChange={(e) => setMockDag(e.target.value)}
                    placeholder="e.g., 234"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-yellow-500 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-white/50 uppercase mb-1">{lang === 'bn' ? 'খতিয়ান (Khatian)' : 'Khatian'}</label>
                  <input
                    type="text"
                    value={mockKhatian}
                    onChange={(e) => setMockKhatian(e.target.value)}
                    placeholder="e.g., 812"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-yellow-500 text-center font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleMockSearch}
                className="w-full mt-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-teal-950 font-black rounded-lg text-xs cursor-pointer select-none transition-all flex items-center justify-center gap-1 shadow-md"
              >
                <span>🔎</span>
                <span>{lang === 'bn' ? 'তাত্ক্ষণিক ট্রেইল রেকর্ড পরীক্ষা' : 'Conduct Trial Integrity Check'}</span>
              </button>
            </div>

            {/* Results output */}
            {verificationFeedback && (
              <div className="bg-black/50 border border-yellow-500/20 p-2.5 rounded-lg text-[10px] text-yellow-300 font-extrabold leading-relaxed animate-fade-in text-center mt-2">
                {verificationFeedback}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
