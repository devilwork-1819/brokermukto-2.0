import React, { useState, useEffect, useRef } from 'react';
import { X, Home, Bell, Wrench, GripHorizontal } from 'lucide-react';
import Header from './components/Header';
import ContactModal from './components/ContactModal';
import DisclaimerModal from './components/DisclaimerModal';
import SuggestionModal from './components/SuggestionModal';
import DownloadAppModal from './components/DownloadAppModal';
import SellerFormView from './components/SellerFormView';
import SellerPaymentView from './components/SellerPaymentView';
import BuyerFormView from './components/BuyerFormView';
import ListingsView from './components/ListingsView';
import AdminView from './components/AdminView';
import AutoScrollFeed from './components/AutoScrollFeed';
import FAQSection from './components/FAQSection';
import PropertyToolkit from './components/PropertyToolkit';

// @ts-ignore
import logoImg from './assets/images/brokermukto_logo_1781687619316.jpg';
// @ts-ignore
import propertyWatermark from './assets/images/uploaded_house_watermark_1782300404360.jpg';

import { T, WB_DISTRICTS, WB_DISTRICTS_BN } from './translations';
import { initialListings } from './initialListings';
import { Listing, RegisteredBuyer, BuyerLead } from './types';
import { sendToGoogleSheet, getGoogleSheetUrl, isGoogleSheetCsvUrl, parseCsvListings } from './googleSheets';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export default function App() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [view, setView] = useState<'home' | 'sell' | 'sell-pay' | 'buy' | 'listings' | 'admin'>('home');
  const [activeHomeTab, setActiveHomeTab] = useState<'property' | 'whatsapp' | 'toolkit'>('property');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  
  // Modals Visibility
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isDownloadAppOpen, setIsDownloadAppOpen] = useState(false);

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

  // Floating safety toasts for iframe environment support without throwing "Script error"
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: string }>;
      if (customEvent.detail) {
        const { message, type } = customEvent.detail;
        const newToast = {
          id: Date.now() + Math.random(),
          message,
          type
        };
        setToasts((prev) => {
          // Avoid duplicating identical exact text toasts if they are triggered in rapid loops
          if (prev.some(t => t.message === message)) return prev;
          return [...prev, newToast];
        });
        
        // Auto-dismiss after 6 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, 6000);
      }
    };

    window.addEventListener('safe-toast-notification', handleToastEvent);
    return () => {
      window.removeEventListener('safe-toast-notification', handleToastEvent);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dragging support for bottom taskbar
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target instanceof Element ? e.target : null;
    if (target && typeof target.closest === 'function' && (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select'))) {
      return;
    }
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };
    try {
      if (e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      console.warn("Pointer capture failed", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    // Direct, lightweight coordinate clamping to retain task bar availability inside target viewport bounds
    const maxBoundW = typeof window !== 'undefined' ? window.innerWidth * 0.95 : 500;
    const maxBoundH = typeof window !== 'undefined' ? window.innerHeight * 0.95 : 800;

    const boundedX = Math.max(-maxBoundW, Math.min(maxBoundW, newX));
    const boundedY = Math.max(-maxBoundH, Math.min(15, newY));

    setDragOffset({ x: boundedX, y: boundedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        if (e.currentTarget && typeof e.currentTarget.releasePointerCapture === 'function') {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
  };

  // Real-time synchronization of listings from Firestore using the Firebase JS SDK
  useEffect(() => {
    // 1. Instantly load listings from local cache for rapid rendering
    try {
      const storedListings = localStorage.getItem('bm_listings_v3');
      if (storedListings) {
        setListings(JSON.parse(storedListings));
      } else {
        setListings(initialListings);
      }
    } catch {
      setListings(initialListings);
    }

    // 2. Set up direct Firestore listener
    const unsubscribeListings = onSnapshot(
      collection(db, 'listings'),
      (snapshot) => {
        const items: Listing[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            ...(docSnap.data() as Omit<Listing, '_docId'>),
            _docId: docSnap.id
          });
        });

        // Order listings with newest ID first (descending)
        items.sort((a, b) => (b.id || 0) - (a.id || 0));

        if (items.length === 0) {
          setListings(initialListings);
        } else {
          setListings(items);
          try {
            localStorage.setItem('bm_listings_v3', JSON.stringify(items));
          } catch {}
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'listings');
      }
    );

    // Load registered buyers from localStorage cache
    try {
      const storedAlerts = localStorage.getItem('bm_registered_buyers_v3');
      if (storedAlerts) {
        setRegisteredBuyers(JSON.parse(storedAlerts));
      }
    } catch {}

    // Load buyer leads from localStorage cache
    try {
      const storedLeads = localStorage.getItem('bm_buyer_leads_v3');
      if (storedLeads) {
        setBuyerLeads(JSON.parse(storedLeads));
      }
    } catch {}

    // Non-listing supplemental syncing (buyers / leads) from server/webhook
    const activeSheetUrl = getGoogleSheetUrl();
    const sheetQuery = activeSheetUrl ? `?sheetUrl=${encodeURIComponent(activeSheetUrl)}` : '';
    fetch(`/api/registered-buyers${sheetQuery}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRegisteredBuyers(data);
          try {
            localStorage.setItem('bm_registered_buyers_v3', JSON.stringify(data));
          } catch {}
        }
      })
      .catch(err => console.warn('[Broker Mukto Sync] Server fetch buyers failed:', err));

    fetch(`/api/buyer-leads${sheetQuery}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBuyerLeads(data);
          try {
            localStorage.setItem('bm_buyer_leads_v3', JSON.stringify(data));
          } catch {}
        }
      })
      .catch(err => console.warn('[Broker Mukto Sync] Server fetch buyer leads failed:', err));

    return () => {
      unsubscribeListings();
    };
  }, []);

  // Load remaining session and routing states on Mount
  useEffect(() => {
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

    // Check URL parameters or hash for starting view on load (direct URL entry)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      const hashParam = window.location.hash;
      
      if (viewParam === 'admin' || hashParam === '#admin' || urlParams.has('admin')) {
        setView('admin');
      } else if (viewParam === 'listings' || hashParam === '#listings') {
        setView('listings');
      } else if (viewParam === 'sell' || hashParam === '#sell') {
        setView('sell');
      } else if (viewParam === 'buy' || hashParam === '#buy') {
        setView('buy');
      }
    } catch (e) {
      console.error('Failed to parse URL routing parameters on direct URL entry', e);
    }

    // Load active Google Sheet Webhook URL from server configuration to synchronize across all visitor devices
    fetch('/api/get-google-sheet-url')
      .then(res => res.json())
      .then(data => {
        const localUrl = localStorage.getItem('bm_google_sheet_url') || '';
        if (data && data.url) {
          localStorage.setItem('bm_google_sheet_url', data.url);
          console.log('[Google Sheets Proxy] Synchronized active webhook config from server:', data.url);
        } else if (localUrl) {
          // Self-heal: If server lost its config but client has it, restore it on the server!
          console.log('[Google Sheets Proxy] Restoring lost server configuration from client local storage...');
          fetch('/api/save-google-sheet-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: localUrl })
          })
          .then(() => console.log('[Google Sheets Proxy] Server configuration restored successfully.'))
          .catch(err => console.warn('[Google Sheets Proxy] Self-heal restore failed:', err));
        }
      })
      .catch(err => {
        console.warn('[Google Sheets Proxy] Server configuration offline or unreachable:', err);
      });
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

  // Update State persistent wrappers (saves locally and synchronizes to Express Server side)

  const saveRegisteredBuyers = (updated: RegisteredBuyer[]) => {
    setRegisteredBuyers(updated);
    try {
      localStorage.setItem('bm_registered_buyers_v3', JSON.stringify(updated));
    } catch {}

    fetch('/api/registered-buyers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyers: updated })
    })
    .catch(err => console.warn('[Broker Mukto Sync] Failed to sync buyers to server:', err));
  };

  const saveBuyerLeads = (updated: BuyerLead[]) => {
    setBuyerLeads(updated);
    try {
      localStorage.setItem('bm_buyer_leads_v3', JSON.stringify(updated));
    } catch {}

    fetch('/api/buyer-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: updated })
    })
    .catch(err => console.warn('[Broker Mukto Sync] Failed to sync buyer leads to server:', err));
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
      listings.forEach(async (item) => {
        if (item.sold && item.soldAt) {
          const diffInMs = now - item.soldAt;
          const limit72h = 72 * 60 * 60 * 1000;
          if (diffInMs >= limit72h && item._docId) {
            try {
              await deleteDoc(doc(db, "listings", item._docId));
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `listings/${item._docId}`);
            }
          }
        }
      });
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

  const handleSellerPaymentSuccess = async (paymentId: string) => {
    if (pendingListing) {
      const newListing: Listing = {
        ...pendingListing,
        id: Date.now(),
        verified: true,
        sold: false,
        soldAt: null
      };

      sendToGoogleSheet('seller', newListing);
      try {
        await addDoc(collection(db, 'listings'), newListing);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'listings');
      }
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

  const handleListingStatusSoldToggle = async (id: number, mobileCheck: string) => {
    const targetListing = listings.find((l) => l.id === id && l.mobile === mobileCheck);
    if (!targetListing) return;

    const nextSoldState = !targetListing.sold;
    const updatedFields = {
      sold: nextSoldState,
      soldAt: nextSoldState ? Date.now() : null
    };

    if (targetListing._docId) {
      try {
        await updateDoc(doc(db, "listings", targetListing._docId), updatedFields);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `listings/${targetListing._docId}`);
      }
    }

    sendToGoogleSheet('seller_change_status', {
      id: targetListing.id,
      mobile: mobileCheck,
      sold: nextSoldState,
      location: `${targetListing.po}, ${targetListing.district}`,
      price: targetListing.price
    });
  };

  const handleSellerDeleteListingAd = async (id: number, mobileCheck: string) => {
    const target = listings.find((l) => l.id === id && l.mobile === mobileCheck);
    if (!target) return false;

    if (target._docId) {
      try {
        await deleteDoc(doc(db, "listings", target._docId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `listings/${target._docId}`);
        return false;
      }
    }

    sendToGoogleSheet('seller_delete', {
      id: target.id,
      mobile: mobileCheck,
      location: `${target.po}, ${target.district}`,
      price: target.price
    });
    return true;
  };

  // Administration dashboard triggers
  const handleDeletePropertyAd = async (id: number) => {
    if (confirm('Delete this listing permanently?')) {
      const target = listings.find((l) => l.id === id);
      if (target && target._docId) {
        try {
          await deleteDoc(doc(db, "listings", target._docId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `listings/${target._docId}`);
        }
      }
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
    <div className="min-h-screen bg-gradient-to-tr from-[#f3f8fc] via-white to-[#e6f1fa] text-slate-900 relative flex flex-col justify-between">
      {/* Dynamic Floating Glassmorphism Toasts System Overlay (catches iframe-blocked alerts and confirms smoothly) */}
      {toasts.length > 0 && (
        <div id="safety-toasts-overlay" className="fixed top-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border backdrop-blur-xl animate-fade-in transition-all duration-300 ${
                toast.type === 'confirm_fallback'
                  ? 'bg-amber-950/95 border-amber-500/40 text-amber-50'
                  : toast.type === 'warning'
                  ? 'bg-yellow-950/95 border-yellow-500/40 text-yellow-50'
                  : 'bg-slate-950/95 border-emerald-500/30 text-emerald-50'
              }`}
            >
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.type === 'confirm_fallback' ? (
                  <div className="text-[9px] uppercase tracking-wider text-amber-400 font-extrabold mb-1">
                     Iframe Auto-Confirmed Action
                  </div>
                ) : (
                  <div className="text-[9px] uppercase tracking-wider text-yellow-400 font-extrabold mb-1">
                    Notification Alert
                  </div>
                )}
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="hover:bg-white/10 p-1 rounded-lg transition-colors text-white/50 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Background decoration elements wrapper - soft blue and white abstract styling with subtle property watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50/10">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-blue-200/40 via-sky-200/20 to-transparent blur-3xl"></div>
        <div className="absolute bottom-[5%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-br from-indigo-150/40 via-blue-200/20 to-transparent blur-3xl"></div>
        <div className="absolute top-[35%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-sky-100/30 blur-3xl"></div>
        
        {/* Real Estate Property Background Watermark Images for widescreen laptops (decorates empty left/right margins) */}
        <div className="absolute left-[-4%] top-[18%] w-[380px] h-[380px] md:w-[580px] md:h-[580px] opacity-[0.035] mix-blend-multiply pointer-events-none transform -rotate-12 select-none">
          <img 
            src={propertyWatermark} 
            alt="Property Watermark" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain filter grayscale" 
          />
        </div>
        <div className="absolute right-[-4%] bottom-[12%] w-[380px] h-[380px] md:w-[620px] md:h-[620px] opacity-[0.03] mix-blend-multiply pointer-events-none transform rotate-12 select-none">
          <img 
            src={propertyWatermark} 
            alt="Property Watermark" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain filter grayscale" 
          />
        </div>
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
          onOpenDownloadApp={() => setIsDownloadAppOpen(true)}
        />

        {/* Core application view sheets container - Expanded for widescreen laptops */}
        <main className={`flex-1 w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative ${view === 'listings' ? 'py-1.5 md:py-2 pb-24 sm:pb-28' : 'py-4 md:py-6 pb-24 sm:pb-28'}`}>
          
          {/* ── SCREEN 1: HOME VIEW ── */}
          {view === 'home' && (
            <div id="home-screen" className="space-y-4 py-2 md:py-4 animate-fade-in max-w-full mx-auto w-full">
              
              {/* Hero Banner Area (Super Compactified for viewport optimization) */}
              <div className="text-center max-w-3xl mx-auto space-y-2 px-2">
                <p className="text-xs sm:text-sm text-blue-800 font-extrabold tracking-wider uppercase max-w-xl mx-auto pt-2">
                  ✦ {t.tagline} ✦
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold max-w-lg mx-auto leading-tight">
                  {t.heroSub}
                </p>
              </div>

              {/* Tab 1 Content: Property (Quick Actions, Scroll Feed, View All Listings CTA, How It Works, FAQs) */}
              {activeHomeTab === 'property' && (
                <>
                  {/* Unified Core Dashboard Frame (Stacked vertically for maximum width and optimal property viewing size) */}
                  <div className="flex flex-col gap-4 px-2 max-w-[1650px] mx-auto w-full">
                    
                    {/* CARD A: DIRECT LAUNCH ACTIONS GRID (Sell, Buy, View All Table) */}
                    <div className="bg-[#C0DD73] border border-[#a6c359] rounded-2.5xl p-5 flex flex-col justify-between shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 gap-4 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-60"></div>
                      
                      <div className="space-y-1.5">
                        {/* Section Header */}
                        <div className="flex items-center justify-center gap-2 border-b border-black/10 pb-2">
                          <span className="text-xs animate-pulse">⚡</span>
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider text-center">
                            {lang === 'bn' ? 'সরাসরি অ্যাকশন' : 'Quick Actions'}
                          </h3>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-800 leading-tight font-extrabold text-center">
                          {lang === 'bn' ? 'দালাল ছাড়াই সরাসরি আমাদের সিস্টেম ব্যবহার করে দ্রুত কাজ করুন' : 'Bypass brokers entirely and connect with West Bengal sellers/buyers directly'}
                        </p>
                      </div>

                      {/* Buttons Grid */}
                      <div className="flex flex-col gap-2 pt-1 pb-1">
                        {/* Grid for Sell & Buy Side-by-side to save maximum space */}
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => setView('sell')}
                            className="py-3 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600/30 rounded-xl font-black cursor-pointer select-none tracking-wide transform hover:-translate-y-[4px] active:translate-y-[2px] transition-all duration-150 flex flex-col items-center justify-center gap-1.5 shadow-[0_6px_0_#064e3b] hover:shadow-[0_10px_0_#064e3b] active:shadow-[0_2px_0_#064e3b] will-change-transform font-sans"
                          >
                            <span className="text-2xl transform group-hover:scale-110 transition-transform duration-200">🌾</span>
                            <span className="tracking-wide text-sm sm:text-base md:text-lg font-black">{t.sellTitle}</span>
                            <span className="text-[9px] opacity-90 font-black bg-white/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">{lang === 'bn' ? 'ফ্রি' : 'Free'}</span>
                          </button>

                          <button
                            onClick={() => setView('buy')}
                            className="py-3 bg-blue-700 hover:bg-blue-600 text-white border border-blue-600/30 rounded-xl font-black cursor-pointer select-none tracking-wide transform hover:-translate-y-[4px] active:translate-y-[2px] transition-all duration-150 flex flex-col items-center justify-center gap-1.5 shadow-[0_6px_0_#1e3a8a] hover:shadow-[0_10px_0_#1e3a8a] active:shadow-[0_2px_0_#1e3a8a] will-change-transform font-sans"
                          >
                            <span className="text-2xl transform group-hover:scale-110 transition-transform duration-200">🔍</span>
                            <span className="tracking-wide text-sm sm:text-base md:text-lg font-black">{t.buyTitle}</span>
                            <span className="text-[9px] opacity-90 font-black bg-white/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">{lang === 'bn' ? 'ফ্রি' : 'Free'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Small Highlight Badge */}
                      <div className="bg-white/40 rounded-lg p-2.5 text-center border border-black/5 text-[10px] sm:text-xs font-extrabold text-[#1a380f]">
                        🎉 {lang === 'bn' ? '১০০% সম্পূর্ণ ফ্রি সার্ভিস!' : '100% FREE broker-free service!'}
                      </div>

                    </div>

                    {/* CARD C: LIVE AUTO-SCROLLER TICKER FRAME (Placed below, enjoying clean high-visibility, full screen width) */}
                    <div className="w-full">
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
                  <div className="max-w-[1650px] mx-auto px-2 sm:px-0 w-full">
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

                  {/* "How It Works" Ribbon Wrapper - Fits exactly on bottom of screen */}
                  <div className="max-w-[1650px] mx-auto px-2 sm:px-0 w-full">
                    <div className="bg-[#C0DD73] border border-[#a6c359] rounded-2.5xl p-4 md:p-5 shadow-sm">
                      <h3 className="text-[9px] md:text-xs font-black text-[#1e3a12] mb-1.5 uppercase tracking-widest text-center">
                        🛠️ {t.howTitle}
                      </h3>
                      
                      {/* Perfectly aligned grid for No 1, 2, 3 & 4 cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2.5">
                        {/* Item 1 */}
                        <div className="bg-white/30 border border-black/5 rounded-xl p-3 flex items-start gap-2.5">
                          <span className="inline-flex items-center justify-center bg-[#8ea645] text-white text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm">1</span>
                          <p className="text-[10px] md:text-xs text-slate-900 font-extrabold leading-snug">{t.how1}</p>
                        </div>

                        {/* Item 2 */}
                        <div className="bg-white/30 border border-black/5 rounded-xl p-3 flex items-start gap-2.5">
                          <span className="inline-flex items-center justify-center bg-[#8ea645] text-white text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm">2</span>
                          <p className="text-[10px] md:text-xs text-slate-900 font-extrabold leading-snug">{t.how2}</p>
                        </div>

                        {/* Item 3 */}
                        <div className="bg-white/30 border border-black/5 rounded-xl p-3 flex items-start gap-2.5">
                          <span className="inline-flex items-center justify-center bg-[#8ea645] text-white text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm">3</span>
                          <p className="text-[10px] md:text-xs text-slate-900 font-extrabold leading-snug">{t.how3}</p>
                        </div>

                        {/* Item 4 */}
                        <div className="bg-white/30 border border-black/5 rounded-xl p-3 flex items-start gap-2.5 animate-pulse" style={{ animationDuration: '4s' }}>
                          <span className="inline-flex items-center justify-center bg-[#8ea645] text-white text-[11px] font-black h-5 w-5 rounded-full shrink-0 shadow-sm">4</span>
                          <p className="text-[10px] md:text-xs text-slate-900 font-extrabold leading-snug">{t.how4}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FAQ Section addressing common questions about broker-free property listing & verification */}
                  <FAQSection lang={lang} />
                </>
              )}

              {/* Tab 2 Content: WhatsApp Alert */}
              {activeHomeTab === 'whatsapp' && (
                <div className="max-w-[1650px] mx-auto px-2 sm:px-0 w-full">
                  <div id="notif-box-horizontal" className="p-5 md:p-6 bg-[#C0DD73] border border-[#a6c359] rounded-2.5xl shadow-md flex flex-col items-center justify-center text-center gap-5">
                    {/* Info text */}
                    <div className="flex flex-col items-center justify-center gap-2 max-w-2xl mx-auto">
                      <span className="text-3xl animate-bounce">🔔</span>
                      <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-wider flex items-center justify-center gap-1.5 leading-none">
                        {lang === 'bn' ? 'নতুন সম্পত্তির আপডেট পান' : 'Get WhatsApp Alerts'}
                        <span className="bg-[#1e3a12] text-white font-black border border-black/10 px-1.5 py-0.5 rounded text-[8px] tracking-wide normal-case">
                          {lang === 'bn' ? 'ফ্রি' : 'Free'}
                        </span>
                      </h3>
                      <p className="text-[11px] md:text-xs text-slate-800 leading-relaxed font-extrabold text-center">
                        {lang === 'bn' 
                          ? 'আপনা জেলা সিলেক্ট করে রাখুন। নতুন বিজ্ঞাপন যুক্ত হলেই সাথে সাথে সরাসরি বিনামূল্যে মেসেজ পাবেন।' 
                          : 'Select your district to receive automated WhatsApp notifications as soon as a new broker-free listing is added.'}
                      </p>
                    </div>

                    {/* Form fields & action button */}
                    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-3">
                      {/* Phone field */}
                      <div className="flex-1 sm:max-w-[200px] text-left">
                        <label className="block text-[10px] font-extrabold text-slate-900 mb-1 ml-0.5 uppercase tracking-wider text-center sm:text-left">
                          {lang === 'bn' ? 'হোয়াটসঅ্যাপ নম্বর' : 'WhatsApp Number'}
                        </label>
                        <input 
                          type="tel"
                          value={notifMobile}
                          onChange={(e) => setNotifMobile(e.target.value)}
                          placeholder={lang === 'bn' ? '১০ সংখ্যার নম্বর' : '10-digits Only'}
                          className="w-full bg-white border border-black/15 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none placeholder-slate-400 transition-all focus:ring-1 focus:ring-black/10"
                        />
                      </div>

                      {/* District Selector */}
                      <div className="flex-1 sm:max-w-[200px] text-left">
                        <label className="block text-[10px] font-extrabold text-slate-900 mb-1 ml-0.5 uppercase tracking-wider text-center sm:text-left">
                          {lang === 'bn' ? 'জেলা বেছে নিন' : 'Select District'}
                        </label>
                        <select 
                          value={notifDistrict}
                          onChange={(e) => setNotifDistrict(e.target.value)}
                          className="w-full bg-white border border-black/15 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none cursor-pointer transition-all focus:ring-1 focus:ring-black/10 font-black"
                        >
                          <option value="" className="bg-[#C0DD73] text-slate-900 font-bold">
                            {lang === 'bn' ? '-- জেলা --' : '-- Choose District --'}
                          </option>
                          {WB_DISTRICTS.map((d, index) => (
                            <option key={d} value={d} className="bg-white text-slate-900 font-bold">
                              {lang === 'bn' ? WB_DISTRICTS_BN[index] : d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Area / Block input field */}
                      <div className="flex-1 sm:max-w-[200px] text-left">
                        <label className="block text-[10px] font-extrabold text-slate-900 mb-1 ml-0.5 uppercase tracking-wider text-center sm:text-left">
                          {lang === 'bn' ? 'এলাকা / ব্লক' : 'Area / Block'}
                        </label>
                        <input 
                          type="text"
                          value={notifArea}
                          onChange={(e) => setNotifArea(e.target.value)}
                          placeholder={lang === 'bn' ? 'যেমন: সল্টলেক, ডানকুনি' : 'e.g., Salt Lake, Dankuni'}
                          className="w-full bg-white border border-black/15 focus:border-emerald-600 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none placeholder-slate-400 transition-all focus:ring-1 focus:ring-black/10 font-black"
                        />
                      </div>

                      {/* Button with dynamic text & response support inside or centered */}
                      <div className="flex flex-col gap-1 min-w-[150px]">
                        <button
                          onClick={handleRegisterNotificationAlert}
                          className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl text-xs cursor-pointer select-none tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 font-bold font-sans"
                        >
                          <span>🔔</span>
                          <span>{lang === 'bn' ? 'অ্যালার্ট চালু করুন' : 'Activate Alerts'}</span>
                        </button>
                        
                        {/* Validation Response text, placed inside beautifully */}
                        {notifSuccessText && (
                          <div className="text-center font-extrabold text-emerald-950 text-[10px] leading-tight bg-white border border-emerald-500/20 p-2 rounded-md animate-fade-in max-w-[200px] mx-auto">
                            {notifSuccessText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3 Content: Smart Property Toolkit */}
              {activeHomeTab === 'toolkit' && (
                <div className="max-w-[1650px] mx-auto px-2 sm:px-0 w-full">
                  <PropertyToolkit lang={lang} />
                </div>
              )}

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
          <div className="max-w-[1650px] mx-auto px-2 sm:px-4 space-y-1.5 font-semibold leading-relaxed w-full">
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

      <DownloadAppModal 
        isOpen={isDownloadAppOpen} 
        onClose={() => setIsDownloadAppOpen(false)} 
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

      {/* Persistent Bottom Task Bar - Styled as a highly attractive modern floating glass bar - Draggable to any screen location! */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-1 select-none pointer-events-none md:pb-2.5">
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ 
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
            touchAction: 'none'
          }}
          className={`max-w-md mx-auto pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-yellow-500/30 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.15)] p-1.5 transition-all duration-150 ${isDragging ? 'cursor-grabbing shadow-[0_20px_50px_rgba(0,0,0,0.95)] border-yellow-400 scale-[1.01]' : 'cursor-grab'}`}
        >
          {/* Touch-friendly Drag Handle */}
          <div className="flex justify-center pb-1.5">
            <div className="w-12 h-1 bg-white/30 rounded-full hover:bg-yellow-400/60 transition-colors" />
          </div>

          <div className="flex justify-around items-center gap-1.5">
            
            {/* Tab 1: Property */}
            <button
               id="tab-property"
              onClick={() => {
                setActiveHomeTab('property');
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 font-extrabold rounded-xl transition-all duration-300 cursor-pointer ${
                view === 'home' && activeHomeTab === 'property'
                  ? 'text-yellow-400 bg-gradient-to-b from-yellow-500/10 to-yellow-500/20 border border-yellow-500/30 shadow-inner scale-[1.03] font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Active Glow Dot */}
              {view === 'home' && activeHomeTab === 'property' && (
                <span className="absolute top-1 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_6px_#facc15] animate-pulse"></span>
              )}
              <Home className={`w-4.5 h-4.5 shrink-0 transition-transform duration-300 ${view === 'home' && activeHomeTab === 'property' ? 'scale-110 text-yellow-400' : 'text-white/65'}`} />
              <span className="text-[10px] min-[360px]:text-[11px] font-black tracking-wide">
                {lang === 'bn' ? 'সম্পত্তি' : 'Property'}
              </span>
            </button>

            {/* Tab 2: WhatsApp Alert */}
            <button
              id="tab-whatsapp"
              onClick={() => {
                setActiveHomeTab('whatsapp');
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 font-extrabold rounded-xl transition-all duration-300 cursor-pointer ${
                view === 'home' && activeHomeTab === 'whatsapp'
                  ? 'text-yellow-400 bg-gradient-to-b from-yellow-500/10 to-yellow-500/20 border border-yellow-500/30 shadow-inner scale-[1.03] font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Alert Badge */}
              <span className="absolute -top-1.5 -right-1 bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-bounce shadow-sm shadow-emerald-500/40">
                {lang === 'bn' ? 'ফ্রি' : 'Free'}
              </span>
              
              {/* Active Glow Dot */}
              {view === 'home' && activeHomeTab === 'whatsapp' && (
                <span className="absolute top-1 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_6px_#facc15] animate-pulse"></span>
              )}
              <Bell className={`w-4.5 h-4.5 shrink-0 transition-all duration-300 ${view === 'home' && activeHomeTab === 'whatsapp' ? 'scale-110 text-yellow-400 rotate-12' : 'text-white/65'}`} />
              <span className="text-[10px] min-[360px]:text-[11px] font-black tracking-wide whitespace-nowrap">
                {lang === 'bn' ? 'হোয়াটসঅ্যাপ অ্যালার্ট' : 'WhatsApp Alert'}
              </span>
            </button>

            {/* Tab 3: Smart Property Toolkit */}
            <button
              id="tab-toolkit"
              onClick={() => {
                setActiveHomeTab('toolkit');
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 font-extrabold rounded-xl transition-all duration-300 cursor-pointer ${
                view === 'home' && activeHomeTab === 'toolkit'
                  ? 'text-yellow-400 bg-gradient-to-b from-yellow-500/10 to-yellow-500/20 border border-yellow-500/30 shadow-inner scale-[1.03] font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {/* Active Glow Dot */}
              {view === 'home' && activeHomeTab === 'toolkit' && (
                <span className="absolute top-1 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_6px_#facc15] animate-pulse"></span>
              )}
              <Wrench className={`w-4.5 h-4.5 shrink-0 transition-transform duration-300 ${view === 'home' && activeHomeTab === 'toolkit' ? 'scale-110 text-yellow-400' : 'text-white/65'}`} />
              <span className="text-[10px] min-[360px]:text-[11px] font-black tracking-wide whitespace-nowrap">
                {lang === 'bn' ? 'স্মার্ট টুলকিট' : 'Smart Toolkit'}
              </span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
