import { useState, FormEvent, useEffect } from 'react';
import { ArrowLeft, Search, Filter, Share2, MapPin, CheckCircle, Video, Lock, Phone, MessageSquare, ExternalLink, X, Key, Home, Sprout, Store, Trees, Waves, Building } from 'lucide-react';
import { T, WB_DISTRICTS, WB_DISTRICTS_BN, TYPE_MAP, FACING_MAP, UNIT_MAP } from '../translations';
import { Listing, RecentSearch } from '../types';

interface ListingsViewProps {
  lang: 'bn' | 'en';
  listings: Listing[];
  unlockedList: number[];
  buyerLoggedInMobile?: string;
  buyerLoggedInName?: string;
  onBuyerLogin?: (mobile: string, name: string) => void;
  onBuyerLogout?: () => void;
  onBack: () => void;
  onUnlockSuccess: (id: number, name?: string, mobile?: string) => void;
  onToggleSold: (id: number, mobile: string) => void;
  onDeleteListing: (id: number, mobile: string) => boolean;
  initialSearchQuery?: string;
}

export default function ListingsView({
  lang,
  listings,
  unlockedList,
  buyerLoggedInMobile = '',
  buyerLoggedInName = '',
  onBuyerLogin,
  onBuyerLogout,
  onBack,
  onUnlockSuccess,
  onToggleSold,
  onDeleteListing,
  initialSearchQuery = ''
}: ListingsViewProps) {
  const t = T[lang];

  // Listing comparison states
  const [comparedIds, setComparedIds] = useState<number[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Bento gallery viewer state
  const [galleryItem, setGalleryItem] = useState<Listing | null>(null);

  const toggleComparison = (id: number) => {
    setComparedIds((prev) => {
      if (prev.includes(id)) {
        setCompareError(null);
        return prev.filter((item0) => item0 !== id);
      }
      if (prev.length >= 3) {
        setCompareError(
          lang === 'bn' 
            ? '⚠️ সর্বোচ্চ ৩টি সম্পত্তি একসাথে তুলনা করতে পারেন!' 
            : '⚠️ You can compare up to 3 properties maximum at a time!'
        );
        setTimeout(() => setCompareError(null), 3000);
        return prev;
      }
      setCompareError(null);
      return [...prev, id];
    });
  };

  // Search & Filter state
  const [query, setQuery] = useState(initialSearchQuery);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPrice, setFilterPrice] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc'>('newest');
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [sliderMaxPrice, setSliderMaxPrice] = useState(100000000);
  const [priceFilterMode, setPriceFilterMode] = useState<'bracket' | 'slider'>('bracket');

  // Sync support for price bracket select dropdown and custom slider
  const getCurrentPriceDropdownValue = () => {
    if (filterPrice === '') return '';
    if (filterPrice === 'under_10') return 'under_10';
    if (filterPrice === 'ten_thirty') return 'ten_thirty';
    if (filterPrice === 'thirty_fifty') return 'thirty_fifty';
    if (filterPrice === 'fifty_crore') return 'fifty_crore';
    if (filterPrice === 'hundred_up') return 'hundred_up';
    
    // Fallback if slider is set to a custom value
    if (sliderMaxPrice <= 1000000) return 'under_10';
    if (sliderMaxPrice <= 3000000) return 'ten_thirty';
    if (sliderMaxPrice <= 5000000) return 'thirty_fifty';
    if (sliderMaxPrice <= 10000000) return 'fifty_crore';
    return 'hundred_up';
  };

  const handlePriceDropdownChange = (val: string) => {
    setPriceFilterMode('bracket');
    setFilterPrice(val);
    if (val === '') {
      setSliderMaxPrice(100000000);
    } else if (val === 'under_10') {
      setSliderMaxPrice(1000000);
    } else if (val === 'ten_thirty') {
      setSliderMaxPrice(3000000);
    } else if (val === 'thirty_fifty') {
      setSliderMaxPrice(5000000);
    } else if (val === 'fifty_crore') {
      setSliderMaxPrice(10000000);
    } else if (val === 'hundred_up') {
      setSliderMaxPrice(100000000);
    }
  };

  // Trigger skeleton loading animation briefly when search/filters change to simulate data retrieval
  useEffect(() => {
    setIsGridLoading(true);
    const timer = setTimeout(() => {
      setIsGridLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [query, filterDistrict, filterType, filterPrice, filterStatus, sliderMaxPrice, sortBy, priceFilterMode]);

  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches on Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bm_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches', e);
    }
  }, []);

  // Save new unique search triggers with a debounce delay of 1200ms
  useEffect(() => {
    const trimmedQuery = query.trim();
    // Do not save active search when completely empty default state
    if (!trimmedQuery && !filterDistrict && !filterType && !filterPrice && !filterStatus) {
      return;
    }

    const timer = setTimeout(() => {
      const newSearch: RecentSearch = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        query: trimmedQuery,
        filterDistrict,
        filterType,
        filterPrice,
        filterStatus,
      };

      setRecentSearches((prev) => {
        const duplicatesRemoved = prev.filter(
          (s) =>
            s.query.trim().toLowerCase() !== trimmedQuery.toLowerCase() ||
            s.filterDistrict !== filterDistrict ||
            s.filterType !== filterType ||
            s.filterPrice !== filterPrice ||
            s.filterStatus !== filterStatus
        );

        const updated = [newSearch, ...duplicatesRemoved].slice(0, 5);
        try {
          localStorage.setItem('bm_recent_searches', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to store recent searches', e);
        }
        return updated;
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [query, filterDistrict, filterType, filterPrice, filterStatus]);

  const handleApplyRecentSearch = (search: RecentSearch) => {
    setQuery(search.query);
    setFilterDistrict(search.filterDistrict);
    setFilterType(search.filterType);
    setFilterPrice(search.filterPrice);
    setFilterStatus(search.filterStatus || '');
    setPriceFilterMode('bracket');
    if (search.filterPrice === 'under_10') setSliderMaxPrice(1000000);
    else if (search.filterPrice === 'ten_thirty') setSliderMaxPrice(3000000);
    else if (search.filterPrice === 'thirty_fifty') setSliderMaxPrice(5000000);
    else if (search.filterPrice === 'fifty_crore') setSliderMaxPrice(10000000);
    else if (search.filterPrice === 'hundred_up') setSliderMaxPrice(100000000);
  };

  const handleDeleteRecentSearch = (id: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('bm_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to store recent searches after delete', e);
      }
      return updated;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('bm_recent_searches');
    } catch (e) {
      console.error('Failed to clear recent searches', e);
    }
  };

  const getSearchDisplayLabel = (search: RecentSearch) => {
    const parts: string[] = [];
    if (search.query.trim()) {
      parts.push(`"${search.query.trim()}"`);
    }
    if (search.filterDistrict) {
      parts.push(getDistrictLabel(search.filterDistrict));
    }
    if (search.filterType) {
      parts.push(getTypeLabel(search.filterType));
    }
    if (search.filterPrice) {
      if (search.filterPrice === 'under_10') parts.push(lang === 'bn' ? '১০ লাখের কম' : '< 10 Lakh');
      else if (search.filterPrice === 'ten_thirty') parts.push(lang === 'bn' ? '১০–৩০ লাখ' : '10L - 30L');
      else if (search.filterPrice === 'thirty_fifty') parts.push(lang === 'bn' ? '৩০–৫০ লাখ' : '30L - 50L');
      else if (search.filterPrice === 'fifty_crore') parts.push(lang === 'bn' ? '৫০ লাখ–১ কোটি' : '50L - 1Cr');
      else if (search.filterPrice === 'hundred_up') parts.push(lang === 'bn' ? '১ কোটির বেশি' : '1Cr+');
    }
    if (search.filterStatus) {
      if (search.filterStatus === 'sold') parts.push(lang === 'bn' ? 'বিক্রি হওয়া' : 'Sold');
      else if (search.filterStatus === 'sale') parts.push(lang === 'bn' ? 'বিক্রির জন্য' : 'For Sale');
    }
    return parts.join(' · ') || (lang === 'bn' ? 'সব ধরণের বিজ্ঞাপন' : 'All Listings');
  };

  // Sync initial search from home feed click
  useEffect(() => {
    if (initialSearchQuery) {
      setQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Unlock Modal Flow
  const [activeUnlockId, setActiveUnlockId] = useState<number | null>(null);
  const [paymentStep, setPaymentStep] = useState(true);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEntry, setOtpEntry] = useState(['', '', '', '', '', '']);
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [isUnlockedNow, setIsUnlockedNow] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);

  // OTP Resend & Timer
  const [otpTimer, setOtpTimer] = useState(30);
  const [canResendOtp, setCanResendOtp] = useState(false);
  
  // Real high-security details mapping
  const [isSimulated, setIsSimulated] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');

  useEffect(() => {
    let interval: any;
    if (otpStep) {
      setOtpTimer(30);
      setCanResendOtp(false);
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpStep]);

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    setOtpEntry(['', '', '', '', '', '']);
    setOtpTimer(30);
    setCanResendOtp(false);
    setOtpErr(null);

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: buyerName.trim(), mobile: buyerMobile.trim() })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }

      if (!res.ok) {
        setOtpErr(data.error || "Failed to resend verification OTP. Please try again.");
        return;
      }

      if (data.simulated) {
        setIsSimulated(true);
        setSimulatedCode(data.code);
      } else {
        setIsSimulated(false);
        setSimulatedCode('');
      }
    } catch {
      setOtpErr("Server connection timed out. Please try again.");
    }
  };

  // Buyer Details input state for Unlocking
  const [buyerName, setBuyerName] = useState('');
  const [buyerMobile, setBuyerMobile] = useState('');
  const [buyerFormErr, setBuyerFormErr] = useState<string | null>(null);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);

  // Status Change Verification Modal
  const [verifyId, setVerifyId] = useState<number | null>(null);
  const [verifyMobile, setVerifyMobile] = useState('');
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [verifyMode, setVerifyMode] = useState<'status' | 'delete'>('status');

  // Seller OTP validation states for Edit/Delete actions
  const [verifyOtpStep, setVerifyOtpStep] = useState(false);
  const [verifyOtpEntry, setVerifyOtpEntry] = useState(['', '', '', '', '', '']);
  const [verifyIsSimulated, setVerifyIsSimulated] = useState(false);
  const [verifySimulatedCode, setVerifySimulatedCode] = useState('');
  const [verifyGatewayError, setVerifyGatewayError] = useState<string | null>(null);
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);

  const handleCloseVerifyModal = () => {
    setVerifyId(null);
    setVerifyMobile('');
    setVerifyErr(null);
    setVerifyOtpStep(false);
    setVerifyOtpEntry(['', '', '', '', '', '']);
    setVerifyIsSimulated(false);
    setVerifySimulatedCode('');
    setVerifyGatewayError(null);
    setVerifyOtpLoading(false);
  };

  const handleSellerOtpDigitInput = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const nextArr = [...verifyOtpEntry];
    nextArr[index] = value;
    setVerifyOtpEntry(nextArr);

    if (value && index < 5) {
      document.getElementById(`seller-otp-${index + 1}`)?.focus();
    } else if (!value && index > 0) {
      document.getElementById(`seller-otp-${index - 1}`)?.focus();
    }
  };

  // Helpers to fetch localized labels safely
  const getTypeLabel = (v: string) => {
    return lang === 'en' ? (TYPE_MAP[v] || v) : v;
  };

  const getFacingLabel = (v: string) => {
    return lang === 'en' ? (FACING_MAP[v] || v) : v;
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

  const formatLakhs = (val: number) => {
    if (val >= 100000000) {
      return lang === 'bn' ? '১০ কোটি+' : '10 Crore+';
    }
    if (val >= 10000000) {
      const crores = val / 10000000;
      return lang === 'bn'
        ? `${crores.toFixed(1).replace('.0', '')} কোটি`
        : `${crores.toFixed(1).replace('.0', '')} Crore`;
    }
    const lakhs = val / 100000;
    return lang === 'bn' 
      ? `${lakhs.toFixed(1).replace('.0', '')} লাখ` 
      : `${lakhs.toFixed(1).replace('.0', '')}L`;
  };

  const maskPhone = (num: string) => {
    return num.substring(0, 3) + 'XXXXXXX';
  };

  const handleShare = (item: Listing) => {
    const locDistrict = getDistrictLabel(item.district);
    const itemType = getTypeLabel(item.type);
    const itemUnit = getUnitLabel(item.unit);
    const priceText = item.price.startsWith('₹') ? item.price : `₹${item.price}`;
    const priceSuffix = item.negotiable ? ' (Negotiable)' : '';
    
    const descText = `NEW LISTING — BrokerMukto.com
Direct from Owner. Zero Brokerage.
📍 Location: ${item.po}, ${locDistrict}, West Bengal
🏘️ Area/Locality: ${item.road || item.po}
🛤️ Landmark: ${item.landmark || 'Nearby'}
🌿 Type: ${itemType}
📐 Size: ${item.size} ${itemUnit}
💰 Price: ${priceText}${priceSuffix}
👉 View full details & contact seller directly:
www.brokermukto.com
No middlemen. No hidden fees. Just direct deals.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(descText)}`, '_blank');
  };

  // Run filters & sort
  const filteredListings = listings.filter((item) => {
    const qValue = query.toLowerCase().trim();
    const poMatch = item.po?.toLowerCase().includes(qValue);
    const roadMatch = item.road?.toLowerCase().includes(qValue);
    const landmarkMatch = item.landmark?.toLowerCase().includes(qValue);
    const districtMatch = item.district?.toLowerCase().includes(qValue);

    if (qValue && !poMatch && !roadMatch && !landmarkMatch && !districtMatch) return false;
    if (filterType && item.type !== filterType) return false;

    if (filterPrice === 'under_10' && item.priceNum >= 1000000) return false;
    if (filterPrice === 'ten_thirty' && (item.priceNum < 1000000 || item.priceNum > 3000000)) return false;
    if (filterPrice === 'thirty_fifty' && (item.priceNum < 3000000 || item.priceNum > 5000000)) return false;
    if (filterPrice === 'fifty_crore' && (item.priceNum < 5000000 || item.priceNum > 10000000)) return false;
    if (filterPrice === 'hundred_up' && item.priceNum < 10000000) return false;
    if (item.priceNum > sliderMaxPrice) return false;

    if (filterStatus === 'sold' && !item.sold) return false;
    if (filterStatus === 'sale' && item.sold) return false;

    if (filterDistrict && item.district !== filterDistrict) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') {
      return a.priceNum - b.priceNum;
    }
    // Default: Newest First (descending order of ID)
    return b.id - a.id;
  });

  // Direct bypass list of seller info if buyer is logged in
  const handleDirectUnlockForLoggedInBuyer = () => {
    if (!buyerLoggedInMobile) return;
    setLoadingPay(true);
    // Simulate a reassuring micro delay for sensory tactile click satisfaction
    setTimeout(() => {
      setLoadingPay(false);
      if (activeUnlockId) {
        onUnlockSuccess(activeUnlockId, buyerLoggedInName, buyerLoggedInMobile);
        setIsUnlockedNow(true);
        setPaymentStep(false);
        setOtpStep(false);
        setOtpErr(null);
      }
    }, 450);
  };

  // Pay / Fill details to unlock seller mobile (Direct OTP verification request)
  const handleBuyerSubmitDetails = async (e: FormEvent) => {
    e.preventDefault();
    setBuyerFormErr(null);

    const trimmedName = buyerName.trim();
    const trimmedMobile = buyerMobile.trim();

    if (!trimmedName) {
      setBuyerFormErr(lang === 'bn' ? '⚠️ আপনার নাম লিখুন' : '⚠️ Please enter your Name');
      return;
    }
    // High-security verification validator for real active Indian mobile numbers (must start with 6-9)
    if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
      setBuyerFormErr(lang === 'bn' 
        ? '⚠️ সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন (৬, ৭, ৮ বা ৯ দিয়ে শুরু হতে হবে)' 
        : '⚠️ Invalid Number. Standard Indian mobile numbers start with 6, 7, 8 or 9.');
      return;
    }

    if (!agreedDisclaimer) {
      setBuyerFormErr(lang === 'bn' ? '⚠️ এগিয়ে যাওয়ার আগে অনুগ্রহ করে নিচের ঘোষণা ও শর্তাবলীতে সম্মত হন।' : '⚠️ Please agree to the disclaimer terms below.');
      return;
    }

    setLoadingPay(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, mobile: trimmedMobile })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }
      setLoadingPay(false);

      if (!res.ok) {
        setBuyerFormErr(data.error || (lang === 'bn' ? '⚠️ ওটিপি পাঠাতে ব্যর্থ হয়েছে।' : '⚠️ Failed to send OTP. Please try again.'));
        return;
      }

      setPaymentStep(false);
      setOtpStep(true);
      setOtpErr(null);
      if (data.simulated) {
        setIsSimulated(true);
        setSimulatedCode(data.code || '');
        if (data.gatewayError) {
          // If the gateway returned a non-blocking OTP configuration error, let user know gently so it does not block testing!
          setOtpErr(`[Gateway Sandbox Mode] ${data.gatewayError}`);
        }
      } else {
        setIsSimulated(false);
        setSimulatedCode('');
      }
    } catch {
      setLoadingPay(false);
      setBuyerFormErr(lang === 'bn' ? '⚠️ সার্ভার সংযোগ করা যায়নি।' : '⚠️ Server request timed out. Please check network connections.');
    }
  };

  const handleOtpDigitInput = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const nextArr = [...otpEntry];
    nextArr[index] = value;
    setOtpEntry(nextArr);

    if (value && index < 5) {
      document.getElementById(`buyer-otp-${index + 1}`)?.focus();
    } else if (!value && index > 0) {
      document.getElementById(`buyer-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtpValue = async () => {
    const code = otpEntry.join('');
    if (code.length !== 6) {
      setOtpErr(t.otpTooShort);
      return;
    }

    setLoadingPay(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: buyerMobile.trim(), code })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }
      setLoadingPay(false);

      if (!res.ok) {
        setOtpErr(data.error || t.otpWrong);
        setOtpEntry(['', '', '', '', '', '']);
        document.getElementById('buyer-otp-0')?.focus();
        return;
      }

      // Success! Log the user session in so they are persistently saved
      if (onBuyerLogin) {
        onBuyerLogin(buyerMobile.trim(), buyerName.trim());
      }

      if (activeUnlockId) {
        onUnlockSuccess(activeUnlockId, buyerName.trim(), buyerMobile.trim());
        setIsUnlockedNow(true);
        setOtpStep(false);
        setOtpErr(null);
      }
    } catch {
      setLoadingPay(false);
      setOtpErr("Server verification request timed out. Please retry.");
    }
  };

  const closeUnlockModal = () => {
    setActiveUnlockId(null);
    setPaymentStep(true);
    setOtpStep(false);
    setIsUnlockedNow(false);
    setOtpEntry(['', '', '', '', '', '']);
    setOtpErr(null);
    setBuyerName('');
    setBuyerMobile('');
    setBuyerFormErr(null);
    setAgreedDisclaimer(false);
    setIsSimulated(false);
    setSimulatedCode('');
  };

  // Status / Delete request OTP trigger (Step 1)
  const handleVerifyRequestOtp = async () => {
    const target = listings.find((l) => l.id === verifyId);
    if (!target) return;

    const trimmedMobile = verifyMobile.trim();
    if (trimmedMobile !== target.mobile) {
      setVerifyErr(t.verifyErr);
      return;
    }

    setVerifyOtpLoading(true);
    setVerifyErr(null);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: 'Seller', mobile: trimmedMobile })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }
      setVerifyOtpLoading(false);

      if (!res.ok) {
        setVerifyErr(data.error || (lang === 'bn' ? "OTP পাঠাতে ব্যর্থ হয়েছে।" : "Failed to send verification OTP."));
        return;
      }

      setVerifyOtpStep(true);
      if (data.simulated) {
        setVerifyIsSimulated(true);
        setVerifySimulatedCode(data.code || '');
        setVerifyGatewayError(data.gatewayError || null);
      } else {
        setVerifyIsSimulated(false);
        setVerifySimulatedCode('');
        setVerifyGatewayError(null);
      }
    } catch (err) {
      setVerifyOtpLoading(false);
      setVerifyErr(lang === 'bn' ? '❌ নেটওয়ার্ক বা সার্ভার সংযোগ ত্রুটি।' : '❌ Network or server connection error.');
    }
  };

  // Verify OTP & Complete Status/Delete (Step 2)
  const handleVerifyOtpAndExecute = async () => {
    const target = listings.find((l) => l.id === verifyId);
    if (!target) return;

    const code = verifyOtpEntry.join('');
    if (code.length !== 6) {
      setVerifyErr(lang === 'bn' ? '⚠️ অনুগ্রহ করে ৬ সংখ্যার ওটিপি দিন।' : '⚠️ Please enter all 6 OTP digits.');
      return;
    }

    setVerifyOtpLoading(true);
    setVerifyErr(null);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: verifyMobile.trim(), code })
      });
      const contentType = res.headers.get("content-type");
      let data: any = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || "Server returned non-JSON error");
      }
      setVerifyOtpLoading(false);

      if (!res.ok) {
        setVerifyErr(data.error || t.otpWrong);
        setVerifyOtpEntry(['', '', '', '', '', '']);
        document.getElementById('seller-otp-0')?.focus();
        return;
      }

      // Success! Move to actual execution
      const trimmedMobile = verifyMobile.trim();
      if (verifyMode === 'delete') {
        const success = onDeleteListing(target.id, trimmedMobile);
        if (success) {
          handleCloseVerifyModal();
        } else {
          setVerifyErr(lang === 'bn' ? '⚠️ তথ্য পাওয়া যায়নি বা ডিলিট করা যায়নি।' : '⚠️ Listing could not be deleted.');
        }
      } else {
        onToggleSold(target.id, trimmedMobile);
        handleCloseVerifyModal();
      }
    } catch (err) {
      setVerifyOtpLoading(false);
      setVerifyErr(lang === 'bn' ? '❌ নেটওয়ার্ক বা সার্ভার সংযোগ ত্রুটি।' : '❌ Network or server connection error.');
    }
  };

  const activeUnlockItem = listings.find((l) => l.id === activeUnlockId);

  return (
    <div id="listings-view" className="w-full pb-16 relative">
      
      {/* Elegant Header Card Box with unified controls and navigation */}
      <div className="w-full pt-1">
        <div className="bg-slate-900/90 border border-yellow-500/25 rounded-2xl p-3 md:p-4 mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="space-y-0.5">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-1.5 leading-none">
              🗺️ {t.lTitle}
            </h2>
            <p className="text-[10px] md:text-xs text-yellow-500/70 font-bold tracking-wide">
              {lang === 'bn' ? 'পশ্চিমবঙ্গের সব দালাল-মুক্ত ফ্রি সম্পত্তির বিজ্ঞাপন' : 'Directory of all broker-free land property listings across West Bengal'}
            </p>
          </div>
          <button 
            onClick={onBack}
            className="self-start sm:self-auto shrink-0 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-teal-950 border border-yellow-500/30 hover:border-yellow-400 rounded-xl px-4 py-2 text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer select-none group uppercase tracking-wider"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            <span>{lang === 'bn' ? 'হোমে যান' : 'Go Home'}</span>
          </button>
        </div>
      </div>

      {/* Filters wrapper */}
      <div className="bg-slate-900/95 border-b border-white/5 py-2 mt-1 mb-2 sticky top-20 z-40 backdrop-blur-lg">
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          
          {/* Search bar */}
          <div className="relative col-span-2 sm:col-span-2 lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPh}
              className="w-full bg-black/30 hover:bg-black/40 border border-white/10 focus:border-yellow-500 rounded-xl py-2 pl-9 pr-3 text-xs md:text-sm font-semibold text-white outline-none placeholder-white/35 transition-colors"
            />
          </div>

          {/* District dropdown */}
          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="col-span-1 bg-black/30 hover:bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-white outline-none cursor-pointer transition-colors"
          >
            <option value="" className="bg-teal-900 text-white">{t.filterDistrictAll}</option>
            {WB_DISTRICTS.map((d, index) => (
              <option key={d} value={d} className="bg-teal-900 text-white">
                📍 {lang === 'bn' ? WB_DISTRICTS_BN[index] : d}
              </option>
            ))}
          </select>

          {/* Type dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="col-span-1 bg-black/30 hover:bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-white outline-none cursor-pointer transition-colors"
          >
            <option value="" className="bg-teal-900 text-white">{t.filterTypeAll}</option>
            {t.filterTypeOpts.map((opt, i) => (
              <option key={opt} value={['कृषि জমি','বাসস্থান','বাণিজ্যিক','বাগান','পুকুর সহ','অন্যান্য'][i]} className="bg-teal-900 text-white">
                🌿 {opt}
              </option>
            ))}
          </select>

          {/* Status dropdown (All, Sold, For Sale) */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="col-span-1 bg-black/30 hover:bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-white outline-none cursor-pointer transition-colors"
          >
            <option value="" className="bg-teal-900 text-white">{t.filterStatusAll}</option>
            <option value="sale" className="bg-teal-900 text-white">{t.filterStatusSale}</option>
            <option value="sold" className="bg-teal-900 text-white">{t.filterStatusSold}</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_asc')}
            className="col-span-1 bg-black/30 hover:bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-white outline-none cursor-pointer transition-colors"
          >
            <option value="newest" className="bg-teal-900 text-white">{t.sortNewest}</option>
            <option value="price_asc" className="bg-teal-900 text-white">{t.sortPriceAsc}</option>
          </select>

        </div>

        {/* Dynamic Budget Controller Panel */}
        <div className="w-full mt-2 pt-2 border-t border-white/5 flex flex-col lg:flex-row gap-2.5 items-center justify-between">
          {/* Predefined Budget Dropdown */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-[10px] text-white/50 font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span>🏷️</span>
              <span>{lang === 'bn' ? 'বাজেট বাকেট:' : 'Budget Brackets:'}</span>
            </span>
            <select
              value={getCurrentPriceDropdownValue()}
              onChange={(e) => handlePriceDropdownChange(e.target.value)}
              className="bg-black/30 hover:bg-black/40 border border-white/15 focus:border-yellow-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-white outline-none cursor-pointer transition-colors hover:border-yellow-500/30"
            >
              <option value="" className="bg-slate-950 text-white">{lang === 'bn' ? 'সব দাম' : 'All Prices'}</option>
              <option value="under_10" className="bg-slate-950 text-white">{lang === 'bn' ? '১০ লাখের কম' : '< 10 Lakh'}</option>
              <option value="ten_thirty" className="bg-slate-950 text-white">{lang === 'bn' ? '১০–৩০ লাখ' : '10L - 30L'}</option>
              <option value="thirty_fifty" className="bg-slate-950 text-white">{lang === 'bn' ? '৩০–৫০ লাখ' : '30L - 50L'}</option>
              <option value="fifty_crore" className="bg-slate-950 text-white">{lang === 'bn' ? '৫০ লাখ–১ কোটি' : '50L - 1Cr'}</option>
              <option value="hundred_up" className="bg-slate-950 text-white">{lang === 'bn' ? '১ কোটির বেশি' : '1Cr+'}</option>
            </select>
          </div>

          {/* Interactive Range Slider */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl w-full lg:w-auto lg:max-w-md shrink-0">
            <div className="flex flex-col min-w-[100px]">
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider leading-none">
                🎛️ {lang === 'bn' ? 'কাস্টম স্লাইডার' : 'Custom Slider'}
              </span>
              <span className="text-xs font-black text-yellow-500 mt-1 leading-none">
                {sliderMaxPrice >= 100000000 
                  ? (lang === 'bn' ? 'সর্বোচ্চ: ১০ কোটি+' : 'Max: 10 Crores+') 
                  : `${lang === 'bn' ? 'সর্বোচ্চ: ' : 'Max: '} ${formatLakhs(sliderMaxPrice)}`}
              </span>
            </div>
            
            <input 
              type="range"
              min={100000}
              max={100000000}
              step={100000}
              value={sliderMaxPrice}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSliderMaxPrice(val);
                // Synchronize dropdown parallel selection
                if (val <= 1000000) {
                  setFilterPrice('under_10');
                } else if (val <= 3000000) {
                  setFilterPrice('ten_thirty');
                } else if (val <= 5000000) {
                  setFilterPrice('thirty_fifty');
                } else if (val <= 10000000) {
                  setFilterPrice('fifty_crore');
                } else {
                  setFilterPrice('hundred_up');
                }
              }}
              className="flex-1 accent-yellow-500 h-1 bg-white/10 rounded-lg cursor-pointer appearance-none outline-none"
            />

            <button
              type="button"
              onClick={() => {
                setSliderMaxPrice(100000000);
                setFilterPrice('');
              }}
              className={`text-[9px] font-bold p-1 px-2 rounded-md ${
                filterPrice !== '' || sliderMaxPrice < 100000000
                  ? 'bg-red-500/25 text-red-400 hover:bg-red-500/35 border border-red-500/10 cursor-pointer' 
                  : 'text-white/30 cursor-not-allowed bg-transparent'
              }`}
              disabled={filterPrice === '' && sliderMaxPrice >= 100000000}
            >
              {lang === 'bn' ? 'রিসেট' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Searches section */}
      {recentSearches.length > 0 && (
        <div id="recent-searches-row" className="w-full mb-3 flex flex-wrap items-center gap-2 animate-fade-in font-sans">
          <span className="text-[10px] text-white/50 font-black uppercase tracking-wider mr-1 flex items-center gap-1">
            <span>⏱️</span>
            <span>{lang === 'bn' ? 'সাম্প্রতিক অনুসন্ধান:' : 'Recent Searches:'}</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {recentSearches.map((search) => (
              <div
                key={search.id}
                onClick={() => handleApplyRecentSearch(search)}
                id={`search-chip-${search.id}`}
                className="group bg-slate-900/80 hover:bg-slate-950 border border-white/10 hover:border-yellow-500/50 rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95 select-none"
              >
                <span className="max-w-[160px] truncate leading-none">
                  {getSearchDisplayLabel(search)}
                </span>
                <button
                  type="button"
                  id={`delete-search-btn-${search.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecentSearch(search.id);
                  }}
                  className="opacity-45 hover:opacity-100 p-0.5 rounded-full hover:bg-white/10 text-white/60 hover:text-red-400 transition-all"
                  title={lang === 'bn' ? 'মুছে ফেলুন' : 'Remove search'}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <button
              type="button"
              id="clear-all-searches-btn"
              onClick={clearAllRecentSearches}
              className="text-[10px] text-red-400/80 hover:text-red-300 font-extrabold uppercase tracking-wider px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer active:scale-95"
            >
              {lang === 'bn' ? 'সব মুছুন' : 'Clear All'}
            </button>
          </div>
        </div>
      )}

      {/* Result Count label */}
      <div className="w-full mb-3">
        <span className="text-xs text-white/50 font-bold uppercase tracking-wider bg-white/5 border border-white/5 px-3 py-1 rounded-full inline-flex items-center gap-2">
          {isGridLoading ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping"></span>
              <span>{lang === 'bn' ? 'অনুসন্ধান করা হচ্ছে...' : 'Updating...'}</span>
            </>
          ) : (
            <span>{filteredListings.length} {t.totalFound}</span>
          )}
        </span>
      </div>

      {/* Listings Container (Grid layout with premium deep drop shadow cards as requested) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isGridLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={`skeleton-${i}`}
              className="bg-slate-900/95 border border-white/5 rounded-3xl p-5 shadow-xl shadow-black/45 relative flex flex-col justify-between animate-pulse"
            >
              <div>
                {/* Status tag placeholder */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="h-6 w-16 bg-white/10 rounded-xl" />
                  <div className="h-4 w-12 bg-white/5 rounded-md" />
                </div>

                {/* Price & Icon placeholder */}
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="h-7 w-28 bg-white/10 rounded-lg" />
                    <div className="flex gap-1.5 pt-1">
                      <div className="h-4 w-14 bg-white/5 rounded-full" />
                      <div className="h-4 w-16 bg-white/5 rounded-full" />
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl" />
                </div>

                {/* Photo slider placeholder */}
                <div className="flex gap-2 mb-4 h-16 w-full select-none overflow-hidden">
                  <div className="w-16 h-16 bg-white/5 rounded-xl shrink-0" />
                  <div className="w-16 h-16 bg-white/5 rounded-xl shrink-0" />
                </div>

                {/* Fields/Specs placeholder */}
                <div className="border-t border-white/5 pt-4 mt-2 space-y-3">
                  <div className="space-y-2">
                    {/* Location line placeholder */}
                    <div className="h-4 w-4/5 bg-white/10 rounded-md" />
                    {/* Landmark / Sublocation line placeholder */}
                    <div className="h-3.5 w-2/3 bg-white/5 rounded-md" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="h-3.5 w-full bg-white/5 rounded-md" />
                    <div className="h-3.5 w-3/4 bg-white/5 rounded-md" />
                  </div>
                </div>
              </div>

              {/* Bottom fields and CTA placeholder */}
              <div className="mt-6 border-t border-white/5 pt-4">
                <div className="text-center h-4 w-4/5 bg-white/5 rounded-md mx-auto mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-9 bg-white/10 rounded-xl" />
                  <div className="h-9 bg-white/10 rounded-xl" />
                </div>
              </div>
            </div>
          ))
        ) : filteredListings.length === 0 ? (
          <div className="col-span-full py-16 text-center text-white/40 font-semibold text-sm">
            🏜️ {t.noListings}
          </div>
        ) : (
          filteredListings.map((item) => {
            const isUnlocked = unlockedList.includes(item.id);
            const isSold = item.sold;

            return (
              <div 
                key={item.id}
                className={`bg-slate-900/95 border rounded-3xl p-5 shadow-xl shadow-black/45 relative flex flex-col justify-between group transition-all duration-300 hover:bg-slate-950 hover:shadow-2xl hover:shadow-yellow-500/5 ${
                  isSold 
                    ? 'opacity-65 border-white/5 bg-black/10' 
                    : 'border-white/10 hover:border-yellow-500/30'
                }`}
              >
                <div>
                  {/* Status tags & Action */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button 
                      onClick={() => {
                        setVerifyMode('status');
                        setVerifyId(item.id);
                        setVerifyMobile('');
                        setVerifyErr(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border select-none transition-transform active:scale-95 ${
                        isSold
                          ? 'bg-red-500/10 border-red-500 text-red-400'
                          : 'bg-green-500/10 border-green-500/50 text-green-400'
                      }`}
                      title={t.sellerOnly}
                    >
                      {isSold ? t.sold : t.forSale}
                    </button>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-white/35 bg-white/5 px-2 py-1 rounded-lg">
                        #{item.id}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComparison(item.id);
                        }}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-wider transition-all border cursor-pointer select-none ${
                          comparedIds.includes(item.id)
                            ? 'bg-yellow-500 border-yellow-500 text-teal-950 font-black shadow-md shadow-yellow-500/10'
                            : 'bg-white/5 border-white/10 text-white/50 hover:border-yellow-500/50 hover:text-white'
                        }`}
                      >
                        {comparedIds.includes(item.id) 
                          ? (lang === 'bn' ? '✓ লিস্টিং' : '✓ Listed') 
                          : (lang === 'bn' ? '➕ তুলনা' : '➕ Compare')}
                      </button>
                    </div>
                  </div>

                  {/* Seller Only Options Hub */}
                  <div className="flex gap-2 mb-4 bg-slate-950/40 border border-white/5 rounded-2xl p-2.5">
                    <button
                      onClick={() => {
                        setVerifyMode('status');
                        setVerifyId(item.id);
                        setVerifyMobile('');
                        setVerifyErr(null);
                      }}
                      className={`flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700/80 border border-white/10 hover:border-yellow-500/20 rounded-xl text-[10px] font-black text-white/90 transition-all uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer`}
                      title={lang === 'bn' ? 'স্ট্যাটাস বদলান' : 'Change status'}
                    >
                      🔄 {isSold ? (lang === 'bn' ? 'বিক্রয় পুনরায় শুরু' : 'Mark For Sale') : (lang === 'bn' ? 'বিক্রিত ঘোষণা' : 'Mark Sold')}
                    </button>
                    <button
                      onClick={() => {
                        setVerifyMode('delete');
                        setVerifyId(item.id);
                        setVerifyMobile('');
                        setVerifyErr(null);
                      }}
                      className="py-1.5 px-3 bg-red-950/20 hover:bg-red-950/40 border border-red-500/15 hover:border-red-500/40 rounded-xl text-[10px] font-black text-red-400 transition-all uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer"
                      title={lang === 'bn' ? 'বিজ্ঞাপন ডিলিট করুন' : 'Delete listing'}
                    >
                      🗑️ {lang === 'bn' ? 'মুছুন' : 'Delete'}
                    </button>
                  </div>

                  {/* Header: Price & Badge info */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="text-2xl font-black text-yellow-500 tracking-tight leading-none">
                        ₹ {item.price}
                      </div>
                      {item.negotiable && (
                        <span className="text-[9px] bg-yellow-500/10 text-yellow-500 font-bold border border-yellow-500/20 px-2 py-0.5 rounded-full inline-block mt-2">
                          {t.negLabel}
                        </span>
                      )}
                      {item.type && (
                        <span className="text-[9px] bg-white/10 text-white/80 font-bold border border-white/5 px-2 py-0.5 rounded-full inline-block mt-2 ml-1">
                          {getTypeLabel(item.type)}
                        </span>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:bg-white/10 group-hover:border-yellow-500/30 transition-all duration-300">
                      {(() => {
                        const lowerType = (item.type || '').toLowerCase();
                        if (lowerType === 'বাসস্থান' || lowerType === 'residential' || lowerType === 'house') {
                          return <Home className="w-5 h-5 text-yellow-500" />;
                        }
                        if (lowerType === 'কৃষি জমি' || lowerType === 'agricultural' || lowerType === 'plot' || lowerType === 'land') {
                          return <Sprout className="w-5 h-5 text-green-400" />;
                        }
                        if (lowerType === 'বাণিজ্যিক' || lowerType === 'commercial' || lowerType === 'shop' || lowerType === 'store') {
                          return <Store className="w-5 h-5 text-blue-400" />;
                        }
                        if (lowerType === 'বাগান' || lowerType === 'garden') {
                          return <Trees className="w-5 h-5 text-emerald-400" />;
                        }
                        if (lowerType === 'পুকুর সহ' || lowerType === 'with pond' || lowerType === 'pond') {
                          return <Waves className="w-5 h-5 text-cyan-400" />;
                        }
                        return <Building className="w-5 h-5 text-amber-500" />;
                      })()}
                    </div>
                  </div>

                  {/* Photos slider preview and Gallery Trigger */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="relative mb-4 group/photos">
                      <div className="flex gap-2 overflow-x-auto pb-1 block select-none h-16 max-w-full scrollbar-none">
                        {item.photos.slice(0, 3).map((src, i) => (
                          <div 
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              setGalleryItem(item);
                            }}
                            className="relative w-16 h-16 rounded-xl border border-white/15 cursor-pointer overflow-hidden group/thumb transition-all duration-300 hover:border-yellow-500 shrink-0"
                          >
                            <img 
                              referrerPolicy="no-referrer"
                              src={src} 
                              alt="Thumbnail preview" 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                            />
                            {i === 2 && item.photos.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] sm:text-xs font-black text-yellow-400">
                                +{item.photos.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Interactive view gallery overlay button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGalleryItem(item);
                          }}
                          className="ml-auto shrink-0 px-3 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-500 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[9px] font-black transition-all cursor-pointer"
                        >
                          <span>🖼️</span>
                          <span>{lang === 'bn' ? 'গ্যালারি' : 'Gallery'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Video Player */}
                  {item.hasVideo && item.videoData && (
                    <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black relative shadow-inner">
                      <video src={item.videoData} controls muted className="w-full max-h-36 object-cover" />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-white px-2 py-1 rounded-md flex items-center gap-1">
                        <Video className="w-3 h-3 text-red-500 animate-pulse" />
                        <span>{t.videoAvail}</span>
                      </div>
                    </div>
                  )}

                  {/* Detailed Specs list */}
                  <div className="space-y-2 mt-4 text-xs font-semibold leading-relaxed border-t border-white/5 pt-4">
                    <div className="flex gap-3">
                      <span className="text-white/35 w-16 shrink-0">{t.locLbl}:</span>
                      <span className="text-white/85">
                        {item.po}, {getDistrictLabel(item.district)}, WB
                      </span>
                    </div>
                    {item.road && (
                      <div className="flex gap-3">
                        <span className="text-white/35 w-16 shrink-0">{t.roadLbl}:</span>
                        <span className="text-white/85">{item.road}</span>
                      </div>
                    )}
                    {item.landmark && (
                      <div className="flex gap-3">
                        <span className="text-white/35 w-16 shrink-0">{t.landLbl}:</span>
                        <span className="text-white/85">{item.landmark}</span>
                      </div>
                    )}
                    {item.size && (
                      <div className="flex gap-3">
                        <span className="text-white/35 w-16 shrink-0">{t.sizeLbl}:</span>
                        <span className="text-white/85">{item.size} {getUnitLabel(item.unit)}</span>
                      </div>
                    )}
                    {item.facing && (
                      <div className="flex gap-3">
                        <span className="text-white/35 w-16 shrink-0">{t.faceLbl}:</span>
                        <span className="text-white/85">{getFacingLabel(item.facing)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer specs / unlock actions */}
                <div className="mt-6 space-y-3">
                  {!isSold ? (
                    isUnlocked ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 shadow-inner">
                        <div className="text-[10px] text-green-400 font-bold uppercase tracking-wide mb-2 text-center flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{t.unlockedLabel}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <a 
                            href={`tel:${item.mobile}`}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 hover:shadow-md transition-all active:scale-95 leading-none decoration-transparent"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{t.callBtn}</span>
                          </a>
                          <a 
                            href={`https://wa.me/91${item.mobile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 hover:shadow-md transition-all active:scale-95 leading-none decoration-transparent"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{t.waBtn}</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/25 border border-white/5 rounded-2xl p-4 text-center">
                        <div className="text-white/30 font-bold tracking-[4px] font-mono text-sm sm:text-base leading-none mb-2 select-none">
                          {maskPhone(item.mobile)}
                        </div>
                        <div className="text-[10px] text-white/40 font-bold mb-3">
                          {t.lockedText}
                        </div>
                        <button 
                          onClick={() => setActiveUnlockId(item.id)}
                          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 border-none rounded-xl text-teal-950 text-xs font-black hover:shadow-md active:scale-95 cursor-pointer leading-none flex items-center justify-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t.unlockBtn}</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-center text-xs font-bold text-red-400">
                      🔴 {t.soldMsg}
                    </div>
                  )}

                  {/* External Map & Social Share triggers */}
                  <div className="grid grid-cols-1 gap-2 border-t border-white/5 pt-3">
                    {item.maps && (
                      <a 
                        href={item.maps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-blue-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 hover:shadow-sm decoration-transparent leading-none"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.mapsBtn}</span>
                      </a>
                    )}
                    
                    <button 
                      onClick={() => handleShare(item)}
                      className="bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 hover:shadow-sm transition-all leading-none cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{t.shareBtn}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* If current listings are filtered, show a direct button under the grid to clear filters and view all listings */}
      {(query !== '' || filterDistrict !== '' || filterType !== '' || filterPrice !== '' || filterStatus !== '' || sortBy !== 'newest') && (
        <div className="max-w-xl mx-auto px-4 mt-8 mb-8 text-center animate-fade-in relative z-10">
          <div className="bg-black/35 border-2 border-yellow-500/30 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3">
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-black text-yellow-400 uppercase tracking-wider">
                {lang === 'bn' ? '🔍 আপনি নির্দিষ্ট লিস্টিং দেখছেন' : '🔍 Viewing Filtered Property'}
              </h4>
              <p className="text-[11px] sm:text-xs text-white/70 font-semibold">
                {lang === 'bn' 
                  ? 'কাগজপত্র ছাড়া সরাসরি সব লিস্টিং দেখতে চান?' 
                  : 'Want to view everything in the West Bengal broker-free database?'}
              </p>
            </div>
            <button
              onClick={() => {
                setQuery('');
                setFilterDistrict('');
                setFilterType('');
                setFilterPrice('');
                setFilterStatus('');
                setSortBy('newest');
                setSliderMaxPrice(100000000);
              }}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 border-none rounded-xl text-teal-950 text-xs sm:text-sm font-extrabold shadow-md cursor-pointer select-none tracking-wide hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>🗺️</span>
              <span>
                {lang === 'bn' 
                  ? 'সব লিস্টিং দেখুন (ডিফল্ট তালিকা)' 
                  : 'Remove Filters & View All Listings'}
              </span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* --- UNLOCK MODAL POPUP --- */}
      {activeUnlockId !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-yellow-500/40 rounded-3xl p-6 relative shadow-2xl animate-scale-up">
            <button 
              onClick={closeUnlockModal}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white mt-1 mb-1">
              {t.modalTitle}
            </h3>
            <p className="text-xs text-yellow-500 font-bold mb-6">
              {activeUnlockItem ? `📍 ${activeUnlockItem.po}, ${getDistrictLabel(activeUnlockItem.district)} · ₹${activeUnlockItem.price}` : ''}
            </p>

            {/* Step 1: Securely Unlock using active Logan session or Login Form */}
            {paymentStep && (
              buyerLoggedInMobile ? (
                <div className="space-y-4 animate-fade-in" id="logged-in-unlock-box">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden text-center space-y-4">
                    <span className="text-[10px] font-extrabold text-green-400 bg-green-950/80 border border-green-500/15 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
                      {lang === 'bn' ? 'অনুমোদিত বায়ার সেশন সক্রিয়' : 'Verified Buyer Session'}
                    </span>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-white/50">{lang === 'bn' ? 'আপনি হিসেবে লগড-ইন আছেন:' : 'You are logged in as:'}</div>
                      <div className="text-base text-yellow-500 font-extrabold">{buyerLoggedInName}</div>
                      <div className="text-xs font-mono text-white/60">({buyerLoggedInMobile})</div>
                    </div>

                    <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3.5 text-xs text-yellow-500 leading-normal font-semibold text-left space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🗝️</span>
                        <span>{lang === 'bn' ? 'সরাসরি বিক্রেতা নম্বর আনলক সিস্টেম' : 'Direct Seller Contact Unlock'}</span>
                      </div>
                      <p className="text-[11px] text-white/70">
                        {lang === 'bn'
                          ? 'BrokerMukto প্ল্যাটফর্মে যোগাযোগ করার জন্য সরাসরি ১টি ট্যাপ দিয়ে এই নম্বরটি তাৎক্ষণিকভাবে আনলক করতে পারবেন।'
                          : 'As a verified broker-free buyer, you can unlock this specific contact detail instantly with a single tap.'}
                      </p>
                      <p className="text-[10px] text-white/40 italic">
                        {lang === 'bn'
                          ? 'ভবিষ্যতে ১টি পেমেন্টে ১টি বিক্রেতা নম্বর আনলক করার পেমেন্ট গেটওয়ে অপশন যুক্ত হবে। বর্তমানে এই সেবাটি সম্পূর্ণ ফ্রি।'
                          : 'In the future, we will transition to a pay-per-unlock system. Right now, this direct unlock is 100% FREE.'}
                      </p>
                    </div>

                    <button
                      onClick={handleDirectUnlockForLoggedInBuyer}
                      disabled={loadingPay}
                      className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-40 rounded-xl text-teal-950 font-black text-xs hover:shadow-md cursor-pointer transition-all active:scale-97 leading-none flex items-center justify-center gap-1.5"
                    >
                      {loadingPay ? (
                        <span className="w-5 h-5 border-2 border-teal-950 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'অনুমোদিত আনলক করতে ট্যাপ করুন' : 'Tap to Instantly Unlock Contact'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBuyerSubmitDetails} className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                    
                    <div className="text-center mb-4">
                      <span className="text-[10px] font-extrabold text-green-400 bg-green-950/80 border border-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5">
                        {lang === 'bn' ? 'ফ্রি আনলক প্রমোশন' : 'FREE Number Unlock'}
                      </span>
                      <div className="text-xs text-white/70 font-semibold">
                        {lang === 'bn'
                          ? 'সরাসরি মালিকের নম্বর দেখতে নিজের নাম ও মোবাইল নম্বর দিন'
                          : 'Fill details below to verify and reveal the direct seller contact'}
                      </div>
                    </div>

                    {buyerFormErr && (
                      <div className="mb-3.5 bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold rounded-xl p-2.5 text-center">
                        {buyerFormErr}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-yellow-500/80 mb-1">
                          {lang === 'bn' ? 'আপনার সম্পূর্ণ নাম' : 'Your Full Name'}
                        </label>
                        <input 
                          type="text" 
                          required
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder={lang === 'bn' ? 'যেমন: সনৎ ব্যানার্জী' : 'e.g. Sanat Banerjee'}
                          className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white outline-none placeholder-white/20 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-yellow-500/80 mb-1">
                          {lang === 'bn' ? 'মোবাইল নম্বর (১০ সংখ্যা)' : 'Mobile Number (10 digits)'}
                        </label>
                        <input 
                          type="tel" 
                          required
                          maxLength={10}
                          value={buyerMobile}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setBuyerMobile(val);
                          }}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white outline-none placeholder-white/20 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="bg-yellow-500/5 border border-yellow-500/25 text-xs text-yellow-500 p-3.5 rounded-2xl my-4 leading-relaxed font-bold">
                      🛡️ {lang === 'bn'
                        ? 'সরাসরি মালিকদের আনলক করা সম্পূর্ণ ফ্রি ও নিরাপদ!'
                        : 'All seller mobile numbers are unlocked 100% FREE & secure!'}
                    </div>

                    {/* Disclaimer Confirmation */}
                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 mb-4">
                      <div className="text-[10px] text-yellow-500 font-extrabold flex items-center gap-1.5 mb-1.5">
                        <span>⚠️</span>
                        <span>{lang === 'bn' ? 'সতর্কীকরণ ও সম্মতি' : 'Warning & Disclaimer'}</span>
                      </div>
                      <p className="text-[9px] text-white/60 leading-normal font-semibold mb-2.5">
                        {lang === 'bn' 
                          ? 'আমি সম্মত হচ্ছি যে BrokerMukto-তে সমস্ত লেনদেন ও মোবাইল বিক্রেতা যোগাযোগ আমার নিজস্ব ঝুঁকিতে সম্পাদিত হবে।'
                          : 'I agree that all seller connection and deals on BrokerMukto.com are conducted entirely at my own risk.'}
                      </p>
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={agreedDisclaimer}
                          onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-white/20 accent-yellow-500 outline-none cursor-pointer mt-0.5"
                        />
                        <span className="text-xs font-black text-white/80 hover:text-white transition-colors">
                          {lang === 'bn' ? 'আমি এই শর্তাবলীতে একমত' : 'I agree to these terms'}
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingPay}
                      className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-40 rounded-xl text-teal-950 font-black text-xs hover:shadow-md cursor-pointer transition-all active:scale-97 leading-none flex items-center justify-center gap-1.5"
                    >
                      {loadingPay ? (
                        <span className="w-5 h-5 border-2 border-teal-950 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'ওটিপি পাঠান ও নম্বর দেখুন' : 'Verify OTP & Reveal Number'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-white/35 text-center">
                    {t.modalSecure}
                  </div>
                </form>
              )
            )}

            {/* Step 2: Verification of simulated OTP code */}
            {otpStep && (
              <div className="space-y-4">
                <div className="text-center mb-1">
                  <div className="w-9 h-9 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                    🔐
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">{t.modalOtpTitle}</h4>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                    {t.modalOtpSubtitle}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/5 text-[11px] text-yellow-500/90 py-2.5 px-3 rounded-xl text-center font-bold">
                  {t.modalOtpHint}
                </div>



                {otpErr && (
                  <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold rounded-xl p-2.5 text-center">
                    {otpErr}
                  </div>
                )}

                <div className="flex gap-2 justify-center mb-3">
                  {otpEntry.map((val, idx) => (
                    <input 
                      key={idx}
                      id={`buyer-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpDigitInput(e.target.value, idx)}
                      className="w-10 h-12 bg-black/55 border-2 border-white/10 focus:border-yellow-500 rounded-xl text-center text-lg font-black text-white outline-none focus:bg-black/80 focus:shadow-inner transition-all"
                    />
                  ))}
                </div>

                {/* Live Countdown Resend Code Section like Amazon / Flipkart */}
                <div className="text-center pb-1">
                  {canResendOtp ? (
                    <button
                      onClick={handleResendOtp}
                      className="text-xs text-yellow-500 hover:text-yellow-400 font-extrabold underline cursor-pointer transition-colors"
                    >
                      {lang === 'bn' ? '🔄 আবার ওটিপি পাঠান (Resend OTP)' : '🔄 Resend OTP Code'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-white/40 font-semibold">
                      {lang === 'bn' 
                        ? `ওটিপি আবার পাঠান ${otpTimer} সেকেন্ডের মধ্যে` 
                        : `Resend OTP in ${otpTimer}s`}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleVerifyOtpValue}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 rounded-xl text-teal-950 font-black text-xs active:scale-97 cursor-pointer transition-all leading-none flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{t.modalOtpSubmit}</span>
                </button>
              </div>
            )}

            {/* Step 3: Success unlock results displaying detailed info */}
            {isUnlockedNow && activeUnlockItem && (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 text-2xl animate-bounce">
                  ✓
                </div>
                <h4 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-1">
                  {t.bTyTitle}
                </h4>
                <div className="text-3xl font-mono font-black text-yellow-500 tracking-widest my-3">
                  {activeUnlockItem.mobile}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <a 
                    href={`tel:${activeUnlockItem.mobile}`}
                    className="bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer leading-none decoration-transparent"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t.callBtn}</span>
                  </a>
                  <a 
                    href={`https://wa.me/91${activeUnlockItem.mobile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer leading-none decoration-transparent"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{t.waBtn}</span>
                  </a>
                </div>

                <button 
                  onClick={closeUnlockModal}
                  className="mt-6 w-full py-3 border border-white/20 hover:border-white rounded-xl text-white/80 hover:text-white font-bold text-xs cursor-pointer select-none transition-all leading-none"
                >
                  {t.tyCloseBtn}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* --- SELLER STATUS VERIFY MODAL --- */}
      {verifyId !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-yellow-500/40 rounded-3xl p-6 relative shadow-2xl animate-scale-up text-left">
            <button 
              onClick={handleCloseVerifyModal}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white mt-1 mb-1">
              {verifyMode === 'delete' 
                ? (lang === 'bn' ? '🗑️ বিজ্ঞাপন স্থায়ীভাবে মুছুন' : '🗑️ Delete Listing Permanently') 
                : (lang === 'bn' ? '🔄 বিজ্ঞাপন স্ট্যাটাস পরিবর্তন' : '🔄 Modify Listing Status')}
            </h3>
            <p className="text-xs text-white/50 mb-6 leading-relaxed">
              {!verifyOtpStep
                ? (verifyMode === 'delete'
                  ? (lang === 'bn' ? 'আপনার বিজ্ঞাপন ডিলিট করতে লিস্টিং দেওয়ার সময় যে মোবাইল নম্বর ব্যবহার করেছিলেন সেটি দিয়ে ভেরিফাই করুন।' : 'Verify your listing mobile number to confirm ownership and delete this property permanently.')
                  : (lang === 'bn' ? 'আপনার বিজ্ঞাপনের স্ট্যাটাস পরিবর্তন করতে লিস্টিং দেওয়ার সময় ব্যবহৃত মোবাইল নম্বরটি লিখুন।' : 'Verify your listing mobile number to change the status of this property.'))
                : (lang === 'bn' ? 'আপনার মোবাইল নম্বরে পাঠানো ৬ সংখ্যার OTP কোডটি নিচে দিন।' : 'Enter the 6-digit verification code sent to your mobile.')}
            </p>

            <div className="space-y-4">
              {!verifyOtpStep ? (
                /* Step 1: Input Mobile Number */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/75 mb-1.5">{t.verifyLbl}</label>
                    <input 
                      type="tel"
                      value={verifyMobile}
                      onChange={(e) => setVerifyMobile(e.target.value)}
                      placeholder={t.verifyMobPh}
                      className="w-full bg-black/35 hover:bg-black/45 border border-white/15 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white outline-none placeholder-white/30 transition-colors"
                    />
                  </div>

                  {verifyErr && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold rounded-xl p-2.5">
                      {verifyErr}
                    </div>
                  )}

                  <button
                    onClick={handleVerifyRequestOtp}
                    disabled={verifyOtpLoading}
                    className={`w-full py-3.5 rounded-xl text-teal-950 font-black text-sm active:scale-97 cursor-pointer transition-all leading-none flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      verifyMode === 'delete'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white'
                        : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-teal-950'
                    }`}
                  >
                    {verifyOtpLoading ? (
                      <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>
                          {lang === 'bn' ? 'ওটিপি (OTP) পাঠান' : 'Send Verification OTP'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Step 2: Verification Screen with Simulated Code Support */
                <div className="space-y-4">
                  {verifyIsSimulated && (
                    <div className="bg-yellow-500/10 border-2 border-yellow-500/40 rounded-2xl p-3 text-center space-y-1">
                      <span className="text-[10px] uppercase font-black tracking-widest text-yellow-500 block mb-1">
                        🛠️ Sandbox Simulated Device SMS
                      </span>
                      <p className="text-sm font-mono font-black text-white">
                        OTP Code: <span className="text-yellow-400 font-black tracking-widest select-all">{verifySimulatedCode}</span>
                      </p>
                      {verifyGatewayError && (
                        <div className="mt-1.5 pt-1.5 border-t border-yellow-500/15 text-left text-[9px] font-mono leading-normal text-amber-400/80">
                          <span className="font-bold uppercase text-[8px] text-amber-500 block mb-0.5">⚠️ Fast2SMS Gateway:</span>
                          {verifyGatewayError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-center mb-3">
                    {verifyOtpEntry.map((val, idx) => (
                      <input 
                        key={idx}
                        id={`seller-otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleSellerOtpDigitInput(e.target.value, idx)}
                        className="w-10 h-12 bg-black/55 border-2 border-white/10 focus:border-yellow-500 rounded-xl text-center text-lg font-black text-white outline-none focus:bg-black/80 focus:shadow-inner transition-all"
                      />
                    ))}
                  </div>

                  {verifyErr && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs font-bold rounded-xl p-2.5 text-center">
                      {verifyErr}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setVerifyOtpStep(false)}
                      className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-all cursor-pointer select-none"
                    >
                      {lang === 'bn' ? 'পেছনে' : 'Back'}
                    </button>

                    <button
                      onClick={handleVerifyOtpAndExecute}
                      disabled={verifyOtpLoading}
                      className={`flex-1 py-3.5 rounded-xl text-teal-950 font-black text-sm active:scale-97 cursor-pointer transition-all leading-none flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        verifyMode === 'delete'
                          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white'
                          : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-teal-950'
                      }`}
                    >
                      {verifyOtpLoading ? (
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span>
                          {verifyMode === 'delete'
                            ? (lang === 'bn' ? 'ডিলিট সম্পন্ন করুন' : 'Confirm & Delete Ad')
                            : (lang === 'bn' ? 'স্ট্যাটাস সম্পন্ন করুন' : 'Confirm & Apply Status')}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating compare bar */}
      {comparedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-950 border-2 border-yellow-500 rounded-2xl px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-between gap-4 animate-scale-up min-w-[300px] max-w-sm sm:max-w-md w-[92%]">
          <div className="flex flex-col text-left">
            <span className="text-xs font-extrabold text-white">
              {lang === 'bn' ? `সম্পত্তি তুলনা (${comparedIds.length}/৩)` : `Property Comparison (${comparedIds.length}/3)`}
            </span>
            <span className="text-[10px] text-white/50 leading-tight">
              {comparedIds.length === 1 
                ? (lang === 'bn' ? 'তুলনা করতে আরেকটি বেছে নিন' : 'Select another to compare') 
                : (lang === 'bn' ? 'চলুন বিবরণী দেখা যাক' : 'Ready to compare specs')}
            </span>
            {compareError && (
              <span className="text-[9px] text-red-400 font-bold animate-pulse mt-0.5">{compareError}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => {
                setComparedIds([]);
                setCompareError(null);
              }}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none"
            >
              {lang === 'bn' ? 'মুছুন' : 'Clear'}
            </button>
            <button 
              onClick={() => setIsCompareOpen(true)}
              disabled={comparedIds.length < 2}
              className={`px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-800 disabled:text-white/35 disabled:cursor-not-allowed text-teal-950 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer select-none`}
            >
              {lang === 'bn' ? 'তুলনা করুন ➔' : 'Compare ➔'}
            </button>
          </div>
        </div>
      )}

      {/* Comparison Modal Overlay */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-yellow-500/30 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative text-white animate-scale-up">
            
            {/* Close button */}
            <button 
              onClick={() => setIsCompareOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base sm:text-lg font-black text-yellow-500 uppercase tracking-wide border-b border-white/5 pb-3 mb-4 flex items-center gap-1">
              <span>⚖️</span>
              <span>{lang === 'bn' ? 'সম্পত্তির তুলনামূলক বিশ্লেষণ' : 'Property Side-by-Side Comparison'}</span>
            </h3>

            {/* Comparison Grid */}
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
              {/* Columns Header */}
              <div className="col-span-3 font-extrabold text-white/40 uppercase tracking-widest pb-3 border-b border-white/5 flex items-center">
                {lang === 'bn' ? 'বৈশিষ্ট্য' : 'Specs'}
              </div>
              
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center font-black text-yellow-400 pb-3 border-b border-white/5 bg-yellow-500/5 rounded-t-xl py-1">
                    ID #{item.id}
                  </div>
                );
              })}
              
              {/* Spec Row: Price */}
              <div className="col-span-3 font-bold text-white/60 py-2.5 border-b border-white/5">
                {lang === 'bn' ? 'মূল্য' : 'Price'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center py-2.5 border-b border-white/5 text-white font-black">
                    ₹ {item.price}
                    <span className="text-[8px] text-white/40 block leading-none mt-0.5">
                      {item.negotiable ? (lang === 'bn' ? 'দরাদরি যোগ্য' : 'Negotiable') : (lang === 'bn' ? 'স্থির দাম' : 'Fixed')}
                    </span>
                  </div>
                );
              })}

              {/* Spec Row: Property Type */}
              <div className="col-span-3 font-bold text-white/60 py-2.5 border-b border-white/5">
                {lang === 'bn' ? 'ধরন' : 'Type'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center py-2.5 border-b border-white/5 text-white/95 font-semibold">
                    {getTypeLabel(item.type)}
                  </div>
                );
              })}

              {/* Spec Row: Location */}
              <div className="col-span-3 font-bold text-white/60 py-2.5 border-b border-white/5">
                {lang === 'bn' ? 'জেলা / পিও' : 'District/PO'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center py-2.5 border-b border-white/5 text-white/90 leading-tight">
                    <span className="font-semibold block">{getDistrictLabel(item.district)}</span>
                    <span className="text-[9px] text-white/40 block mt-0.5">{item.po}</span>
                  </div>
                );
              })}

              {/* Spec Row: Size */}
              <div className="col-span-3 font-bold text-white/60 py-2.5 border-b border-white/5">
                {lang === 'bn' ? 'পরিমাণ' : 'Size'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center py-2.5 border-b border-white/5 text-white font-black">
                    {item.size} {getUnitLabel(item.unit)}
                  </div>
                );
              })}

              {/* Spec Row: Facing */}
              <div className="col-span-3 font-bold text-white/60 py-2.5 border-b border-white/5">
                {lang === 'bn' ? 'মুখ (Facing)' : 'Facing'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center py-2.5 border-b border-white/5 text-white/80 font-bold">
                    {item.facing ? getFacingLabel(item.facing) : '—'}
                  </div>
                );
              })}

              {/* Spec Row: Road */}
              <div className="col-span-3 font-bold text-white/60 py-2.5 border-b border-white/5">
                {lang === 'bn' ? 'রাস্তা সংযোগ' : 'Road'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                return (
                  <div key={item.id} className="col-span-3 text-center py-2.5 border-b border-white/5 text-white/80 text-[10px] sm:text-xs">
                    {item.road || '—'}
                  </div>
                );
              })}

              {/* Spec Row: Contact Contact */}
              <div className="col-span-3 font-bold text-white/60 py-3">
                {lang === 'bn' ? 'যোগাযোগ সরাসরি' : 'Contact'}
              </div>
              {comparedIds.map((item0) => {
                const item = listings.find(l => l.id === item0);
                if (!item) return null;
                const isUnlocked = unlockedList.includes(item.id);
                return (
                  <div key={item.id} className="col-span-3 text-center py-3 flex flex-col items-center justify-center">
                    {isUnlocked ? (
                      <span className="text-green-400 font-extrabold text-[10px] sm:text-xs bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">{item.mobile}</span>
                    ) : (
                      <span className="text-yellow-500/80 text-[8px] bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase font-black">
                        🔒 {lang === 'bn' ? 'লকড' : 'Locked'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Note instructions */}
            <div className="mt-5 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-[9px] sm:text-[10px] text-center text-white/60 leading-normal font-semibold">
              {lang === 'bn'
                ? '💡 সরাসরি যোগাযোগের সুবিধার্থে এই তালিকায় মূল লিস্টিং কার্ডে গিয়ে ওটিপি (OTP) দ্বারা বিক্রেতার নম্বর বিনামূল্যে দিন।'
                : '💡 Direct Direct match! For immediate owner details, unlock numbers by tapping unlocked keys on the card browser.'}
            </div>

            {/* Bottom action bar */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setComparedIds([]);
                  setIsCompareOpen(false);
                }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
              >
                {lang === 'bn' ? 'খালি করুন' : 'Clear All'}
              </button>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-teal-950 text-xs font-black rounded-xl transition-all cursor-pointer select-none"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Bento Gallery Modal Overlay */}
      {galleryItem && (
        <div className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-yellow-500/30 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative text-white animate-scale-up flex flex-col gap-4">
            
            {/* Close button */}
            <button 
              onClick={() => setGalleryItem(null)}
              className="absolute top-5 right-5 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer select-none z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Info */}
            <div className="border-b border-white/5 pb-3 text-left">
              <span className="text-[10px] font-black tracking-widest text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-md uppercase border border-yellow-500/20">
                🖼️ {lang === 'bn' ? 'অ্যাসিম্যাট্রিক গ্যালারি' : 'Asymmetric Bento Photo Deck'}
              </span>
              <h3 className="text-lg sm:text-xl font-black mt-2 tracking-tight text-white/95">
                {galleryItem.po}, {getDistrictLabel(galleryItem.district)}
              </h3>
              <p className="text-xs text-white/40 font-semibold mt-1">
                {lang === 'bn' ? `সম্পত্তি আইডি #${galleryItem.id} • পরিমাণ: ${galleryItem.size} ${getUnitLabel(galleryItem.unit)}` : `Property ID #${galleryItem.id} • Size: ${galleryItem.size} ${getUnitLabel(galleryItem.unit)}`}
              </p>
            </div>

            {/* Bento Grid layout */}
            {(() => {
              const photos = galleryItem.photos || [];
              const video = galleryItem.hasVideo && galleryItem.videoData ? galleryItem.videoData : null;
              
              // Combine photos & video to bento cells
              const totalItems = photos.length + (video ? 1 : 0);
              const items = [
                ...(video ? [{ type: 'video', url: video, label: lang === 'bn' ? '🖥️ ভিডিও ট্যুর' : '🖥️ Virtual Video Tour' }] : []),
                ...photos.map((url, idx) => ({ 
                  type: 'image', 
                  url, 
                  label: idx === 0 
                    ? (lang === 'bn' ? '📍 প্রধান সম্মুখভাগ' : '📍 Primary Frontage') 
                    : idx === 1 
                      ? (lang === 'bn' ? '🗺️ মৌজা দাগ রেকর্ড' : '🗺️ Plot Perimeter View')
                      : (lang === 'bn' ? `📸 অতিরিক্ত দিক #${idx - 1}` : `📸 Context Aspect #${idx - 1}`)
                }))
              ];

              if (totalItems === 0) {
                return (
                  <div className="py-12 text-center text-white/40 text-sm font-semibold">
                    {lang === 'bn' ? 'কোন ছবি আপলোড করা হয়নি।' : 'No media uploaded for this property.'}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-12 gap-3.5 min-h-[300px] max-h-[60vh] overflow-y-auto pr-2 scrollbar-none">
                  {items.map((media, index) => {
                    let colSpan = "col-span-12";
                    let height = "h-48 sm:h-64";

                    if (totalItems === 1) {
                      colSpan = "col-span-12";
                      height = "h-72 sm:h-96";
                    } else if (totalItems === 2) {
                      colSpan = index === 0 ? "col-span-12 md:col-span-8" : "col-span-12 md:col-span-4";
                      height = "h-64 sm:h-[350px]";
                    } else if (totalItems === 3) {
                      if (index === 0) {
                        colSpan = "col-span-12 md:col-span-7 row-span-2";
                        height = "h-64 sm:h-[380px]";
                      } else {
                        colSpan = "col-span-12 md:col-span-5";
                        height = "h-32 sm:h-[180px]";
                      }
                    } else {
                      // 4 or more items
                      if (index === 0) {
                        colSpan = "col-span-12 md:col-span-8";
                        height = "h-64 sm:h-[280px]";
                      } else if (index === 1) {
                        colSpan = "col-span-12 md:col-span-4";
                        height = "h-64 sm:h-[280px]";
                      } else if (index === 2) {
                        colSpan = "col-span-12 md:col-span-4";
                        height = "h-40 sm:h-[180px]";
                      } else if (index === 3) {
                        colSpan = "col-span-12 md:col-span-5";
                        height = "h-40 sm:h-[180px]";
                      } else {
                        colSpan = "col-span-12 md:col-span-3";
                        height = "h-40 sm:h-[180px]";
                      }
                    }

                    return (
                      <div 
                        key={index}
                        className={`${colSpan} ${height} relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950 group/cell transition-transform duration-300 hover:border-yellow-500/50 shadow-lg`}
                      >
                        {media.type === 'video' ? (
                          <div className="w-full h-full relative">
                            <video 
                              src={media.url} 
                              controls 
                              autoPlay 
                              muted 
                              loop 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute top-3 left-3 bg-red-500/95 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md animate-pulse">
                              {media.label}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full relative group">
                            <img 
                              referrerPolicy="no-referrer"
                              src={media.url} 
                              alt={media.label}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/cell:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-100 flex flex-col justify-end p-3 transition-opacity duration-300 text-left">
                              <span className="text-[10px] sm:text-xs font-black text-yellow-400 drop-shadow">
                                {media.label}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Bottom action bar */}
            <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-[10px] sm:text-xs font-bold text-white/50">
              <span>{lang === 'bn' ? '✓ লিস্টিং যাচাইকৃত ও সচল' : '✓ Verified Premium Media Listing'}</span>
              <button
                onClick={() => setGalleryItem(null)}
                className="px-5 py-2 hover:bg-yellow-500 text-white hover:text-teal-950 font-black tracking-wide bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer select-none active:scale-95"
              >
                {lang === 'bn' ? 'গ্যালারি বন্ধ করুন' : 'Close Deck'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
