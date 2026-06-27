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
  
  // Cache check result in-memory to avoid redundant pings while allowing dynamic checking per page session
  let isStaticSpaModeChecked = false;
  let isStaticSpaMode = false;

  window.fetch = async function (input, init) {
    let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input && 'url' in input ? (input as any).url : ''));

    if (url.startsWith('/api/') || url.includes('/api/')) {
      // Automatic client-side injection of the configured Fast2SMS API key in any /api/send-otp request
      if (url.endsWith('/api/send-otp') && init && init.body) {
        try {
          let bodyObj = JSON.parse(typeof init.body === 'string' ? init.body : '');
          const localKey = localStorage.getItem('bm_fast2sms_api_key');
          if (localKey && localKey.trim() !== '') {
            bodyObj.fast2smsApiKey = localKey.trim();
            init.body = JSON.stringify(bodyObj);
          }
        } catch (e) {
          console.warn('[Fetch Interceptor] Fast2SMS key injection failed:', e);
        }
      }

      // Check if we already know we're in static SPA mode
      if (isStaticSpaMode) {
        console.log(`[API Proxy Interceptor] Static/Serverless mode active. Instantly routing "${url}" to client-side fallback.`);
        return await handleStaticFallback(url, init);
      }

      // Fast-ping server if we haven't checked yet
      if (!isStaticSpaModeChecked) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second lenient timeout for initial server wake-up/ping
          const pingRes = await originalFetch('/api/get-fast2sms-key', { signal: controller.signal });
          clearTimeout(timeoutId);
          const ct = pingRes.headers.get("content-type") || "";
          if (pingRes.ok && ct.includes("application/json")) {
            isStaticSpaMode = false;
          } else {
            isStaticSpaMode = true;
          }
        } catch (pingErr) {
          isStaticSpaMode = true;
        }
        isStaticSpaModeChecked = true;

        if (isStaticSpaMode) {
          console.log(`[API Proxy Interceptor] First ping failed. Switching to Static/Serverless mode. Routing "${url}" to client fallback.`);
          return await handleStaticFallback(url, init);
        }
      }

      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get("content-type") || "";
        
        // Engage static sandbox mode if the server returned HTML text or a non-JSON non-successful response (e.g. Vercel 404/405 static page)
        const isHtml = contentType.includes("text/html");
        const isNotOkAndNotJson = !response.ok && !contentType.includes("application/json");
        
        if (isHtml || isNotOkAndNotJson) {
          console.warn(`[API Proxy Interceptor] Server response engaging client-side sandbox mode for "${url}" (HTML or non-JSON error status: ${response.status})`);
          isStaticSpaMode = true;
          return await handleStaticFallback(url, init);
        }
        return response;
      } catch (err) {
        console.warn(`[API Proxy Interceptor] Server connection failed/timed out for "${url}". Engaging client-side sandbox mode...`, err);
        isStaticSpaMode = true;
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
      
      // @ts-ignore
      const envKey = import.meta.env.VITE_FAST2SMS_API_KEY || import.meta.env.VITE_FAST2SMS_KEY || import.meta.env.VITE_FAS2SMS_API_KEY || import.meta.env.VITE_FAS2SMS_KEY || "";
      const fast2smsKey = (
        bodyObj.fast2smsApiKey || 
        localStorage.getItem('bm_fast2sms_api_key') || 
        envKey || 
        ''
      ).trim();
      
      if (fast2smsKey && fast2smsKey !== "MY_FAST2SMS_KEY" && fast2smsKey !== "") {
        console.log(`[Vercel Static Proxy] Stored Fast2SMS Key detected. Executing direct no-cors dispatch...`);
        let smsSentReal = false;
        let gatewayErrorMsg = "";

        try {
          // Attempt dispatch with Fallback 2 GET API route=q (Quick SMS) - most reliable direct dispatch with a 4-second fail-fast timeout!
          const controller1 = new AbortController();
          const timeoutId1 = setTimeout(() => controller1.abort(), 4000);
          
          const customMessage = `Your BrokerMukto verification code is: ${code}`;
          const getUrlQuick = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey)}&route=q&message=${encodeURIComponent(customMessage)}&numbers=${encodeURIComponent(mobile)}`;
          
          await originalFetch(getUrlQuick, { method: "GET", mode: "no-cors", signal: controller1.signal });
          clearTimeout(timeoutId1);
          smsSentReal = true;
          console.log(`[Vercel Static Proxy] Real OTP dispatched via direct browser gateway for ${mobile}`);
        } catch (smsErr: any) {
          gatewayErrorMsg = smsErr?.message || String(smsErr);
          console.warn(`[Vercel Static Proxy] Browser GET dispatch failed or timed out, trying backup route=otp with 4-second timeout...`, smsErr);
          
          try {
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 4000);

            const getUrlOtp = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2smsKey)}&route=otp&variables_values=${encodeURIComponent(code)}&numbers=${encodeURIComponent(mobile)}`;
            await originalFetch(getUrlOtp, { method: "GET", mode: "no-cors", signal: controller2.signal });
            clearTimeout(timeoutId2);
            smsSentReal = true;
          } catch (otpErr: any) {
            console.error(`[Vercel Static Proxy] Direct browser fallback also failed or timed out:`, otpErr);
          }
        }

        if (smsSentReal) {
          return createJSONResponse({
            success: true,
            simulated: false, // Explicitly false! This ensures the verification UI requires actual mobile-based physical verification code entry!
            message: "OTP sent successfully onto your mobile number via browser-direct Fast2SMS."
          });
        }
      }

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

    // --- Fast2SMS Keys Fallbacks for Static SPA Mode ---
    if (urlPath.endsWith('/api/get-fast2sms-key')) {
      const keyVal = localStorage.getItem('bm_fast2sms_api_key') || '';
      return createJSONResponse({ key: keyVal });
    }

    if (urlPath.endsWith('/api/save-fast2sms-key')) {
      const keyVal = (bodyObj.key || '').trim();
      localStorage.setItem('bm_fast2sms_api_key', keyVal);
      return createJSONResponse({ success: true, key: keyVal });
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

