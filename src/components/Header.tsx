import { Globe, Phone, Shield, Smartphone } from 'lucide-react';
import { T } from '../translations';
// @ts-ignore
import logoImg from '../assets/images/brokermukto_logo_1781687619316.jpg';

interface HeaderProps {
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onOpenContact: () => void;
  onOpenSuggestion: () => void;
  onGoHome: () => void;
  onGoAdmin: () => void;
  onOpenDownloadApp: () => void;
}

export default function Header({
  lang,
  onToggleLang,
  onOpenContact,
  onOpenSuggestion,
  onGoHome,
  onGoAdmin,
  onOpenDownloadApp
}: HeaderProps) {
  const t = T[lang];

  return (
    <header id="app-header" className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-blue-250/30 px-1.5 py-3 sm:px-4 md:px-6 shadow-sm">
      <div className="max-w-[1650px] mx-auto flex items-center justify-between gap-2.5 sm:gap-4 px-1 sm:px-2">
        {/* Brand Logo & Title */}
        <div 
          onClick={onGoHome} 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group"
        >
          <img 
            src={logoImg}
            alt="BrokerMukto"
            referrerPolicy="no-referrer"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-blue-500/30 shadow-md animate-bounce select-none shrink-0"
            style={{ animationDuration: '3s' }}
          />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-sky-600 to-blue-800 bg-clip-text text-transparent leading-none">
              {t.appName}
            </span>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-600/70 font-semibold tracking-wider uppercase mt-1">
              {lang === 'bn' ? 'BROKER MUKTO' : 'ব্রোকার মুক্তো'}
            </span>
          </div>
        </div>

        {/* Buttons / Controls - Language & Contact adjusted slide left, Suggestions on right */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0 font-sans">
          <button
            onClick={onToggleLang}
            className="flex items-center justify-center gap-1 p-2 sm:px-3 sm:py-1.5 bg-blue-600/10 border border-blue-600/30 text-blue-700 rounded-full text-xs font-black cursor-pointer select-none tracking-wide hover:bg-blue-600/20 active:scale-95 transition-all shrink-0"
            title={lang === 'bn' ? 'ভাষা পরিবর্তন (English)' : 'Change Language (বাংলা)'}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.langBtn}</span>
          </button>

          <button
            onClick={onOpenDownloadApp}
            className="flex items-center justify-center bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-700 rounded-full text-xs font-black cursor-pointer select-none tracking-wide active:scale-95 transition-all shrink-0 p-2 sm:px-3 sm:py-1.5"
            title={lang === 'bn' ? 'অ্যাপ ডাউনলোড করুন (শীঘ্রই আসছে)' : 'Download App (Coming Soon)'}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline ml-1.5">{lang === 'bn' ? 'অ্যাপ ডাউনলোড' : 'Download App'}</span>
          </button>
          
          <button
            onClick={onOpenContact}
            className="flex items-center justify-center bg-sky-600/10 hover:bg-sky-600/20 border border-sky-600/30 text-sky-700 rounded-full text-xs font-black cursor-pointer select-none tracking-wide active:scale-95 transition-all shrink-0 p-2 sm:px-3 sm:py-1.5"
            title={lang === 'bn' ? 'যোগাযোগ করুন' : 'Contact Us'}
          >
            <Phone className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline ml-1.5">{lang === 'bn' ? 'যোগাযোগ' : 'Contact'}</span>
          </button>

          <button
            onClick={onOpenSuggestion}
            className="flex items-center justify-center bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 text-amber-700 rounded-full text-xs font-black cursor-pointer select-none tracking-wide active:scale-95 transition-all shrink-0 p-2 sm:px-3 sm:py-1.5"
            title={lang === 'bn' ? 'মন্তব্য করুন' : 'Leave Comments'}
          >
            <span className="text-xs">💬</span>
            <span className="hidden sm:inline ml-1.5">{lang === 'bn' ? 'মন্তব্য করুন' : 'Leave Comments'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
