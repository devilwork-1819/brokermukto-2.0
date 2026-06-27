import React, { useState, useEffect, useRef } from 'react';
import { T, TYPE_MAP, UNIT_MAP, FACING_MAP, WB_DISTRICTS, WB_DISTRICTS_BN } from '../translations';
import { Listing } from '../types';
import { MapPin, ArrowRight, Eye, Home, Sprout, Store, Trees, Waves, Building, ChevronLeft, ChevronRight } from 'lucide-react';

interface AutoScrollFeedProps {
  lang: 'bn' | 'en';
  listings: Listing[];
  onViewProperty: (query: string) => void;
}

export default function AutoScrollFeed({ lang, listings, onViewProperty }: AutoScrollFeedProps) {
  const t = T[lang];
  const [isPaused, setIsPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const preciseScrollLeftRef = useRef(0);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Filters out sold properties so that only available properties are highlight-scrolled
  const availableListings = listings.filter(item => !item.sold);

  const registerUserActivity = () => {
    setUserInteracted(true);
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    // Auto-scroll resumes after 30 seconds of static/manual state
    activityTimeoutRef.current = setTimeout(() => {
      setUserInteracted(false);
    }, 30000);
  };

  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  // Programmatic smooth auto-scroller
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isPaused || userInteracted || availableListings.length === 0) return;

    // Initialize precise position tracker with current physical scroll position
    preciseScrollLeftRef.current = container.scrollLeft;

    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 30; // 30 pixels per second as requested

    const tick = (time: number) => {
      if (isPaused || userInteracted) return;
      const elapsed = (time - lastTime) / 1000;
      lastTime = time;

      // Safety clamp for extreme frame deltas (e.g. background tab hibernation wake up)
      const maxDelta = Math.min(elapsed * speed, 10);

      if (container) {
        preciseScrollLeftRef.current += maxDelta;

        // Loop threshold check
        const halfWidth = container.scrollWidth / 2;
        if (preciseScrollLeftRef.current >= halfWidth * 1.5) {
          preciseScrollLeftRef.current = preciseScrollLeftRef.current - halfWidth;
        }

        // Assign physical rounded pixel scroll position for hardware rendering
        container.scrollLeft = Math.round(preciseScrollLeftRef.current);
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPaused, userInteracted, availableListings.length]);

  // Fallback if there are no properties listed yet (Placed AFTER all hook declarations)
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

  // Ensure we have enough items to loop infinitely and smoothly
  let baseItems = [...availableListings];
  while (baseItems.length > 0 && baseItems.length < 5) {
    baseItems = [...baseItems, ...availableListings];
  }
  const scrollItems = [...baseItems, ...baseItems];

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const halfWidth = container.scrollWidth / 2;
    if (halfWidth <= 0) return;

    // Adjust scroll index dynamically for seamless bi-directional infinity
    if (container.scrollLeft >= halfWidth * 1.5) {
      container.scrollLeft = container.scrollLeft - halfWidth;
      preciseScrollLeftRef.current = container.scrollLeft;
    } else if (container.scrollLeft <= 5) {
      container.scrollLeft = container.scrollLeft + halfWidth;
      preciseScrollLeftRef.current = container.scrollLeft;
    } else {
      // Synchronize exact physical position to precise subpixel accumulator
      preciseScrollLeftRef.current = container.scrollLeft;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsPaused(true);
    registerUserActivity();
    const container = scrollContainerRef.current;
    if (container) {
      startXRef.current = e.pageX - container.offsetLeft;
      scrollLeftRef.current = container.scrollLeft;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    registerUserActivity();
    const container = scrollContainerRef.current;
    if (container) {
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startXRef.current) * 1.5; // multiplier for scrolling speed
      container.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
  };

  const handleTouchStart = () => {
    setIsPaused(true);
    registerUserActivity();
  };

  const handleTouchMove = () => {
    setIsPaused(true);
    registerUserActivity();
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    registerUserActivity();
  };

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

  const scrollPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    registerUserActivity();
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ left: container.scrollLeft - 330, behavior: 'smooth' });
    }
  };

  const scrollNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    registerUserActivity();
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ left: container.scrollLeft + 330, behavior: 'smooth' });
    }
  };

  return (
    <div id="live-scroll-feed" className="w-full h-full bg-[#C0DD73] border border-[#a6c359] rounded-2.5xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 gap-3 relative overflow-hidden group min-h-[320px] md:min-h-0">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
      
      <div className="space-y-1.5 text-center">
        <div className="flex items-center justify-center gap-2 border-b border-black/10 pb-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </span>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider text-center flex items-center gap-1.5">
            {lang === 'bn' ? 'লাইভ আপডেট ফিড' : 'LIVE UPDATE OF LISTED PROPERTY'}
          </h3>
        </div>
        <p className="text-[11px] text-emerald-950 leading-tight font-extrabold text-center">
          {lang === 'bn' 
            ? '🔥 দালাল ছাড়া ১০০০+ সরাসরি প্রপার্টি লাইভ! যেকোনো কার্ডে চাপুন বিস্তারিত দেখতে' 
            : '🔥 1000+ Broker-Free Live Properties! Tap any card to unlock direct info'}
        </p>
      </div>

      {/* Frame Container holding the list */}
      <div className="relative h-[280px] sm:h-[300px] rounded-2xl bg-white/20 border border-black/5 shadow-[inset_0_1px_5px_rgba(0,0,0,0.1)] flex items-center overflow-hidden">
        
        {/* Soft edge fade overlays for horizontal direction */}
        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-[#C0DD73]/80 via-transparent to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-[#C0DD73]/80 via-transparent to-transparent z-10 pointer-events-none"></div>

        {/* CSS custom styles to hide scrollbars */}
        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />

        {/* Left Arrow Navigation Overlay */}
        <button
          onClick={scrollPrev}
          className="absolute left-2.5 z-20 bg-slate-900/85 hover:bg-slate-900 border border-white/25 hover:border-white/40 text-white rounded-full p-2 cursor-pointer shadow-lg active:scale-90 transition-all hover:scale-105 opacity-90 md:opacity-0 md:group-hover:opacity-100"
          title={lang === 'bn' ? 'আগেরটি' : 'Previous'}
        >
          <ChevronLeft className="w-5 h-5 text-yellow-400" />
        </button>

        {/* Right Arrow Navigation Overlay */}
        <button
          onClick={scrollNext}
          className="absolute right-2.5 z-20 bg-slate-900/85 hover:bg-slate-900 border border-white/25 hover:border-white/40 text-white rounded-full p-2 cursor-pointer shadow-lg active:scale-90 transition-all hover:scale-105 opacity-90 md:opacity-0 md:group-hover:opacity-100"
          title={lang === 'bn' ? 'পরেরটি' : 'Next'}
        >
          <ChevronRight className="w-5 h-5 text-yellow-400" />
        </button>

        {/* Live Scroll Feed Scroller with native scroll enabled */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={registerUserActivity}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="no-scrollbar w-full h-full flex flex-row items-center gap-4 px-12 overflow-x-auto cursor-grab active:cursor-grabbing select-none"
        >
          {scrollItems.map((item, index) => {
            return (
              <div
                key={`${item.id}-${index}`}
                onClick={() => onViewProperty(item.po)}
                className="bg-white hover:bg-white border border-black/10 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden transform hover:-translate-y-0.5 active:scale-[0.98] w-[310px] sm:w-[350px] shrink-0 h-[245px] sm:h-[265px] select-none"
              >
                {/* Subtle light decoration hint */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 group-hover:scale-125 transition-all duration-300"></div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {(() => {
                      const lowerType = (item.type || '').toLowerCase();
                      let badgeStyle = 'bg-amber-600/10 text-amber-900 border border-amber-600/20';
                      let IconComponent = <Building className="w-3 h-3 text-amber-700" />;

                      if (lowerType === 'বাসস্থান' || lowerType === 'residential' || lowerType === 'house') {
                        badgeStyle = 'bg-sky-600/10 text-sky-900 border border-sky-600/20';
                        IconComponent = <Home className="w-3 h-3 text-sky-700" />;
                      } else if (lowerType === 'কৃষি জমি' || lowerType === 'agricultural' || lowerType === 'plot' || lowerType === 'land') {
                        badgeStyle = 'bg-emerald-600/10 text-emerald-900 border border-emerald-600/20';
                        IconComponent = <Sprout className="w-3 h-3 text-emerald-700" />;
                      } else if (lowerType === 'বাণিজ্যিক' || lowerType === 'commercial' || lowerType === 'shop' || lowerType === 'store') {
                        badgeStyle = 'bg-indigo-600/10 text-indigo-900 border border-indigo-600/20';
                        IconComponent = <Store className="w-3 h-3 text-indigo-700" />;
                      } else if (lowerType === 'বাগান' || lowerType === 'garden') {
                        badgeStyle = 'bg-green-600/10 text-green-900 border border-green-600/20';
                        IconComponent = <Trees className="w-3 h-3 text-green-700" />;
                      } else if (lowerType === 'পুকুর সহ' || lowerType === 'with pond' || lowerType === 'pond') {
                        badgeStyle = 'bg-cyan-600/10 text-cyan-900 border border-cyan-600/20';
                        IconComponent = <Waves className="w-3 h-3 text-cyan-700" />;
                      }

                      return (
                        <span className={`inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md leading-none ${badgeStyle}`}>
                          {IconComponent}
                          <span>{getTypeLabel(item.type)}</span>
                        </span>
                      );
                    })()}
                    
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-tight flex items-center gap-1 mt-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-slate-800 group-hover:text-emerald-700 transition-colors truncate block">{item.po}, {getDistrictLabel(item.district)}</span>
                    </h4>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-black text-[#1e3a12] font-mono tracking-tight">
                      ₹{item.price}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 font-extrabold mt-1">
                      {item.size} {getUnitLabel(item.unit)}
                    </div>
                  </div>
                </div>

                {/* Static Features (Road Connection & Landmark) */}
                <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-b border-black/5 py-2.5">
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                      🛣️ {lang === 'bn' ? 'রাস্তা সংযোগ' : 'Road/Area'}
                    </span>
                    <span className="text-slate-800 font-black truncate block mt-0.5">
                      {item.road || (lang === 'bn' ? 'তথ্য নেই' : 'N/A')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                      🏢 {lang === 'bn' ? 'ল্যান্ডমার্ক' : 'Landmark'}
                    </span>
                    <span className="text-slate-800 font-black truncate block mt-0.5">
                      {item.landmark || (lang === 'bn' ? 'তথ্য নেই' : 'N/A')}
                    </span>
                  </div>
                </div>

                {/* Static Special Remarks (if present) */}
                {item.specialRemarks ? (
                  <div className="bg-amber-50/90 border border-amber-200/40 rounded-xl px-2.5 py-1.5 text-[10px] leading-tight flex items-start gap-1.5 select-none min-w-0">
                    <span className="text-amber-600 text-xs shrink-0">📌</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-amber-800/80 tracking-wider block leading-none mb-0.5">
                        {lang === 'bn' ? 'বিশেষ মন্তব্য' : 'Special Remarks'}
                      </span>
                      <p className="text-slate-700 font-extrabold italic truncate">
                        {item.specialRemarks}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5 text-[10px] leading-tight flex items-start gap-1.5 select-none min-w-0">
                    <span className="text-slate-400 text-xs shrink-0">📌</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase text-slate-500/80 tracking-wider block leading-none mb-0.5">
                        {lang === 'bn' ? 'বিশেষ মন্তব্য' : 'Special Remarks'}
                      </span>
                      <p className="text-slate-400 font-extrabold italic truncate">
                        {lang === 'bn' ? 'কোনো বিশেষ মন্তব্য নেই' : 'No special remarks'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2.5 border-t border-black/5 text-[10px] sm:text-xs font-bold mt-auto">
                  <span className="text-emerald-900 uppercase tracking-wider text-[9px] sm:text-[10px] flex items-center gap-1.5 font-black bg-emerald-600/10 border border-emerald-600/15 px-2 py-1 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    <span>{lang === 'bn' ? 'সরাসরি মালিক' : '100% OWNER'}</span>
                  </span>
                  
                  <span className="text-slate-800 group-hover:text-emerald-950 group-hover:bg-[#C0DD73]/20 group-hover:translate-x-1 transition-all flex items-center gap-1 font-extrabold uppercase tracking-wide bg-black/5 border border-black/10 px-2.5 py-1 rounded-full">
                    <span>{lang === 'bn' ? 'ফোন করুন' : 'CALL'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
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
