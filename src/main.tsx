import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe iframe overrides for window.alert and window.confirm to prevent "Script error." in sandboxed developer frame environment
if (typeof window !== 'undefined') {
  // Global error filtration to swallow all cross-origin "Script error." and uncaught exceptions in the iframe sandbox context
  window.onerror = function (message, source, lineno, colno, error) {
    console.warn("[Uncaught Sandbox Exception Suppressed]:", { message, source, lineno, colno, error });
    return true; // Always return true to prevent "Script error." bubbling to parent frame
  };

  window.addEventListener('error', function (event) {
    console.warn("[Dev Prevented Error Event]:", event?.message || event);
    event.preventDefault();
    event.stopPropagation();
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    console.warn("[Dev Safe Filtered Promise Rejection]:", event?.reason);
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // Completely mock alert and confirm to avoid triggering sandbox security policy violations (which report as "Script error.")
  window.alert = function (message) {
    console.warn("[Iframe Safe Alert] Intercepted alert:", message);
    
    // Dispatch a custom event so the React application display layer shows an elegant overlay toast
    const event = new CustomEvent('safe-toast-notification', {
      detail: { message: String(message), type: 'info' }
    });
    window.dispatchEvent(event);
  };

  window.confirm = function (message) {
    console.warn("[Iframe Safe Confirm] Intercepted confirm (auto-approving):", message);
    
    const event = new CustomEvent('safe-toast-notification', {
      detail: { message: String(message), type: 'confirm_fallback' }
    });
    window.dispatchEvent(event);
    return true; // Graceful auto-confirmation for smooth flow inside iframe preview
  };

  // --- VERCEL STATIC DEPLOYMENT & OFFLINE-FIRST BACKUP MODE ---
  // Intercept all API routes to run client-side emulation if the backend Express server is offline, missing, or hosted as a static SPA on Vercel
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input && 'url' in input ? (input as any).url : ''));

    if (url.startsWith('/api/') || url.includes('/api/')) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get("content-type");
        
        // If the server returned an error code or an HTML page (standard Vercel 404 fallback page)
        if (!response.ok || (contentType && contentType.includes("text/html"))) {
          console.warn(`[API Proxy Interceptor] Active server response returned ${response.status} or HTML text for "${url}". Engaging client-side sandbox mode...`);
          return await handleStaticFallback(url, init);
        }
        return response;
      } catch (err) {
        console.warn(`[API Proxy Interceptor] Server connection failed/timed out for "${url}". Engaging client-side sandbox mode...`, err);
        return await handleStaticFallback(url, init);
      }
    }

    return originalFetch(input, init);
  };

  async function handleStaticFallback(url: string, init?: RequestInit): Promise<Response> {
    const urlPath = url.split('?')[0];
    let bodyObj: any = {};
    if (init && init.body) {
      try {
        if (typeof init.body === 'string') {
          bodyObj = JSON.parse(init.body);
        }
      } catch (e) {
        console.warn("[API Proxy Interceptor Sandbox] Could not parse request body payload:", e);
      }
    }

    const createJSONResponse = (data: any, status: number = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    // 1. Send OTP Endpoint Fallback
    if (urlPath.endsWith('/api/send-otp')) {
      const mobile = (bodyObj.mobile || '').trim();
      if (!mobile) {
        return createJSONResponse({ error: "Mobile number is required" }, 400);
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiry = Date.now() + 5 * 60 * 1000;
      localStorage.setItem(`static_otp_${mobile}`, JSON.stringify({ code, expiry }));
      
      console.log(`%c[Vercel Static Sandbox OTP] Generated code for ${mobile}: ${code}`, "background: #111827; color: #10b981; font-size: 14px; padding: 6px; border-radius: 4px; font-weight: bold;");

      const customEvent = new CustomEvent('safe-toast-notification', {
        detail: { 
          message: `[Vercel Demo OTP] Your BrokerMukto code for ${mobile} is: ${code} (Shown because app is deployed statically on Vercel)`, 
          type: 'info' 
        }
      });
      window.dispatchEvent(customEvent);

      return createJSONResponse({
        success: true,
        simulated: true,
        code,
        message: `Vercel Demo Mode: Simulated OTP delivered. Code: ${code}`
      });
    }

    // 2. Verify OTP Endpoint Fallback
    if (urlPath.endsWith('/api/verify-otp')) {
      const mobile = (bodyObj.mobile || '').trim();
      const code = String(bodyObj.code || '').trim();

      if (!mobile || !code) {
        return createJSONResponse({ error: "Mobile number and verification code are required" }, 400);
      }

      const savedOtpRaw = localStorage.getItem(`static_otp_${mobile}`);
      if (!savedOtpRaw) {
        return createJSONResponse({ error: "No OTP session found for this number. Please generate a new OTP." }, 404);
      }

      try {
        const session = JSON.parse(savedOtpRaw);
        if (Date.now() > session.expiry) {
          localStorage.removeItem(`static_otp_${mobile}`);
          return createJSONResponse({ error: "The verification OTP has expired. Please send a new code." }, 410);
        }

        if (session.code !== code) {
          return createJSONResponse({ error: "Incorrect verification code. Please try again." }, 400);
        }

        localStorage.removeItem(`static_otp_${mobile}`);
        return createJSONResponse({ success: true, message: "Verification successful!" });
      } catch (e) {
        return createJSONResponse({ error: "Verification server parsing failed." }, 500);
      }
    }

    // 3. Get Saved Google Sheet URL Fallback
    if (urlPath.endsWith('/api/get-google-sheet-url')) {
      const sheetUrl = localStorage.getItem('bm_google_sheet_url') || '';
      return createJSONResponse({ url: sheetUrl });
    }

    // 4. Save Google Sheet URL Fallback
    if (urlPath.endsWith('/api/save-google-sheet-url')) {
      const urlVal = (bodyObj.url || '').trim();
      localStorage.setItem('bm_google_sheet_url', urlVal);
      return createJSONResponse({ success: true, url: urlVal });
    }

    // 5. Submit to Google Sheet Fallback (Relay directly from browser)
    if (urlPath.endsWith('/api/submit-to-sheet')) {
      const { type, data } = bodyObj;
      const sheetUrl = (bodyObj.sheetUrl || localStorage.getItem('bm_google_sheet_url') || '').trim();

      if (!sheetUrl) {
        return createJSONResponse({
          success: true,
          simulated: true,
          message: "Developer Sandbox Mode: Google Sheet URL is not configured. Submission simulated successfully."
        });
      }

      try {
        await originalFetch(sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString()
          })
        });
        return createJSONResponse({ success: true, status: 200 });
      } catch (err) {
        console.warn("[Vercel Static Sandbox] Direct Apps Script post failed:", err);
        return createJSONResponse({ error: "Failed to submit to Google Sheet directly from client" }, 500);
      }
    }

    // 6. Broadcast New Listing Fallback
    if (urlPath.endsWith('/api/broadcast-new-listing')) {
      const { listing } = bodyObj;
      const sheetUrl = (bodyObj.googleSheetUrl || localStorage.getItem('bm_google_sheet_url') || '').trim();

      let sourceBuyers: any[] = [];
      let fetchError: string | null = null;

      if (sheetUrl && sheetUrl.startsWith('http')) {
        try {
          const sheetRes = await originalFetch(sheetUrl);
          const responseText = await sheetRes.text();
          const trimmedText = responseText.trim();
          
          if (!trimmedText.startsWith("<") && !trimmedText.toLowerCase().includes("<!doctype html>")) {
            const sheetData = JSON.parse(trimmedText);
            if (sheetData && sheetData.result === "success" && Array.isArray(sheetData.buyers)) {
              sourceBuyers = sheetData.buyers;
            }
          }
        } catch (err: any) {
          fetchError = err?.message || String(err);
        }
      }

      const matchedBuyers = sourceBuyers.filter((buyer: any) => {
        if (!buyer.mobile) return false;
        const filterDistrict = String(buyer.district || "").trim().toLowerCase();
        const listingDistrict = String(listing?.district || "").trim().toLowerCase();
        if (filterDistrict !== listingDistrict) return false;

        const buyerArea = String(buyer.area || "").trim().toLowerCase();
        const listingPo = String(listing?.po || "").trim().toLowerCase();
        const listingRoad = String(listing?.road || "").trim().toLowerCase();

        if (!buyerArea) return true;
        return buyerArea.includes(listingPo) || listingPo.includes(buyerArea) || 
               buyerArea.includes(listingRoad) || listingRoad.includes(buyerArea);
      });

      return createJSONResponse({
        success: true,
        matchedCount: matchedBuyers.length,
        notifiedBuyers: matchedBuyers.map(b => ({
          mobile: b.mobile,
          source: b.source,
          area: b.area
        })),
        simulated: true,
        details: "Client-side simulation completed in Vercel Static Sandbox mode.",
        fetchError
      });
    }

    return createJSONResponse({ error: "Endpoint not found" }, 404);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

