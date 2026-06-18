import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Header from './components/Header';
import ContactModal from './components/ContactModal';
import DisclaimerModal from './components/DisclaimerModal';
import SuggestionModal from './components/SuggestionModal';
import SellerFormView from './components/SellerFormView';
import SellerPaymentView from './components/SellerPaymentView';
import BuyerFormView from './components/BuyerFormView';
import ListingsView from './components/ListingsView';
import AdminView from './components/AdminView';
import AutoScrollFeed from './components/AutoScrollFeed';
import FAQSection from './components/FAQSection';
import PropertyToolkit from './components/PropertyToolkit';

import { T, WB_DISTRICTS, WB_DISTRICTS_BN } from './translations';
import { initialListings } from './initialListings';
import { Listing, RegisteredBuyer, BuyerLead } from './types';
import { sendToGoogleSheet, getGoogleSheetUrl } from './googleSheets';

export default function App() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [view, setView] = useState<'home' | 'sell' | 'sell-pay' | 'buy' | 'listings' | 'admin'>('home');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  
  // Modals Visibility
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);

  // States with persistent Local Storage bindings
  const [listings, setListings] = useState<Listing[]>([]);
  const [registeredBuyers, setRegisteredBuyers] = useState<RegisteredBuyer[]>([]);
  const [buyerLeads, setBuyerLeads] = useState<BuyerLead[]>([]);
  const [unlockedList, setUnlockedList] = useState<number[]>([]);
  
  // Buyer session state linking with secure local OTP checks
  const [buyerLoggedInMobile, setBuyerLoggedInMobile] = useState<string>('');
  const [buyerLoggedInName, setBuyerLoggedInName] = useState<string>('');

  // Registration data caches
  const [pendingListing, setPendingListing] = useState<Omit<Listing, 'id' | 'verified' | 'sold' | 'soldAt'> | null>(null);

  // Buyer notifications registration simple form states
  const [notifMobile, setNotifMobile] = useState('');
  const [notifDistrict, setNotifDistrict] = useState('');
  const [notifArea, setNotifArea] = useState('');
  const [notifSuccessText, setNotifSuccessText] = useState<string | null>(null);

  // States to hold the real-time buyer matching alert broadcast outcome
  const [matchedBroadcastResults, setMatchedBroadcastResults] = useState<any | null>(null);

  // Load persistence states on Mount
  useEffect(() => {
    // Listings
    try {
      const storedListings = localStorage.getItem('bm_listings_v3');
      if (storedListings) {
        setListings(JSON.parse(storedListings));
      } else {
        setListings(initialListings);
        localStorage.setItem('bm_listings_v3', JSON.stringify(initialListings));
      }
    } catch {
      setListings(initialListings);
    }

    // Registered Buyers Notification alert list
    try {
      const storedAlerts = localStorage.getItem('bm_registered_buyers_v3');
      if (storedAlerts) {
        setRegisteredBuyers(JSON.parse(storedAlerts));
      }
    } catch {}

    // Buyer Requirements Demands Leads
    try {
      const storedLeads = localStorage.getItem('bm_buyer_leads_v3');
      if (storedLeads) {
        setBuyerLeads(JSON.parse(storedLeads));
      }
    } catch {}

    // Unlocked numbers list is only active for people who have verified their mobile sessions.
    // Unlogged visitors should not stay unlocked or have persistent unlocked keys.

    // Load local buyer login state if any on startup
    try {
      const storedMobile = localStorage.getItem('bm_buyer_session_mobile');
      const storedName = localStorage.getItem('bm_buyer_session_name');
      if (storedMobile) {
        setBuyerLoggedInMobile(storedMobile);
      }
      if (storedName) {
        setBuyerLoggedInName(storedName);
      }
    } catch {}

    // First visit Disclaimer startup pop-up is disabled as requested by user
    try {
      const agreedToken = sessionStorage.getItem('bm_disc_agreed_v3');
      if (agreedToken === 'force_open') {
        setIsDisclaimerOpen(true);
      }
    } catch {}
  }, []);

  // Reload private unlock list reactively when user sessions change
  useEffect(() => {
    if (buyerLoggedInMobile) {
      try {
        const storedUnlocked = localStorage.getItem(`bm_unlocked_list_v3_for_${buyerLoggedInMobile}`);
        if (storedUnlocked) {
          setUnlockedList(JSON.parse(storedUnlocked));
        } else {
          setUnlockedList([]);
        }
      } catch {
        setUnlockedList([]);
      }
    } else {
      setUnlockedList([]);
    }
  }, [buyerLoggedInMobile]);

  // Update State persistent wrappers
  const saveListings = (updated: Listing[]) => {
    setListings(updated);
    try {
      localStorage.setItem('bm_listings_v3', JSON.stringify(updated));
    } catch {}
  };

  const saveRegisteredBuyers = (updated: RegisteredBuyer[]) => {
    setRegisteredBuyers(updated);
    try {
      localStorage.setItem('bm_registered_buyers_v3', JSON.stringify(updated));
    } catch {}
  };

  const saveBuyerLeads = (updated: BuyerLead[]) => {
    setBuyerLeads(updated);
    try {
      localStorage.setItem('bm_buyer_leads_v3', JSON.stringify(updated));
    } catch {}
  };

  const saveUnlockedList = (updated: number[], overrideMobile?: string) => {
    setUnlockedList(updated);
    try {
      const activeMobile = overrideMobile || buyerLoggedInMobile || localStorage.getItem('bm_buyer_session_mobile');
      if (activeMobile) {
        localStorage.setItem(`bm_unlocked_list_v3_for_${activeMobile.trim()}`, JSON.stringify(updated));
      } else {
        // Unlogged guests should not have standard persistent unlocks.
        // We do not set global 'bm_unlocked_list_v3'.
        sessionStorage.setItem('bm_guest_unlocked_temp', JSON.stringify(updated));
      }
    } catch {}
  };

  // Buyer Login & Logout action triggers
  const handleBuyerLogin = (mobile: string, name: string) => {
    setBuyerLoggedInMobile(mobile);
    setBuyerLoggedInName(name);
    try {
      localStorage.setItem('bm_buyer_session_mobile', mobile);
      localStorage.setItem('bm_buyer_session_name', name);
    } catch {}
  };

  const handleBuyerLogout = () => {
    setBuyerLoggedInMobile('');
    setBuyerLoggedInName('');
    setUnlockedList([]);
    try {
      localStorage.removeItem('bm_buyer_session_mobile');
      localStorage.removeItem('bm_buyer_session_name');
    } catch {}
  };

  // Sold Auto-Purging cron scheduler simulation
  useEffect(() => {
    const purgeTimer = setInterval(() => {
      const now = Date.now();
      const validListings = listings.filter((item) => {
        if (item.sold && item.soldAt) {
          const diffInMs = now - item.soldAt;
          const limit72h = 72 * 60 * 60 * 1000;
          return diffInMs < limit72h;
        }
        return true;
      });

      if (validListings.length !== listings.length) {
        saveListings(validListings);
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(purgeTimer);
  }, [listings]);

  // Actions
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const handleDisclaimerClose = () => {
    setIsDisclaimerOpen(false);
    try {
      sessionStorage.setItem('bm_disc_agreed_v3', '1');
    } catch {}
  };

  const handleRegisterNotificationAlert = () => {
    if (!/^\d{10}$/.test(notifMobile)) {
      alert(lang === 'bn' ? '⚠️ ১০ সংখ্যার মোবাইল নম্বর দিন' : '⚠️ Please enter a 10-digit mobile number');
      return;
    }
    if (!notifDistrict) {
      alert(lang === 'bn' ? '⚠️ জেলা বেছে নিন' : '⚠️ Please select a district');
      return;
    }
    if (!notifArea.trim()) {
      alert(lang === 'bn' ? '⚠️ এলাকা বা ব্লকের নাম দিন (যেমন: সল্টলেক, মেদিনীপুর সদর)' : '⚠️ Please enter your preferred Area, Town, or Block (e.g., Salt Lake, Kharagpur)');
      return;
    }

    const isExisting = registeredBuyers.some(
      (b) => b.mobile === notifMobile && b.district === notifDistrict && b.area === notifArea.trim()
    );

    if (isExisting) {
      setNotifSuccessText(lang === 'bn' ? '✓ আপনি ইতিমধ্যে নিবন্ধিত!' : '✓ Already Alert Registered!');
      setTimeout(() => setNotifSuccessText(null), 3500);
      return;
    }

    const newAlert = {
      mobile: notifMobile,
      district: notifDistrict,
      area: notifArea.trim(),
      date: new Date().toLocaleDateString('en-IN')
    };
    const updatedAlerts = [...registeredBuyers, newAlert];

    saveRegisteredBuyers(updatedAlerts);
    sendToGoogleSheet('buyer_alert', newAlert);
    setNotifMobile('');
    setNotifArea('');
    setNotifSuccessText(
      lang === 'bn'
        ? '✅ সফলভাবে নিবন্ধিত! নতুন সম্পত্তি যুক্ত হলে হোয়াটসঅ্যাপ-এ জানানো হবে।'
        : '✅ Registered! You will get WhatsApp alerts for new properties in this area.'
    );
    setTimeout(() => setNotifSuccessText(null), 4000);
  };

  // Seller callbacks
  const handleSellerFormComplete = (formData: Omit<Listing, 'id' | 'verified' | 'sold' | 'soldAt'>) => {
    setPendingListing(formData);
    setView('sell-pay');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSellerPaymentSuccess = (paymentId: string) => {
    if (pendingListing) {
      const newListing: Listing = {
        ...pendingListing,
        id: Date.now(),
        verified: true,
        sold: false,
        soldAt: null
      };

      const updated = [newListing, ...listings];
      saveListings(updated);
      sendToGoogleSheet('seller', newListing);
      setPendingListing(null);

      // Trigger automatic buyer matching broadcast alerts utilizing the linked Google Sheet database
      const sheetUrl = getGoogleSheetUrl();
      console.log(`[Broker Mukto Engine] Sending district broadcast regarding newly listed property at ${newListing.po}`);
      
      fetch('/api/broadcast-new-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listing: newListing,
          googleSheetUrl: sheetUrl
        })
      })
      .then((res) => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json().then(data => ({ ok: res.ok, data, error: null }));
        } else {
          return res.text().then(text => ({ ok: false, data: null, error: text }));
        }
      })
      .then((outcome) => {
        const { ok, data, error } = outcome;
        if (!ok || !data) {
          console.warn('[Broker Mukto Engine] Broadcast request returned non-JSON/error state:', error);
          return;
        }
        console.log('[Broker Mukto Engine] Broadcast response:', data);
        if (data.success && data.matchedCount > 0) {
          setMatchedBroadcastResults({
            matchedCount: data.matchedCount,
            notifiedBuyers: data.notifiedBuyers,
            simulated: data.simulated,
            details: data.details,
            preview: data.messagePreview
          });
        }
      })
      .catch((err) => {
        console.error('[Broker Mukto Engine] Broadcast request failed:', err);
      });
    }
  };

  // Buyer lead callbacks
  const handleBuyerFormComplete = (leadData: Omit<BuyerLead, 'date' | 'source'>) => {
    const nextLead: BuyerLead = {
      ...leadData,
      date: new Date().toLocaleDateString('en-IN'),
      source: 'buy-form'
    };

    const updated = [nextLead, ...buyerLeads];
    saveBuyerLeads(updated);
    sendToGoogleSheet('buyer_lead', nextLead);

    // Redirect to listings and highlight search
    setView('listings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listings helper triggers
  const handleUnlockSuccessVal = (id: number, buyerName?: string, buyerMobile?: string) => {
    const updated = [...unlockedList, id];
    saveUnlockedList(updated, buyerMobile);

    if (buyerMobile) {
      const listing = listings.find((l) => l.id === id);
      const targetLoc = listing ? `${listing.po}, ${listing.district}` : 'Unknown';
      const priceVal = listing ? `₹${listing.price}` : '';
      
      const nextLead: BuyerLead = {
        mobile: buyerMobile,
        po: listing?.po || '',
        district: listing?.district || '',
        budget: priceVal,
        type: listing?.type || '',
        remarks: `🔓 UNLOCKED ID #${id} (${buyerName || 'No Name'}) · Contacting seller`,
        date: new Date().toLocaleDateString('en-IN'),
        source: 'unlock-form'
      };

      const updatedLeads = [nextLead, ...buyerLeads];
      saveBuyerLeads(updatedLeads);

      // Save explicitly to spreadsheet for "Buyer_Unlocks_DB"
      sendToGoogleSheet('buyer_unlock', {
        id,
        buyerName: buyerName || '',
        buyerMobile,
        listing
      });

      // Also back up as standard buyer_lead
      sendToGoogleSheet('buyer_lead', nextLead);
    }
  };

  const handleListingStatusSoldToggle = (id: number, mobileCheck: string) => {
    let targetListing: Listing | undefined;
    const updated = listings.map((l) => {
      if (l.id === id && l.mobile === mobileCheck) {
        const nextSoldState = !l.sold;
        targetListing = {
          ...l,
          sold: nextSoldState,
          soldAt: nextSoldState ? Date.now() : null
        };
        return targetListing;
      }
      return l;
    });

    saveListings(updated);

    if (targetListing) {
      sendToGoogleSheet('seller_change_status', {
        id: targetListing.id,
        mobile: mobileCheck,
        sold: targetListing.sold,
        location: `${targetListing.po}, ${targetListing.district}`,
        price: targetListing.price
      });
    }
  };

  const handleSellerDeleteListingAd = (id: number, mobileCheck: string) => {
    const target = listings.find((l) => l.id === id && l.mobile === mobileCheck);
    if (!target) return false;

    const updated = listings.filter((l) => l.id !== id);
    saveListings(updated);

    sendToGoogleSheet('seller_delete', {
      id: target.id,
      mobile: mobileCheck,
      location: `${target.po}, ${target.district}`,
      price: target.price
    });
    return true;
  };

  // Administration dashboard triggers
  const handleDeletePropertyAd = (id: number) => {
    if (confirm('Delete this listing permanently?')) {
      const updated = listings.filter((l) => l.id !== id);
      saveListings(updated);
    }
  };

  const handleDeleteBuyerAlert = (mobile: string, district: string) => {
    if (confirm('De-register this buyer from notifications?')) {
      const updated = registeredBuyers.filter((b) => !(b.mobile === mobile && b.district === district));
      saveRegisteredBuyers(updated);
    }
  };

  const handleDeleteBuyerLead = (index: number) => {
    if (confirm('Remove this buyer interest lead form entry?')) {
      const updated = buyerLeads.filter((_, i) => i !== index);
      saveBuyerLeads(updated);
    }
  };

  const t = T[lang];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#006d75] to-[#003c44] text-yellow-50 relative flex flex-col justify-between">
      {/* Background decoration elements wrapper */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-yellow-500/5 to-transparent blur-3xl"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-green-500/5 to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col justify-between min-h-screen">
        {/* Navigation Header */}
        <Header 
          lang={lang} 
          onToggleLang={handleToggleLang}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenSuggestion={() => setIsSuggestionOpen(true)}
          onGoHome={() => setView('home')}
          onGoAdmin={() => setView('admin')}
        />

        {/* Core application view sheets container */}
        <main className={`flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6 relative ${view === 'listings' ? 'py-1.5 md:py-2' : 'py-4 md:py-6'}`}>
          
          {/* ── SCREEN 1: HOME VIEW ── */}
          {view === 'home' && (
            <div id="home-screen" className="space-y-4 py-2 md:py-4 animate-fade-in max-w-5xl mx-auto w-full">
              
              {/* Hero Banner Area (Super Compactified for viewport optimization) */}
              <div className="text-center max-w-3xl mx-auto space-y-1 px-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl md:text-3xl select-none animate-bounce" style={{ animationDuration: '3s' }}>🏠</span>
                  <h1 className="text-xl md:text-3.5xl font-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-200 bg-clip-text text-transparent tracking-tight leading-none">
                    {t.appName || 'BrokerMukto'}
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-yellow-500 font-extrabold tracking-wider uppercase max-w-xl mx-auto">
                  ✦ {t.tagline} ✦
                </p>
                <p className="text-[10px] sm:text-[11px] text-white/50 font-semibold max-w-lg mx-auto leading-tight">
                  {t.heroSub}
                </p>
              </div>

              {/* Unified Core Dashboard Frame (Adjusts magically depending on screens) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2 max-w-5xl mx-auto w-full">
                
                {/* CARD A: DIRECT LAUNCH ACTIONS GRID (Sell, Buy, View All Table) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-yellow-500/20 rounded-2.5xl p-4 flex flex-col justify-between shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-indigo-500 opacity-60"></div>
                  
                  <div className="space-y-1.5">
                    {/* Section Header */}
                    <div className="flex items-center justify-center gap-2 border-b border-white/5 pb-2">
                      <span className="text-xs animate-pulse">⚡</span>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider text-center">
                        {lang === 'bn' ? 'সরাসরি অ্যাকশন' : 'Quick Actions'}
                      </h3>
                    </div>
                    <p className="text-[10px] text-white/50 leading-tight font-medium text-center">
                      {lang === 'bn' ? 'দালাল ছাড়াই সরাসরি আমাদের সিস্টেম ব্যবহার করে দ্রুত কাজ করুন' : 'Bypass brokers entirely and connect with West Bengal sellers/buyers directly'}
                    </p>
                  </div>

                  {/* Buttons Grid */}
                  <div className="flex flex-col gap-2 pt-2 pb-1.5">
                    {/* Grid for Sell & Buy Side-by-side to save maximum space */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setView('sell')}
                        className="py-3 bg-green-600 hover:bg-green-500 text-white border border-green-500/30 rounded-xl text-xs sm:text-sm font-black cursor-pointer select-none tracking-wide transform hover:-translate-y-[4px] active:translate-y-[2px] transition-all duration-150 flex flex-col items-center justify-center gap-1 shadow-[0_6px_0_#14532d] hover:shadow-[0_10px_0_#14532d] active:shadow-[0_2px_0_#14532d] will-change-transform"
                      >
                        <span className="text-xl transform group-hover:scale-110 transition-transform duration-200">🌾</span>
                        <span className="tracking-wide">{t.sellTitle}</span>
                        <span className="text-[8px] opacity-90 font-extrabold bg-white/20 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">{lang === 'bn' ? 'ফ্রি' : 'Free'}</span>
                      </button>

                      <button
                        onClick={() => setView('buy')}
                        className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 rounded-xl text-xs sm:text-sm font-black cursor-pointer select-none tracking-wide transform hover:-translate-y-[4px] active:translate-y-[2px] transition-all duration-150 flex flex-col items-center justify-center gap-1 shadow-[0_6px_0_#1e1b4b] hover:shadow-[0_10px_0_#1e1b4b] active:shadow-[0_2px_0_#1e1b4b] will-change-transform"
                      >
                        <span className="text-xl transform group-hover:scale-110 transition-transform duration-200">🔍</span>
                        <span className="tracking-wide">{t.buyTitle}</span>
                        <span className="text-[8px] opacity-90 font-extrabold bg-white/20 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">{lang === 'bn' ? 'ফ্রি' : 'Free'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Small Highlight Badge */}
                  <div className="bg-black/40 rounded-lg p-2 text-center border border-white/5 text-[9px] font-bold text-yellow-400">
                    🎉 {lang === 'bn' ? '১০০% সম্পূর্ণ ফ্রি সার্ভিস!' : '100% FREE broker-free service!'}
                  </div>

                </div>

                {/* CARD C: LIVE AUTO-SCROLLER TICKER FRAME */}
                <div className="w-full h-full">
                  <AutoScrollFeed 
                    lang={lang}
                    listings={listings}
                    onViewProperty={(queryStr) => {
                      setHomeSearchQuery(queryStr);
                      setView('listings');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>

              </div>

              {/* Premium prominent View All Listings CTA - Exactly above "How It Works" portion */}
              <div className="max-w-5xl mx-auto px-2 sm:px-0">
                <button
                  id="view-all-listings-home-cta"
                  onClick={() => {
                    setHomeSearchQuery('');
                    setView('listings');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 border-none rounded-2xl text-teal-950 text-xs sm:text-sm md:text-base font-extrabold shadow-lg shadow-yellow-500/10 cursor-pointer select-none tracking-wide hover:scale-[1.01] active:scale-[0.99] transition-all relative overflow-hidden flex items-center justify-center gap-2"
                >
                  <span className="animate-pulse">🗺️</span>
                  <span>
                    {lang === 'bn' 
                      ? `সব লিস্টিং দেখুন — সরাসরি মালিকের সাথে যোগাযোগ করুন (${listings.length}টি লাইভ রয়েছে)` 
                      : `View All Listings — Contact Owners Directly (${listings.length} Live listings)`}
                  </span>
                  <span>➔</span>
                </button>
              </div>

              {/* Get WhatsApp Alerts Box — Centered and beautifully prominent exactly above "How It Works" portion */}
              <div className="max-w-5xl mx-auto px-2 sm:px-0">
                <div id="notif-box-horizontal" className="p-5 md:p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-yellow-500/20 rounded-2.5xl shadow-xl flex flex-col items-center justify-center text-center gap-5">
                  {/* Info text */}
                  <div className="flex flex-col items-center justify-center gap-2 max-w-2xl mx-auto">
                    <span className="text-3xl animate-bounce">🔔</span>
                    <h3 className="text-sm md:text-base font-extrabold text-yellow-500 uppercase tracking-wider flex items-center justify-center gap-1.5 leading-none">
                      {lang === 'bn' ? 'নতুন সম্পত্তির আপডেট পান' : 'Get WhatsApp Alerts'}
                      <span className="bg-yellow-500/10 text-yellow-400 font-bold border border-yellow-500/30 px-1.5 py-0.5 rounded text-[8px] tracking-wide normal-case">
                        {lang === 'bn' ? 'ফ্রি' : 'Free'}
                      </span>
                    </h3>
                    <p className="text-[11px] md:text-xs text-white/70 leading-relaxed font-semibold">
                      {lang === 'bn' 
                        ? 'আপনার জেলা সিলেক্ট করে রাখুন। নতুন বিজ্ঞাপন যুক্ত হলেই সাথে সাথে সরাসরি বিনামূল্যে মেসেজ পাবেন।' 
                        : 'Select your district to receive automated WhatsApp notifications as soon as a new broker-free listing is added.'}
                    </p>
                  </div>

                  {/* Form fields & action button */}
                  <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-3">
                    {/* Phone field */}
                    <div className="flex-1 sm:max-w-[200px] text-left">
                      <label className="block text-[9px] font-bold text-white/50 mb-1 ml-0.5 uppercase tracking-wider text-center sm:text-left">
                        {lang === 'bn' ? 'হোয়াটসঅ্যাপ নম্বর' : 'WhatsApp Number'}
                      </label>
                      <input 
                        type="tel"
                        value={notifMobile}
                        onChange={(e) => setNotifMobile(e.target.value)}
                        placeholder={lang === 'bn' ? '১০ সংখ্যার নম্বর' : '10-digits Only'}
                        className="w-full bg-black/40 hover:bg-black/60 border border-white/10 focus:border-yellow-500 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none placeholder-white/25 transition-all focus:ring-1 focus:ring-yellow-500/30"
                      />
                    </div>

                    {/* District Selector */}
                    <div className="flex-1 sm:max-w-[200px] text-left">
                      <label className="block text-[9px] font-bold text-white/50 mb-1 ml-0.5 uppercase tracking-wider text-center sm:text-left">
                        {lang === 'bn' ? 'জেলা বেছে নিন' : 'Select District'}
                      </label>
                      <select 
                        value={notifDistrict}
                        onChange={(e) => setNotifDistrict(e.target.value)}
                        className="w-full bg-black/40 hover:bg-black/60 border border-white/10 focus:border-yellow-500 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none cursor-pointer transition-all focus:ring-1 focus:ring-yellow-500/30 font-bold"
                      >
                        <option value="" className="bg-teal-900 text-white font-bold">
                          {lang === 'bn' ? '-- জেলা --' : '-- Choose District --'}
                        </option>
                        {WB_DISTRICTS.map((d, index) => (
                          <option key={d} value={d} className="bg-teal-900 text-white font-bold">
                            {lang === 'bn' ? WB_DISTRICTS_BN[index] : d}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Area / Block input field */}
                    <div className="flex-1 sm:max-w-[200px] text-left">
                      <label className="block text-[9px] font-bold text-white/50 mb-1 ml-0.5 uppercase tracking-wider text-center sm:text-left">
                        {lang === 'bn' ? 'এলাকা / ব্লক' : 'Area / Block'}
                      </label>
                      <input 
                        type="text"
                        value={notifArea}
                        onChange={(e) => setNotifArea(e.target.value)}
                        placeholder={lang === 'bn' ? 'যেমন: সল্টলেক, ডানকুনি' : 'e.g., Salt Lake, Dankuni'}
                        className="w-full bg-black/40 hover:bg-black/60 border border-white/10 focus:border-yellow-500 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none placeholder-white/25 transition-all focus:ring-1 focus:ring-yellow-500/30"
                      />
                    </div>

                    {/* Button with dynamic text & response support inside or centered */}
                    <div className="flex flex-col gap-1 min-w-[150px]">
                      <button
                        onClick={handleRegisterNotificationAlert}
                        className="w-full py-2.5 px-4 bg-yellow-500 hover:bg-yellow-400 text-teal-950 font-black rounded-xl text-xs cursor-pointer select-none tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 font-bold"
                      >
                        <span>🔔</span>
                        <span>{lang === 'bn' ? 'অ্যালার্ট চালু করুন' : 'Activate Alerts'}</span>
                      </button>
                      
                      {/* Validation Response text, placed inside beautifully */}
                      {notifSuccessText && (
                        <div className="text-center font-bold text-green-300 text-[9px] leading-tight bg-green-500/15 border border-green-500/25 p-1 rounded-md animate-fade-in max-w-[200px] mx-auto">
                          {notifSuccessText}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Property Toolkit: Stamp Duty, Smart Valuation & Tools */}
              <div className="max-w-5xl mx-auto px-2 sm:px-0">
                <PropertyToolkit lang={lang} />
              </div>

              {/* "How It Works" Ribbon Wrapper - Fits exactly on bottom of screen */}
              <div className="max-w-5xl mx-auto px-2 sm:px-0">
                <div className="bg-slate-900/60 border border-white/5 rounded-2.5xl p-4 md:p-5 shadow-md">
                  <h3 className="text-[9px] md:text-xs font-black text-yellow-500/80 mb-1.5 uppercase tracking-widest text-center">
                    🛠️ {t.howTitle}
                  </h3>
                  
                  {/* Perfectly aligned grid for No 1, 2, 3 & 4 cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2.5">
                    {/* Item 1 */}
                    <div className="bg-black/35 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                      <span className="inline-flex items-center justify-center bg-yellow-400 text-teal-950 text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm shadow-yellow-400/20">1</span>
                      <p className="text-[10px] md:text-xs text-white/90 font-semibold leading-snug">{t.how1}</p>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-black/35 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                      <span className="inline-flex items-center justify-center bg-yellow-400 text-teal-950 text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm shadow-yellow-400/20">2</span>
                      <p className="text-[10px] md:text-xs text-white/90 font-semibold leading-snug">{t.how2}</p>
                    </div>

                    {/* Item 3 */}
                    <div className="bg-black/35 border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                      <span className="inline-flex items-center justify-center bg-yellow-400 text-teal-950 text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm shadow-yellow-400/20">3</span>
                      <p className="text-[10px] md:text-xs text-white/90 font-semibold leading-snug">{t.how3}</p>
                    </div>

                    {/* Item 4 */}
                    <div className="bg-black/35 border border-white/5 rounded-xl p-3 flex items-start gap-2.5 animate-pulse" style={{ animationDuration: '4s' }}>
                      <span className="inline-flex items-center justify-center bg-yellow-400 text-teal-950 text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm shadow-yellow-400/20">4</span>
                      <p className="text-[10px] md:text-xs text-white/90 font-semibold leading-snug">{t.how4}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section addressing common questions about broker-free property listing & verification */}
              <FAQSection lang={lang} />

            </div>
          )}

          {/* ── SCREEN 2: SELLER FORM VIEW ── */}
          {view === 'sell' && (
            <SellerFormView 
              lang={lang}
              onBack={() => setView('home')}
              onSubmit={handleSellerFormComplete}
              activeMobiles={listings.filter(l => !l.sold).map(l => (l.mobile || '').replace(/\D/g, '').slice(-10))}
            />
          )}

          {/* ── SCREEN 3: SELLER PAYMENT VIEW ── */}
          {view === 'sell-pay' && (
            <SellerPaymentView 
              lang={lang}
              pendingListing={pendingListing}
              onBack={() => setView('sell')}
              onPaymentSuccess={handleSellerPaymentSuccess}
            />
          )}

          {/* ── SCREEN 4: BUYER FORM VIEW ── */}
          {view === 'buy' && (
            <BuyerFormView 
              lang={lang}
              onBack={() => setView('home')}
              onSubmit={handleBuyerFormComplete}
            />
          )}

          {/* ── SCREEN 5: LISTINGS VIEW ── */}
          {view === 'listings' && (
            <ListingsView 
              lang={lang}
              listings={listings}
              unlockedList={unlockedList}
              buyerLoggedInMobile={buyerLoggedInMobile}
              buyerLoggedInName={buyerLoggedInName}
              onBuyerLogin={handleBuyerLogin}
              onBuyerLogout={handleBuyerLogout}
              onBack={() => {
                setHomeSearchQuery('');
                setView('home');
              }}
              onUnlockSuccess={handleUnlockSuccessVal}
              onToggleSold={handleListingStatusSoldToggle}
              onDeleteListing={handleSellerDeleteListingAd}
              initialSearchQuery={homeSearchQuery}
            />
          )}

          {/* ── SCREEN 6: SECURED ADMIN VIEW ── */}
          {view === 'admin' && (
            <AdminView 
              lang={lang}
              listings={listings}
              registeredBuyers={registeredBuyers}
              buyerLeads={buyerLeads}
              onBack={() => setView('home')}
              onDeleteListing={handleDeletePropertyAd}
              onDeleteBuyer={handleDeleteBuyerAlert}
              onDeleteBuyerLead={handleDeleteBuyerLead}
            />
          )}

        </main>

        {/* Site Footer */}
        <footer className="relative z-10 border-t border-white/5 py-6 text-center text-[10px] text-white/30 tracking-wide bg-black/10">
          <div className="max-w-5xl mx-auto px-2 sm:px-4 space-y-1.5 font-semibold leading-relaxed">
            <div>BrokerMukto.com</div>
            <div>{lang === 'bn' ? 'দালালমুক্ত ক্রেতা ও বিক্রেতা সংযোগের স্বাধীন প্ল্যাটফর্ম · সমস্ত চুক্তি নিজ ঝুঁকিতে সম্পাদিত হয়' : 'Broker-free direct property connector platform · Use entirely at your own risk.'}</div>
            <button 
              onClick={() => setIsDisclaimerOpen(true)}
              className="text-yellow-500/65 font-bold hover:text-yellow-500 transition-colors uppercase tracking-widest mt-1.5 block mx-auto py-1 px-3 border border-yellow-500/20 rounded-full hover:bg-yellow-500/5 cursor-pointer leading-none text-[9px]"
            >
              ⚠️ {lang === 'bn' ? 'সম্পূর্ণ সতর্কতা পড়ুন' : 'Read Full Disclaimer Warning'}
            </button>
            <div className="pt-2 text-white/5 hover:text-yellow-500/10 cursor-pointer select-none transition-colors" onClick={() => setView('admin')}>
              ⚙ Admin System
            </div>
          </div>
        </footer>
      </div>

      {/* --- FLOATING OVERLAYS MODALS --- */}
      <ContactModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
        lang={lang} 
      />

      <DisclaimerModal 
        isOpen={isDisclaimerOpen} 
        onClose={handleDisclaimerClose} 
        lang={lang} 
      />

      <SuggestionModal 
        isOpen={isSuggestionOpen} 
        onClose={() => setIsSuggestionOpen(false)} 
        lang={lang} 
      />

      {/* Real-time automated Google Sheet buyer matching alert broadcast outcome modal */}
      {matchedBroadcastResults && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-green-500/30 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden space-y-4 text-left">
            <div className="absolute top-0 right-0 p-3">
              <button
                onClick={() => setMatchedBroadcastResults(null)}
                className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 text-2xl font-bold animate-pulse shrink-0">
                📢
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  {lang === 'bn' ? 'স্বয়ংক্রিয় বায়ার অ্যালার্ট প্রেরিত!' : 'Automated Buyer Alerts Dispatched!'}
                </h3>
                <p className="text-xs text-white/50">
                  {lang === 'bn' ? 'সংযুক্ত গুগল শিট ডাটাবেস আপডেট' : 'Synchronized with connected Google Sheets database'}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-white/70 font-semibold border-b border-white/5 pb-2">
                <span>{lang === 'bn' ? 'ম্যাচিং বায়ারদের সংখ্যা' : 'Matched Interested Buyers'}:</span>
                <span className="text-green-400 font-extrabold text-sm">{matchedBroadcastResults.matchedCount} on search alert</span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-xs select-none">
                {matchedBroadcastResults.notifiedBuyers.map((b: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="font-mono text-white/80 font-bold">📱 {b.mobile.replace(/(\d{2})\d{3,6}(\d{2})/, "$1******$2")}</span>
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full capitalize">
                      {b.area ? `📍 ${b.area}` : 'District Alert'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] leading-relaxed text-yellow-500 font-medium bg-yellow-500/5 border border-yellow-500/20 p-3.5 rounded-2xl space-y-1">
              <div>
                <strong>{lang === 'bn' ? 'মেসেজ অ্যালার্ট প্রিভিউ:' : 'Notification Alert Sent:'}</strong>
              </div>
              <pre className="font-mono text-[9px] text-white/70 whitespace-pre-wrap bg-black/30 p-2 rounded border border-white/5 max-h-24 overflow-y-auto">
                {matchedBroadcastResults.preview}
              </pre>
              <div className="text-[10px] text-white/50 pt-1.5">
                ℹ️ {matchedBroadcastResults.details}
              </div>
            </div>

            <button
              onClick={() => setMatchedBroadcastResults(null)}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-all active:scale-95"
            >
              {lang === 'bn' ? 'অসাধারণ, ঠিক আছে!' : 'Awesome, Got It!'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
