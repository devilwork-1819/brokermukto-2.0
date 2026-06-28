import React, { useState } from 'react';
import { ArrowLeft, Shield, LogOut, Trash2, Tag, Copy, Users, ShoppingCart, Landmark, Search, MessageSquare, Database, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Listing, RegisteredBuyer, BuyerLead } from '../types';
import { getGoogleSheetUrl, setGoogleSheetUrl, sendToGoogleSheet, GOOGLE_APPS_SCRIPT_TEMPLATE, getFast2SMSKey, setFast2SMSKey } from '../googleSheets';
import { WB_DISTRICTS, WB_DISTRICTS_BN, TYPE_MAP, UNIT_MAP } from '../translations';

interface AdminViewProps {
  lang: 'bn' | 'en';
  listings: Listing[];
  registeredBuyers: RegisteredBuyer[];
  buyerLeads: BuyerLead[];
  onBack: () => void;
  onDeleteListing: (id: number) => void;
  onDeleteBuyer: (mobile: string, district: string) => void;
  onDeleteBuyerLead: (index: number) => void;
}

const ADMIN_PASS = 'Dba1@smh';

// Helper functions for translating Admin listed properties
const getDistrictLabel = (districtName: string, lang: 'bn' | 'en') => {
  if (lang === 'bn') {
    const idx = WB_DISTRICTS.indexOf(districtName);
    return idx !== -1 ? WB_DISTRICTS_BN[idx] : districtName;
  } else {
    const idx = WB_DISTRICTS_BN.indexOf(districtName);
    return idx !== -1 ? WB_DISTRICTS[idx] : districtName;
  }
};

const getTypeLabel = (typeVal: string, lang: 'bn' | 'en') => {
  if (!typeVal) return '';
  if (lang === 'en') {
    if (TYPE_MAP[typeVal]) {
      return TYPE_MAP[typeVal];
    }
    return typeVal;
  } else {
    const bnKey = Object.keys(TYPE_MAP).find(key => TYPE_MAP[key] === typeVal);
    if (bnKey) {
      return bnKey;
    }
    return typeVal;
  }
};

const getUnitLabel = (unitVal: string, lang: 'bn' | 'en') => {
  if (!unitVal) return '';
  if (lang === 'en') {
    if (UNIT_MAP[unitVal]) {
      return UNIT_MAP[unitVal];
    }
    return unitVal;
  } else {
    const bnKey = Object.keys(UNIT_MAP).find(key => UNIT_MAP[key] === unitVal);
    if (bnKey) {
      return bnKey;
    }
    return unitVal;
  }
};

export default function AdminView({
  lang,
  listings,
  registeredBuyers,
  buyerLeads,
  onBack,
  onDeleteListing,
  onDeleteBuyer,
  onDeleteBuyerLead
}: AdminViewProps) {
  // Authentication states
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginErr, setLoginErr] = useState(false);

  // Search & Filters inside Admin Dash
  const [buyerSearch, setBuyerSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('bm_visitor_suggestions');
      if (stored) {
        setSuggestions(JSON.parse(stored));
      }
    } catch {}

    // Synchronize active Google Sheet URL from server configuration
    fetch('/api/get-google-sheet-url')
      .then(res => res.json())
      .then(data => {
        if (data && data.url) {
          localStorage.setItem('bm_google_sheet_url', data.url);
          setSheetUrlState(data.url);
          setIsUrlSaved(true);
        }
      })
      .catch(err => {
        console.warn('[AdminView Sync] Server configuration offline:', err);
      });

    // Synchronize active Fast2SMS API Key from server configuration
    fetch('/api/get-fast2sms-key')
      .then(res => res.json())
      .then(data => {
        if (data && data.key) {
          localStorage.setItem('bm_fast2sms_api_key', data.key);
          setFast2SMSKeyState(data.key);
          setIsKeySaved(true);
        }
      })
      .catch(err => {
        console.warn('[AdminView Sync] Fast2SMS server offline:', err);
      });
  }, []);

  const handleDeleteSuggestion = (id: number) => {
    const updated = suggestions.filter((s) => s.id !== id);
    setSuggestions(updated);
    try {
      localStorage.setItem('bm_visitor_suggestions', JSON.stringify(updated));
    } catch {}
  };

  // Google Sheets integration state
  const [sheetUrl, setSheetUrlState] = useState(getGoogleSheetUrl());
  const [isUrlSaved, setIsUrlSaved] = useState(!!getGoogleSheetUrl());
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Fast2SMS integration state
  const [fast2smsKey, setFast2SMSKeyState] = useState(getFast2SMSKey());
  const [isKeySaved, setIsKeySaved] = useState(!!getFast2SMSKey());

  // Bulk Database Synchronizer
  const [bulkSyncLoading, setBulkSyncLoading] = useState(false);
  const [bulkSyncStatus, setBulkSyncStatus] = useState('');
  const [bulkSyncProgress, setBulkSyncProgress] = useState(0);

  const handleBulkSync = async () => {
    const activeUrl = sheetUrl || getGoogleSheetUrl();
    if (!activeUrl) {
      alert('⚠️ Please enter a Google Sheet Webhook URL first before synchronizing.');
      return;
    }

    // Auto-save if the current input state is different from saved configuration
    if (sheetUrl && sheetUrl.trim() !== getGoogleSheetUrl()) {
      setGoogleSheetUrl(sheetUrl);
      setIsUrlSaved(true);
    }
    
    const confirmSync = window.confirm(
      `Sync all live data into your Google Sheet? \n\n` +
      `- Properties listings count: ${listings.length}\n` +
      `- Registered buyers count: ${registeredBuyers.length}\n` +
      `- Buyer demands/leads count: ${buyerLeads.length}\n\n` +
      `This will append all active items into corresponding Google sheets tabs. Proceed?`
    );
    if (!confirmSync) return;

    setBulkSyncLoading(true);
    setBulkSyncProgress(0);
    setBulkSyncStatus('Initializing Google Sheet Bulk Synchronizer...');

    try {
      let totalItems = listings.length + registeredBuyers.length + buyerLeads.length;
      if (totalItems === 0) {
        setBulkSyncStatus('No local records found to synchronize.');
        setTimeout(() => setBulkSyncLoading(false), 2000);
        return;
      }

      let processed = 0;

      // 1. Sync Seller Listings
      for (let i = 0; i < listings.length; i++) {
        setBulkSyncStatus(`Syncing properties listings... (${i + 1}/${listings.length})`);
        const item = listings[i];
        await sendToGoogleSheet('seller', item);
        processed++;
        setBulkSyncProgress(Math.round((processed / totalItems) * 100));
        // Add minimal delay to prevent throttling
        await new Promise((r) => setTimeout(r, 120));
      }

      // 2. Sync Registered Buyers (Buyer Alerts)
      for (let i = 0; i < registeredBuyers.length; i++) {
        setBulkSyncStatus(`Syncing WhatsApp alert buyers... (${i + 1}/${registeredBuyers.length})`);
        const item = registeredBuyers[i];
        await sendToGoogleSheet('buyer_alert', item);
        processed++;
        setBulkSyncProgress(Math.round((processed / totalItems) * 100));
        await new Promise((r) => setTimeout(r, 120));
      }

      // 3. Sync Buyer Requirement Leads
      for (let i = 0; i < buyerLeads.length; i++) {
        setBulkSyncStatus(`Syncing buyer requirement leads... (${i + 1}/${buyerLeads.length})`);
        const item = buyerLeads[i];
        await sendToGoogleSheet('buyer_lead', item);
        processed++;
        setBulkSyncProgress(Math.round((processed / totalItems) * 100));
        await new Promise((r) => setTimeout(r, 120));
      }

      setBulkSyncStatus('🎉 Sync completed successfully! All tables populated in Google Sheets.');
      alert('🎉 Google Sheet Bulk Database Synchronization Successful! All existing properties, buyers, and custom demands have been appended.');
    } catch (err) {
      console.error(err);
      setBulkSyncStatus('❌ Sync failed. Please verify connection and try again.');
    } finally {
      setTimeout(() => {
        setBulkSyncLoading(false);
        setBulkSyncStatus('');
        setBulkSyncProgress(0);
      }, 3000);
    }
  };

  const handleSaveSheetUrl = () => {
    setGoogleSheetUrl(sheetUrl);
    setIsUrlSaved(!!sheetUrl);
    alert(sheetUrl ? '✅ Google Sheet Web App Webhook URL Saved!' : '🧹 Webhook URL Cleared.');
  };

  const handleSaveFast2SMSKey = () => {
    setFast2SMSKey(fast2smsKey);
    setIsKeySaved(!!fast2smsKey);
    alert(fast2smsKey ? '✅ Fast2SMS API Key Saved persistently!' : '🧹 Fast2SMS API Key Cleared.');
  };

  const handleTestConnection = async () => {
    if (!sheetUrl) {
      alert('⚠️ Please enter a Web App Webhook URL first.');
      return;
    }
    setTestLoading(true);
    setTestSuccess(null);
    
    const success = await sendToGoogleSheet('buyer_alert', {
      mobile: '9999999888',
      district: 'Kolkata (TEST CONNECTION)',
      date: new Date().toLocaleDateString('en-IN') + ' (TEST)'
    });
    
    setTestLoading(false);
    setTestSuccess(success);
    if (success) {
      alert('🎉 Test connection sent! Check your connected Google Spreadsheet for raw columns: "Buyer_Alerts_DB" should have a new test row added.');
    } else {
      alert('❌ Test connection failed. Please verify the Web App URL, make sure it is deployed as "Anyone" and try again.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASS) {
      setIsAuthorized(true);
      setLoginErr(false);
    } else {
      setLoginErr(true);
      setPassword('');
      setTimeout(() => setLoginErr(false), 3000);
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    setPassword('');
  };

  const scrollToPanel = (panelId: string) => {
    const el = document.getElementById(panelId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Apply highly noticeable flash effect to the focused list
      el.classList.add('ring-4', 'ring-yellow-500/60');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-yellow-500/60');
      }, 2500);
    }
  };

  // Stats
  const totalAlertBuyersCount = registeredBuyers.length;
  const totalBuyerRequirementsLeads = buyerLeads.length;
  const totalActiveAdsCount = listings.length;
  const uniqueDistrictsWithAlerts = [...new Set(registeredBuyers.map((b) => b.district))].length;

  // Mass notifications click helper
  const handleMassNotify = () => {
    if (registeredBuyers.length === 0) {
      alert('No buyers registered for WhatsApp alerts.');
      return;
    }
    const msg = 'Dear Interested Buyer, check out newly added property details of your area at www.brokermukto.com | Regards - Broker Mukto Team';
    const firstNum = registeredBuyers[0].mobile;
    const count = registeredBuyers.length;
    
    alert(`📢 Launching WhatsApp for first buyer (out of ${count} total). Copy message to paste in WhatsApp and broadcast to others.`);
    window.open(`https://wa.me/91${firstNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Copy Buyers lists
  const handleExportBuyers = () => {
    if (registeredBuyers.length === 0) {
      alert('No registered buyers to copy.');
      return;
    }
    const rows = ['BrokerMukto Registered Buyers Notification Alert List:'];
    registeredBuyers.forEach((b, i) => {
      rows.push(`${i + 1}. Mobile: ${b.mobile} | District: ${b.district}${b.area ? ` | Area: ${b.area}` : ''} | Date: ${b.date}`);
    });
    navigator.clipboard.writeText(rows.join('\n'));
    alert('📋 Buyers alert directory text copied to clipboard successfully!');
  };

  // Copy Buyer Leads
  const handleExportLeads = () => {
    if (buyerLeads.length === 0) {
      alert('No buyer leads to export.');
      return;
    }
    const rows = ['BrokerMukto Customer Demand Requirement Leads:'];
    buyerLeads.forEach((b, i) => {
      rows.push(`${i + 1}. Mobile: ${b.mobile} | District: ${b.district} | P.O: ${b.po} | Budget: ${b.budget} | Type: ${b.type} | Remarks: ${b.remarks || 'None'} | Date: ${b.date}`);
    });
    navigator.clipboard.writeText(rows.join('\n'));
    alert('📋 Buyer lead sheets text copied to clipboard safely!');
  };

  // Filters results
  const filteredAltBuyers = registeredBuyers.filter((b) => {
    const term = buyerSearch.toLowerCase().trim();
    return b.mobile.includes(term) || b.district.toLowerCase().includes(term);
  });

  const filteredLeads = buyerLeads.filter((l) => {
    const term = leadSearch.toLowerCase().trim();
    return (
      (l.mobile || '').includes(term) ||
      (l.district || '').toLowerCase().includes(term) ||
      (l.po || '').toLowerCase().includes(term) ||
      (l.type || '').toLowerCase().includes(term)
    );
  });

  if (!isAuthorized) {
    return (
      <div id="admin-login-screen" className="max-w-md mx-auto px-4 py-16">
        {/* Elegant Header Card Box with unified controls and navigation */}
        <div className="bg-slate-900/90 border border-yellow-500/25 rounded-3xl p-5 mb-8 flex flex-col items-center justify-between gap-4 shadow-2xl relative overflow-hidden backdrop-blur-md text-center">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white tracking-tight">
              🔐 Admin Portal
            </h2>
            <p className="text-[10px] text-white/55 font-bold uppercase tracking-wider">
              BrokerMukto Management
            </p>
          </div>
          <button 
            onClick={onBack}
            className="w-full bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-teal-950 border border-yellow-500/30 hover:border-yellow-400 rounded-xl px-4 py-2.5 text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer select-none group uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>{lang === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}</span>
          </button>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-yellow-500/30 rounded-3xl p-8 text-center shadow-2xl relative">
          <div className="w-14 h-14 bg-yellow-500/5 border border-yellow-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🔐
          </div>
          <h3 className="text-xl font-black text-yellow-500">Admin Secure Portal</h3>
          <p className="text-xs text-white/40 mt-1 mb-8 font-semibold">Authorized Staff Access Only</p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input 
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Access Password"
              className="w-full bg-black/35 border-2 border-yellow-500/20 focus:border-yellow-500 rounded-xl px-4 py-3 text-center text-white text-base font-extrabold outline-none tracking-[4px]"
            />

            {loginErr && (
              <div className="text-xs text-red-400 font-bold bg-red-500/10 rounded-xl p-2 animate-pulse">
                ❌ Forbidden: Access Denied
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-xl text-teal-950 font-black cursor-pointer leading-none flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>Unlock Admin Controls</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-view" className="w-full py-6 md:py-10">
      
      {/* Top dashboard control bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-yellow-500 flex items-center gap-2 leading-none">
            <Shield className="w-5 h-5 text-yellow-500 animate-pulse" />
            <span>📊 Admin Dashboard</span>
          </h2>
          <span className="text-[10px] text-white/40 font-bold uppercase mt-1 tracking-wider block">BrokerMukto Controls</span>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500 border border-yellow-500/30 hover:border-yellow-400 text-yellow-500 hover:text-teal-950 font-extrabold text-xs rounded-xl cursor-pointer leading-none shadow-md transition-all uppercase tracking-wider group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Home</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold text-xs rounded-xl cursor-pointer leading-none shadow-md transition-all uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Panel Widgets - Clickable shortcuts with smooth scroll redirection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div 
          onClick={() => scrollToPanel('panel-notify-buyers')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-yellow-500/40 rounded-2xl p-4 shadow-md text-center cursor-pointer hover:scale-[1.03] transition-all"
        >
          <div className="text-3xl font-black text-yellow-500 font-mono leading-none">{totalAlertBuyersCount}</div>
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
            <Users className="w-3 h-3 text-yellow-500/70" />
            <span>Notif Buyers</span>
          </div>
        </div>

        <div 
          onClick={() => scrollToPanel('panel-buyer-leads')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-yellow-500/40 rounded-2xl p-4 shadow-md text-center cursor-pointer hover:scale-[1.03] transition-all"
        >
          <div className="text-3xl font-black text-yellow-500 font-mono leading-none">{totalBuyerRequirementsLeads}</div>
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
            <ShoppingCart className="w-3 h-3 text-yellow-500/70" />
            <span>Buyer Leads</span>
          </div>
        </div>

        <div 
          onClick={() => scrollToPanel('panel-active-listings')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-yellow-500/40 rounded-2xl p-4 shadow-md text-center cursor-pointer hover:scale-[1.03] transition-all"
        >
          <div className="text-3xl font-black text-yellow-500 font-mono leading-none">{totalActiveAdsCount}</div>
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
            <Landmark className="w-3 h-3 text-yellow-500/70" />
            <span>Active Listings</span>
          </div>
        </div>

        <div 
          onClick={() => scrollToPanel('panel-notify-buyers')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-yellow-500/40 rounded-2xl p-4 shadow-md text-center cursor-pointer hover:scale-[1.03] transition-all"
        >
          <div className="text-3xl font-black text-yellow-500 font-mono leading-none">{uniqueDistrictsWithAlerts}</div>
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
            <span className="text-sm">🗺️</span>
            <span>Alert Districts</span>
          </div>
        </div>

        <div 
          onClick={() => scrollToPanel('panel-suggestions')}
          className="bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-yellow-500/40 rounded-2xl p-4 shadow-md text-center cursor-pointer hover:scale-[1.03] transition-all col-span-2 sm:col-span-1 lg:col-span-1"
        >
          <div className="text-3xl font-black text-amber-400 font-mono leading-none">{suggestions.length}</div>
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
            <span className="text-sm">💡</span>
            <span>Suggestions</span>
          </div>
        </div>
      </div>

      {/* Broadcast alert action wrapper */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-green-500/25 p-5 rounded-3xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">📢 Customer Notification Campaigns</h3>
          <p className="text-xs text-white/50 mt-1 font-semibold leading-relaxed">Send dynamic alerts directly on WhatsApp to all registered West Bengal property seekers instantly.</p>
        </div>
        <button
          onClick={handleMassNotify}
          className="w-full md:w-auto shrink-0 px-6 py-3.5 bg-gradient-to-r from-green-600 to-green-500 border border-green-400 rounded-xl text-white font-extrabold text-xs cursor-pointer shadow-md leading-none flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-white" />
          <span>Launch WhatsApp Broadcast</span>
        </button>
      </div>

      {/* Google Sheets Live Database Syncer Panel */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-yellow-500/20 rounded-3xl p-5 md:p-6 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-center text-xl">
              📊
            </div>
            <div>
              <h3 className="text-base font-black text-yellow-500 flex items-center gap-1.5 leading-tight">
                <span>Google Sheets Live Database Syncer</span>
              </h3>
              <p className="text-xs text-white/55 font-semibold">Store unlimited submitted buyer & seller details instantly</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${isUrlSaved ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
              isUrlSaved 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
            }`}>
              {isUrlSaved ? 'Live Connected' : 'Local Only (Click Setup)'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-yellow-500/80 uppercase tracking-widest mb-1.5">
              Google Sheet Web App Webhook URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="url" 
                value={sheetUrl}
                onChange={(e) => setSheetUrlState(e.target.value)}
                placeholder="Paste Web App URL: https://script.google.com/macros/s/..."
                className="flex-1 bg-black/45 border-2 border-white/10 focus:border-yellow-500 rounded-xl px-4 py-3 text-xs text-white font-medium outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSheetUrl}
                  className="flex-1 sm:flex-initial px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 text-teal-950 font-black text-xs rounded-xl cursor-pointer shadow-md leading-none flex items-center justify-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save URL</span>
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testLoading}
                  className="flex-1 sm:flex-initial px-4 py-3 bg-white/5 border border-white/15 hover:bg-white/10 text-white font-bold text-xs rounded-xl cursor-pointer leading-none flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
                >
                  {testLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>📡</span>
                      <span>Test Syncer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Synchronizer Block */}
          {isUrlSaved && (
            <div className="mt-2 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Bulk Sheet Database Sync</span>
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-normal font-semibold">
                  Push your entire database of {listings.length} Active Listings, {registeredBuyers.length} Verified Seekers, and {buyerLeads.length} Demands directly onto your connected Google Sheet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBulkSync}
                disabled={bulkSyncLoading}
                className="w-full md:w-auto shrink-0 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50"
              >
                {bulkSyncLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>⚡</span>
                )}
                <span>Sync Entire Database</span>
              </button>
            </div>
          )}

          {/* Sync Progress Tracker */}
          {bulkSyncLoading && (
            <div className="bg-black/45 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider">
                <span className="text-emerald-400 font-bold animate-pulse">{bulkSyncStatus}</span>
                <span className="text-white/60">{bulkSyncProgress}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${bulkSyncProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-3 md:p-4 text-xs font-semibold leading-relaxed">
            <span className="text-white/60">Need to create or set up your Google Sheet webhook?</span>
            <button 
              onClick={() => setShowCode(!showCode)}
              className="text-yellow-500 hover:text-yellow-400 font-extrabold flex items-center gap-1 cursor-pointer select-none text-xs uppercase tracking-wider"
            >
              <span>{showCode ? 'hide setup guide ✕' : 'open setup guide 🛠️'}</span>
            </button>
          </div>

          {showCode && (
            <div className="bg-black/35 border border-white/10 rounded-2xl p-5 space-y-4 text-xs text-white/80 leading-relaxed font-semibold animate-fade-in">
              <div className="space-y-2 border-b border-white/5 pb-4">
                <h4 className="text-yellow-500 font-bold uppercase tracking-wider text-xs flex items-center gap-1">
                  <span>🛠️ Quick 60-Second Setup Guide:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1.5 text-white/70">
                  <li>Create a new <strong className="text-white font-extrabold">Google Sheet</strong> on your Google account.</li>
                  <li>In the Sheets menu tab, click <strong className="text-white font-extrabold">Extensions ➔ Apps Script</strong>.</li>
                  <li>Copy and paste our optimized integration script (displayed below) into the editor.</li>
                  <li>Click <strong className="text-white font-extrabold">Deploy ➔ New deployment</strong> at top-right.</li>
                  <li>Select <strong className="text-white font-extrabold">Web app</strong> type. Under "Execute as" select <strong className="text-white font-extrabold">Me</strong> and under "Who has access" choose <strong className="text-white font-extrabold">Anyone</strong>.</li>
                  <li>Deploy, authorize prompt permissions, and <strong className="text-white font-bold text-yellow-500">Copy the Web App URL</strong> into the input box above!</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-extrabold text-white/45 uppercase tracking-widest">
                    Google Apps Script Integration Code (Code.gs)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                      alert('📋 Script code copied to clipboard! Paste this exactly inside your Google Sheets Apps Script.');
                    }}
                    className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 hover:border-yellow-500/35 text-[10px] uppercase font-bold rounded-lg. cursor-pointer flex items-center gap-1 shadow-sm rounded-lg"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </button>
                </div>
                <pre className="bg-black/55 border border-white/10 p-4 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed select-all max-h-56 text-green-300">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fast2SMS Gateway Configuration Panel */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/20 rounded-3xl p-5 md:p-6 mb-8 relative overflow-hidden shadow-2xl animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-xl">
              🔑
            </div>
            <div>
              <h3 className="text-base font-black text-amber-500 flex items-center gap-1.5 leading-tight">
                <span>Fast2SMS Real OTP SMS Gateway</span>
              </h3>
              <p className="text-xs text-white/55 font-semibold">Enable strict 6-digit physical SMS verification for all user submissions</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${isKeySaved ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
              isKeySaved 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {isKeySaved ? 'SMS Verification Active' : 'SIMULATION MODE (KEY MISSING)'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-amber-500/80 uppercase tracking-widest mb-1.5">
              Fast2SMS authorization API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="password" 
                value={fast2smsKey}
                onChange={(e) => setFast2SMSKeyState(e.target.value)}
                placeholder="Enter Fast2SMS API Key..."
                className="flex-1 bg-black/45 border-2 border-white/10 focus:border-amber-500 rounded-xl px-4 py-3 text-xs text-white font-medium outline-none"
              />
              <button
                onClick={handleSaveFast2SMSKey}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-teal-950 font-black text-xs rounded-xl cursor-pointer shadow-md leading-none flex items-center justify-center gap-1 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save API Key</span>
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-xs font-semibold text-white/70 space-y-2 leading-relaxed">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[10px] tracking-wider">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>How this works:</span>
            </div>
            <p>
              Once your <strong>Fast2SMS authorization Key</strong> is saved, physical SMS OTP codes will be sent onto users' mobile numbers instantly. No more demo/simulated OTPs will be displayed!
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-white/50 font-medium">
              <li>Works on local development, GitHub downloads, and static hosting platforms (like Vercel).</li>
              <li>Ensure your Fast2SMS account has active wallet balance and the <strong>"OTP" or "Quick SMS"</strong> routes are enabled.</li>
              <li>You can get your authorization key for free by creating an account on <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="text-yellow-500 underline font-bold">Fast2SMS.com</a>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Grid of Sections: Left leads sheet, Right listings controller */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        
        {/* Panel 1: Registered buyers notifications alerts list */}
        <div id="panel-notify-buyers" className="bg-slate-900/95 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 transition-all duration-300">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-sm font-extrabold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Registered Alert Contacts</span>
            </h3>
            <button
              onClick={handleExportBuyers}
              className="text-[10px] font-black text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy List</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={buyerSearch}
              onChange={(e) => setBuyerSearch(e.target.value)}
              placeholder="🔍 Search mobile number or district..."
              className="w-full bg-black/35 hover:bg-black/45 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
            {filteredAltBuyers.length === 0 ? (
              <div className="text-center text-xs text-white/30 py-6">No matches found.</div>
            ) : (
              filteredAltBuyers.map((buyer, bIdx) => (
                <div key={bIdx} className="bg-black/25 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-4">
                  <div className="text-xs leading-relaxed font-semibold">
                    <div className="text-white font-bold">📱 {buyer.mobile}</div>
                    <div className="text-white/45 text-[10px] mt-0.5">District: {buyer.district} {buyer.area ? `· Area: ${buyer.area}` : ''} · Regist: {buyer.date}</div>
                  </div>
                  <button
                    onClick={() => onDeleteBuyer(buyer.mobile, buyer.district)}
                    className="p-2 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Customer Buying demands requirement leads */}
        <div id="panel-buyer-leads" className="bg-slate-900/95 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 transition-all duration-300">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-sm font-extrabold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" />
              <span>Demands Requirements Leads</span>
            </h3>
            <button
              onClick={handleExportLeads}
              className="text-[10px] font-black text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Leads</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              placeholder="🔍 Search mobile, type, PO or district..."
              className="w-full bg-black/35 hover:bg-black/45 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
            {filteredLeads.length === 0 ? (
              <div className="text-center text-xs text-white/30 py-6">No leads stored yet.</div>
            ) : (
              filteredLeads.map((lead, lIdx) => (
                <div key={lIdx} className="bg-black/25 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-xs font-semibold leading-relaxed">
                  <div className="space-y-1">
                    <div className="text-white font-bold flex items-center gap-1 text-sm">
                      <span>📱 {lead.mobile}</span>
                      <span className="text-[10px] text-white/35 font-normal">({lead.date})</span>
                    </div>
                    <div className="text-white/50 text-[11px]">
                      District: {lead.district} {lead.po ? `· P.O: ${lead.po}` : ''}
                    </div>
                    {lead.budget && <div className="text-yellow-500/80 font-bold">Budget Cap: ₹{lead.budget}</div>}
                    <div className="text-green-400">Target Spec: {lead.type}</div>
                    {lead.remarks && (
                      <div className="text-yellow-100/60 font-medium italic border-t border-white/5 pt-1.5 mt-1">
                        &ldquo;{lead.remarks}&rdquo;
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteBuyerLead(lIdx)}
                    className="self-end sm:self-auto p-2 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Property listings listings controller (Full width in grid) */}
        <div id="panel-active-listings" className="bg-slate-900/95 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 lg:col-span-2 transition-all duration-300">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-sm font-extrabold text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark className="w-4 h-4" />
              <span>{lang === 'bn' ? 'সম্পত্তি বিজ্ঞাপন তালিকা পরিচালক' : 'Property Ads Listings Manager'}</span>
            </h3>
          </div>

          <div className="space-y-3">
            {listings.length === 0 ? (
              <div className="text-center text-xs text-white/30 py-6">
                {lang === 'bn' ? 'প্রদর্শনের জন্য কোনো সম্পত্তি তালিকাভুক্ত করা হয়নি।' : 'No properties posted to display.'}
              </div>
            ) : (
              listings.map((item) => (
                <div key={item.id} className="bg-black/25 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-black/40 transition-colors">
                  <div className="text-xs font-semibold leading-relaxed">
                    <div className="text-sm text-yellow-500 font-black">
                      ₹ {item.price} {item.negotiable ? (lang === 'bn' ? '(দরাদরি যোগ্য)' : '(Negotiable)') : ''}
                    </div>
                    <div className="text-white/60">
                      📍 {item.po}, {getDistrictLabel(item.district, lang)}, {lang === 'bn' ? 'পশ্চিমবঙ্গ' : 'West Bengal'}
                    </div>
                    {(item.road || item.landmark) && (
                      <div className="text-amber-300 font-bold text-[11px] mt-0.5 flex flex-wrap gap-x-2">
                        {item.road && <span>🛣️ {lang === 'bn' ? 'রাস্তা/এলাকা' : 'Road/Street'}: {item.road}</span>}
                        {item.landmark && <span>🏢 {lang === 'bn' ? 'ল্যান্ডমার্ক' : 'Landmark'}: {item.landmark}</span>}
                      </div>
                    )}
                    <div className="text-emerald-400 font-bold mt-1">
                      {lang === 'bn' ? 'বিবরণ' : 'Specs'}: {getTypeLabel(item.type, lang)} · {item.size} {getUnitLabel(item.unit, lang)} · {lang === 'bn' ? 'যোগাযোগ' : 'Contact'}: {item.mobile}
                    </div>
                    {item.specialRemarks && (
                      <div className="text-white/45 text-[10px] mt-1 bg-white/5 border border-white/5 px-2 py-1 rounded-md max-w-lg italic">
                        {lang === 'bn' ? 'মন্তব্য' : 'Remark'}: {item.specialRemarks}
                      </div>
                    )}
                    <span className={`text-[10px] font-black inline-block mt-1 px-2.5 py-0.5 rounded-full ${
                      item.sold 
                        ? 'bg-red-500/10 border border-red-500 text-red-500' 
                        : 'bg-green-500/10 border border-green-500 text-green-400'
                    }`}>
                      {item.sold 
                        ? (lang === 'bn' ? 'বিক্রি হয়ে গেছে (স্বয়ংক্রিয় মুছে ফেলা প্রক্রিয়াধীন)' : 'SOLD (Auto-delete pending)') 
                        : (lang === 'bn' ? 'বিজ্ঞাপন সক্রিয় রয়েছে' : 'Ad Active')}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteListing(item.id)}
                    className="self-start sm:self-auto px-4 py-2.5 bg-red-600/15 hover:bg-red-600 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-white rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer leading-none flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'বিজ্ঞাপন মুছুন' : 'Delete Ad'}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 4: Visitor Suggestions Box and Feedback list */}
        <div id="panel-suggestions" className="bg-slate-900/95 border border-white/10 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col gap-4 lg:col-span-2 transition-all duration-300">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-sm font-extrabold text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>💡</span>
              <span>Visitor Improvement Suggestions ({suggestions.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center text-xs text-white/30 py-8">
                🏖️ No visitor suggestions stored yet.
              </div>
            ) : (
              suggestions.map((item) => (
                <div key={item.id} className="bg-black/25 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 transition-colors">
                  <div className="text-xs font-semibold leading-relaxed space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-black">
                        {item.category}
                      </span>
                      <span className="text-white font-bold">{item.name}</span>
                      <span className="text-white/35 font-normal text-[10px]">({item.date})</span>
                    </div>
                    {item.contact && item.contact !== 'N/A' && (
                      <div className="text-[11px] text-white/50">
                        Contact Info: <span className="text-white/85 font-black">{item.contact}</span>
                      </div>
                    )}
                    <p className="text-white/80 text-xs mt-2 pl-2 border-l-2 border-yellow-500 italic bg-white/5 p-2 rounded-lg">
                      &ldquo;{item.suggestion}&rdquo;
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteSuggestion(item.id)}
                    className="self-end sm:self-auto p-2 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    title="Delete suggestion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
