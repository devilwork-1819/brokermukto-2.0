import { Globe, Phone, Shield } from 'lucide-react';
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
}

export default function Header({
  lang,
  onToggleLang,
  onOpenContact,
  onOpenSuggestion,
  onGoHome,
  onGoAdmin
}: HeaderProps) {
  const t = T[lang];

  return (
    <header id="app-header" className="sticky top-0 z-50 bg-teal-950/75 backdrop-blur-md border-b border-yellow-500/25 px-1.5 py-3 sm:px-4 md:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand Logo & Title */}
        <div 
          onClick={onGoHome} 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group"
        >
          <img 
            src={logoImg}
            alt="BrokerMukto"
            referrerPolicy="no-referrer"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-yellow-500/50 shadow-md group-hover:scale-105 transition-transform shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-500 to-yellow-300 bg-clip-text text-transparent leading-none">
              {t.appName}
            </span>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-yellow-500/60 font-semibold tracking-wider uppercase mt-1">
              BROKER MUKTO
            </span>
          </div>
        </div>

        {/* Buttons / Controls - Language & Contact adjusted slide left, Suggestions on right */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-1 font-sans">
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 bg-yellow-500/10 border border-yellow-500/40 text-yellow-500 rounded-full text-[11px] sm:text-xs font-semibold cursor-pointer select-none tracking-wide hover:bg-yellow-500/25 active:scale-95 transition-all shrink-0"
            title={lang === 'bn' ? 'ভাষা পরিবর্তন (English)' : 'Change Language (বাংলা)'}
          >
            <Globe className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span>{t.langBtn}</span>
          </button>
          
          <button
            onClick={onOpenContact}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 rounded-full text-[11px] sm:text-xs font-semibold cursor-pointer select-none tracking-wide active:scale-95 transition-all shrink-0"
          >
            <Phone className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span className="hidden xs:inline sm:inline">{lang === 'bn' ? 'যোগাযোগ' : 'Contact'}</span>
            <span className="xs:hidden text-[10px] font-bold">{lang === 'bn' ? 'ফোন' : 'Call'}</span>
          </button>

          <button
            onClick={onOpenSuggestion}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/45 text-amber-300 rounded-full text-[11px] sm:text-xs font-semibold cursor-pointer select-none tracking-wide active:scale-95 transition-all shrink-0"
            title={lang === 'bn' ? 'পরামর্শ বা মতামত দিন' : 'Give suggestion'}
          >
            <span className="text-xs">💡</span>
            <span className="hidden xs:inline sm:inline">{lang === 'bn' ? 'মতামত' : 'Suggest'}</span>
            <span className="xs:hidden text-[10px] font-bold">{lang === 'bn' ? 'মতামত' : 'Idea'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
