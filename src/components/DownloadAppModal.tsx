import { X, Smartphone, Sparkles, AlertCircle } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
}

export default function DownloadAppModal({ isOpen, onClose, lang }: DownloadAppModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      id="download-app-modal-overlay" 
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in animate-duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-yellow-500/40 rounded-3xl p-6 relative shadow-2xl animate-scale-up"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
          id="close-download-app-btn"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Icon Badge */}
          <div className="w-14 h-14 bg-gradient-to-tr from-yellow-500 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20 animate-pulse">
            <Smartphone className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-yellow-500 tracking-tight flex items-center justify-center gap-2" id="download-app-header">
              <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400/30" />
              {lang === 'bn' ? 'BrokerMukto মোবাইল অ্যাপ' : 'BrokerMukto Mobile App'}
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-block">
              {lang === 'bn' ? 'শীঘ্রই আসছে' : 'Official Application'}
            </p>
          </div>

          {/* THE REQUESTED 'Coming Soon' message in italic font */}
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 w-full">
            <p className="text-lg font-black text-white italic tracking-wide" id="coming-soon-message">
              Coming Soon...
            </p>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              {lang === 'bn' 
                ? 'আমরা অ্যান্ড্রয়েড ও আইওএস (iOS) এর জন্য অফিশিয়াল মোবাইল অ্যাপ্লিকেশন তৈরি করছি! দালালমুক্ত সম্পত্তি কেনাবেচা ও তাত্ক্ষণিক হোয়াটসঅ্যাপ নোটিফিকেশন আরও সহজে আপনার আঙুলের ডগায়।' 
                : 'We are actively crafting our native Android & iOS mobile applications! Soon, you will experience seamless direct owner interactions and real-time WhatsApp alert triggers directly from your phone.'}
            </p>
          </div>

          {/* Placeholders for Future Download Links (Easy for the developer to replace) */}
          <div className="w-full space-y-2 pt-2">
            <div className="text-[10px] text-white/40 font-bold tracking-wider uppercase">
              {lang === 'bn' ? 'ডাউনলোড লিঙ্ক (ভবিষ্যত ব্যবহারের জন্য):' : 'Application Download Links (Placeholder):'}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Google Play Button */}
              <a
                href="#google-play-download"
                onClick={(e) => {
                  e.preventDefault();
                  alert(lang === 'bn' ? 'অ্যাপটি গুগল প্লে স্টোরে আপলোড করার পর এখানে আপনার রিয়েল প্লে স্টোর লিঙ্কটি বসিয়ে দিন।' : 'Once published, replace this anchor href with your actual Google Play Store URL.');
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-white/10 rounded-xl transition-all hover:scale-[1.02] text-left cursor-pointer"
              >
                <span className="text-lg">🤖</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-white/50 leading-none font-bold uppercase">{lang === 'bn' ? 'পাওয়া যাবে' : 'GET IT ON'}</span>
                  <span className="text-xs text-white font-black leading-tight truncate">Google Play</span>
                </div>
              </a>

              {/* App Store Button */}
              <a
                href="#app-store-download"
                onClick={(e) => {
                  e.preventDefault();
                  alert(lang === 'bn' ? 'অ্যাপটি অ্যাপল অ্যাপ স্টোরে আপলোড করার পর এখানে আপনার রিয়েল অ্যাপ স্টোর লিঙ্কটি বসিয়ে দিন।' : 'Once published, replace this anchor href with your actual Apple App Store URL.');
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-white/10 rounded-xl transition-all hover:scale-[1.02] text-left cursor-pointer"
              >
                <span className="text-lg">🍏</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] text-white/50 leading-none font-bold uppercase">{lang === 'bn' ? 'পাওয়া যাবে' : 'DOWNLOAD ON'}</span>
                  <span className="text-xs text-white font-black leading-tight truncate">App Store</span>
                </div>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-yellow-500/50 pt-2 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'bn' ? 'দালালমুক্ত ক্রেতা-বিক্রেতা সংযোগের একমাত্র স্বাধীন প্ল্যাটফর্ম।' : 'Direct owner real estate search with 0% broker fees.'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
