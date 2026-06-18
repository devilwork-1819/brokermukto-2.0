import { T, TYPE_MAP, UNIT_MAP, FACING_MAP, WB_DISTRICTS, WB_DISTRICTS_BN } from '../translations';
import { Listing } from '../types';
import { MapPin, ArrowRight, Eye, Home, Sprout, Store, Trees, Waves, Building } from 'lucide-react';

interface AutoScrollFeedProps {
  lang: 'bn' | 'en';
  listings: Listing[];
  onViewProperty: (query: string) => void;
}

export default function AutoScrollFeed({ lang, listings, onViewProperty }: AutoScrollFeedProps) {
  const t = T[lang];

  // Filters out sold properties so that only available properties are highlight-scrolled
  const availableListings = listings.filter(item => !item.sold);

  // Fallback if there are no properties listed yet
  if (availableListings.length === 0) {
    return (
      <div id="live-scroll-feed" className="max-w-xl mx-auto bg-black/25 border border-white/10 rounded-3xl p-6 text-center space-y-3 shadow-lg">
        <p className="text-sm font-semibold text-white/50">
          {lang === 'bn' 
            ? '📺 লাইভ বিজ্ঞাপন ফিড শূন্য' 
            : '📺 Live Listing Stream Empty'}
        </p>
        <p className="text-xs text-white/45">
          {lang === 'bn' 
            ? 'নতুন কোনো সম্পত্তি বিক্রির লিস্টিং এখনও নেই। প্রথম বিজ্ঞাপনটি প্রকাশ করতে "সম্পত্তি বিক্রি করুন" বোতামে চাপুন।' 
            : 'Be the first one to post a broker-free direct listing in West Bengal! Click "Sell Property" above.'}
        </p>
      </div>
    );
  }

  // To make vertical marquee loop infinitely and smoothly, we clone the items list
  // Duplicating items to make sure the list fills the scroll window height securely
  const scrollItems = [...availableListings, ...availableListings, ...availableListings];

  // Dynamic animation duration based on quantity of listings to maintain a steady speed
  const animationDuration = Math.max(12, availableListings.length * 6.5);

  const getTypeLabel = (v: string) => {
    return lang === 'en' ? (TYPE_MAP[v] || v) : v;
  };

  const getUnitLabel = (v: string) => {
    return lang === 'en' ? (UNIT_MAP[v] || v) : v;
  };

  const getDistrictLabel = (districtName: string) => {
    if (lang === 'bn') {
      const idx = WB_DISTRICTS.indexOf(districtName);
      return idx !== -1 ? WB_DISTRICTS_BN[idx] : districtName;
    }
    return districtName;
  };

  return (
    <div id="live-scroll-feed" className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-yellow-500/20 rounded-2.5xl p-4 flex flex-col justify-between shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 gap-3 relative overflow-hidden group min-h-[320px] md:min-h-0">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-yellow-500 opacity-60"></div>
      
      <div className="space-y-1.5 text-center">
        <div className="flex items-center justify-center gap-2 border-b border-white/5 pb-2">
          <span className="text-xs animate-ping">📺</span>
          <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider text-center">
            {lang === 'bn' ? 'লাইভ ফিড' : 'LIVE UPDATE OF LISTED PROPERTY'}
          </h3>
        </div>
        <p className="text-[10px] text-white/50 leading-tight font-medium text-center">
          {lang === 'bn' 
            ? '👇 যেকোনো কার্ড বা বোতামে চাপুন সরাসরি বিস্তারিত এবং মালিকের নম্বর দেখতে' 
            : '👇 Tap any card below to jump to full details and unlock the owner contact'}
        </p>
      </div>

      {/* Frame Container holding the list */}
      <div className="relative h-[190px] md:h-[220px] overflow-hidden rounded-2xl bg-black/35 border border-white/5 shadow-inner">
        
        {/* Soft edge fade overlays for premium high-end visual tactile depth */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/55 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/55 to-transparent z-10 pointer-events-none"></div>

        {/* CSS Marquee Injector */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scrollUpMarquee {
            0% { transform: translateY(0); }
            100% { transform: translateY(-33.3333%); }
          }
          .animate-scroll-up-feed {
            animation: scrollUpMarquee ${animationDuration}s linear infinite;
          }
          .animate-scroll-up-feed:hover {
            animation-play-state: paused;
          }
        `}} />

        {/* Live Scroll Feed Scroller */}
        <div className="animate-scroll-up-feed flex flex-col gap-3.5 p-3 cursor-grab active:cursor-grabbing">
          {scrollItems.map((item, index) => {
            const isResidential = item.type === 'বাসস্থান';
            const isAgri = item.type === 'কৃষি জমি';
            
            return (
              <div
                key={`${item.id}-${index}`}
                onClick={() => onViewProperty(item.po)}
                className="bg-white/5 hover:bg-white/10 hover:border-yellow-500/35 border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-black/75 cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden"
              >
                {/* Glow hint under active items */}
                <div className="absolute -top-12 -right-12 w-20 h-20 bg-yellow-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-yellow-500/10"></div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    {(() => {
                      const lowerType = (item.type || '').toLowerCase();
                      let badgeStyle = 'bg-amber-500/20 text-amber-300 border border-amber-500/10';
                      let IconComponent = <Building className="w-2.5 h-2.5" />;

                      if (lowerType === 'বাসস্থান' || lowerType === 'residential' || lowerType === 'house') {
                        badgeStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/10';
                        IconComponent = <Home className="w-2.5 h-2.5" />;
                      } else if (lowerType === 'কৃষি জমি' || lowerType === 'agricultural' || lowerType === 'plot' || lowerType === 'land') {
                        badgeStyle = 'bg-green-500/20 text-green-300 border border-green-500/10';
                        IconComponent = <Sprout className="w-2.5 h-2.5" />;
                      } else if (lowerType === 'বাণিজ্যিক' || lowerType === 'commercial' || lowerType === 'shop' || lowerType === 'store') {
                        badgeStyle = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/10';
                        IconComponent = <Store className="w-2.5 h-2.5" />;
                      } else if (lowerType === 'বাগান' || lowerType === 'garden') {
                        badgeStyle = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/10';
                        IconComponent = <Trees className="w-2.5 h-2.5" />;
                      } else if (lowerType === 'পুকুর সহ' || lowerType === 'with pond' || lowerType === 'pond') {
                        badgeStyle = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/10';
                        IconComponent = <Waves className="w-2.5 h-2.5" />;
                      }

                      return (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md leading-none ${badgeStyle}`}>
                          {IconComponent}
                          <span>{getTypeLabel(item.type)}</span>
                        </span>
                      );
                    })()}
                    
                    <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-yellow-500 shrink-0" />
                      <span>{item.po}, {getDistrictLabel(item.district)}</span>
                    </h4>
                    
                    {item.landmark && (
                      <p className="text-[10px] text-white/50 font-semibold pl-4">
                        📍 {item.landmark}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-black text-yellow-400 font-mono tracking-normal">
                      ₹{item.price}
                    </div>
                    <div className="text-[10px] text-white/40 font-bold">
                      {item.size} {getUnitLabel(item.unit)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] font-bold">
                  <span className="text-yellow-500/75 uppercase tracking-widest text-[9px] flex items-center gap-1 font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400"></span>
                    </span>
                    <span>{lang === 'bn' ? 'সরাসরি বিজ্ঞাপন' : 'Direct Listing'}</span>
                  </span>
                  
                  <span className="text-yellow-500/80 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all flex items-center gap-1 font-extrabold uppercase tracking-wide">
                    <span>{lang === 'bn' ? 'বিশদ বিবরণ দেখুন' : 'Quick View'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
