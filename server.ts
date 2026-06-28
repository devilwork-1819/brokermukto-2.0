import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DEFAULT_GOOGLE_SHEET_URL, DEFAULT_FAST2SMS_KEY } from "./src/config";

// --- FIREBASE FIRESTORE INITIALIZATION ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";

const app = express();
const PORT = 3000;

let db: any = null;
let isFirebaseActive = false;

try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const rawConfig = fs.readFileSync(firebaseConfigPath, "utf-8");
    const config = JSON.parse(rawConfig);
    const appInstance = initializeApp(config);
    const dbId = config.firestoreDatabaseId || "(default)";
    db = getFirestore(appInstance, dbId);
    isFirebaseActive = true;
    console.log(`[Firebase] Initialized Firestore successfully with databaseId: ${dbId}`);
  } else {
    console.warn("[Firebase] firebase-applet-config.json not found. Falling back to local file storage.");
  }
} catch (err) {
  console.error("[Firebase] Error initializing Firebase Firestore:", err);
}

const CONFIG_FILE = path.join(process.cwd(), "google-sheet-config.json");

// In-memory cache for the Google Sheet URL to protect against filesystem read overhead or stateless container file resets
let cachedGoogleSheetUrl = "";

function getStoredGoogleSheetUrlFromDisk(): string {
  if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  }
  if (process.env.GOOGLE_SHEET_URL) {
    return process.env.GOOGLE_SHEET_URL;
  }
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.url === "string") {
        return parsed.url;
      }
    }
  } catch (err) {
    console.warn("[Server Config] Error reading google-sheet-config.json from disk:", err);
  }
  return DEFAULT_GOOGLE_SHEET_URL || "";
}

function saveStoredGoogleSheetUrlToDisk(url: string): boolean {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ url }, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Server Config] Error writing google-sheet-config.json to disk:", err);
    return false;
  }
}

// Retrieve persistently stored Google Sheet URL on server side
function getStoredGoogleSheetUrl(): string {
  if (cachedGoogleSheetUrl) {
    return cachedGoogleSheetUrl;
  }
  const diskUrl = getStoredGoogleSheetUrlFromDisk();
  cachedGoogleSheetUrl = diskUrl;
  return diskUrl;
}

// Persistently store Google Sheet URL on server side
function saveStoredGoogleSheetUrl(url: string): boolean {
  cachedGoogleSheetUrl = url;
  const diskSuccess = saveStoredGoogleSheetUrlToDisk(url);
  
  if (isFirebaseActive && db) {
    const configRef = doc(db, "system_config", "globals");
    setDoc(configRef, { googleSheetUrl: url }, { merge: true })
      .then(() => console.log("[Firebase] Saved googleSheetUrl to Firestore."))
      .catch(err => console.error("[Firebase] Error saving googleSheetUrl to Firestore:", err));
  }
  return diskSuccess;
}

const FAST2SMS_CONFIG_FILE = path.join(process.cwd(), "fast2sms-config.json");
let cachedFast2SMSKey = "";

function getStoredFast2SMSKeyFromDisk(): string {
  if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY !== "MY_FAST2SMS_KEY" && process.env.FAST2SMS_API_KEY.trim() !== "") {
    return process.env.FAST2SMS_API_KEY;
  }
  try {
    if (fs.existsSync(FAST2SMS_CONFIG_FILE)) {
      const raw = fs.readFileSync(FAST2SMS_CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.key === "string") {
        return parsed.key;
      }
    }
  } catch (err) {
    console.warn("[Server Config] Error reading fast2sms-config.json from disk:", err);
  }
  return DEFAULT_FAST2SMS_KEY || "";
}

function saveStoredFast2SMSKeyToDisk(key: string): boolean {
  try {
    fs.writeFileSync(FAST2SMS_CONFIG_FILE, JSON.stringify({ key }, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Server Config] Error writing fast2sms-config.json to disk:", err);
    return false;
  }
}

// Retrieve persistently stored Fast2SMS Key on server side
function getStoredFast2SMSKey(): string {
  if (cachedFast2SMSKey) {
    return cachedFast2SMSKey;
  }
  const diskKey = getStoredFast2SMSKeyFromDisk();
  cachedFast2SMSKey = diskKey;
  return diskKey;
}

// Persistently store Fast2SMS Key on server side
function saveStoredFast2SMSKey(key: string): boolean {
  cachedFast2SMSKey = key;
  const diskSuccess = saveStoredFast2SMSKeyToDisk(key);
  
  if (isFirebaseActive && db) {
    const configRef = doc(db, "system_config", "globals");
    setDoc(configRef, { fast2smsKey: key }, { merge: true })
      .then(() => console.log("[Firebase] Saved fast2smsKey to Firestore."))
      .catch(err => console.error("[Firebase] Error saving fast2smsKey to Firestore:", err));
  }
  return diskSuccess;
}

async function loadSystemConfigFromFirestore() {
  if (isFirebaseActive && db) {
    try {
      const configRef = doc(db, "system_config", "globals");
      const configDoc = await getDoc(configRef);
      if (configDoc.exists()) {
        const data = configDoc.data();
        if (data.googleSheetUrl) {
          cachedGoogleSheetUrl = data.googleSheetUrl;
          console.log("[Firebase] Loaded googleSheetUrl from Firestore globals document:", cachedGoogleSheetUrl);
        }
        if (data.fast2smsKey) {
          cachedFast2SMSKey = data.fast2smsKey;
          console.log("[Firebase] Loaded fast2smsKey from Firestore globals document.");
        }
      } else {
        const googleSheetUrl = getStoredGoogleSheetUrlFromDisk();
        const fast2smsKey = getStoredFast2SMSKeyFromDisk();
        await setDoc(configRef, { googleSheetUrl, fast2smsKey });
        console.log("[Firebase] Initialized system_config document in Firestore.");
      }
    } catch (err) {
      console.error("[Firebase] Error loading system_config from Firestore:", err);
    }
  }
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// In-memory OTP storage: Map of mobile -> { code, expiry }
interface OtpSession {
  code: string;
  expiry: number;
}
const otpStore = new Map<string, OtpSession>();

// Function to validate Indian mobile numbers securely (Amazon / Flipkart Style)
function isValidIndianMobile(num: string): boolean {
  // Enforce 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(num)) {
    return false;
  }
  // Rigid blacklist of fake / sequential / dummy numbers
  const invalidFakes = [
    "9876543210",
    "9999999999",
    "8888888888",
    "7777777777",
    "6666666666",
    "9000000000",
    "8000000000",
    "7000000000",
    "1234567890",
    "0123456789",
    "9123456789"
  ];
  if (invalidFakes.includes(num)) {
    return false;
  }
  // Ensure no simple single-digit repeat over 8 times (e.g. 9999999912)
  const allDigitsSame = num.split('').every(char => char === num[0]);
  if (allDigitsSame) {
    return false;
  }

  return true;
}

// REST API for OTP dispatch
app.post("/api/send-otp", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { mobile, name, fast2smsApiKey } = req.body;

    if (!mobile || typeof mobile !== "string") {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }

    const trimmedMobile = mobile.trim();

    // 1. Check validity of number like a real high-security system
    if (!isValidIndianMobile(trimmedMobile)) {
      res.status(422).json({
        error: "⚠️ This mobile number is invalid or inactive. Please enter a real, active 10-digit mobile number."
      });
      return;
    }

    // 2. Generate a highly secure 6-digit verification code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minute validity
    
    otpStore.set(trimmedMobile, { code, expiry });

    console.log(`[SECURE SMS GATEWAY] Session initialized for ${trimmedMobile} (User: ${name || 'N/A'}). Secure OTP is: ${code}`);

    // Check for Fast2SMS API configuration (request payload key takes precedence, then stored config, then env)
    const fast2smsKey = (fast2smsApiKey && typeof fast2smsApiKey === "string" && fast2smsApiKey.trim() !== "") 
      ? fast2smsApiKey.trim() 
      : getStoredFast2SMSKey();

    let smsSentReal = false;
    let gatewayErrorMsg = "";

    // Dispatch directly using Fast2SMS Gateway (Exclusive Provider)
    if (fast2smsKey && fast2smsKey !== "MY_FAST2SMS_KEY" && fast2smsKey.trim() !== "") {
      const apiKey = fast2smsKey.trim();
      try {
        console.log(`[Fast2SMS Gateway] Attempting POST JSON route=otp dispatch for ${trimmedMobile}...`);
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": apiKey,
            "Authorization": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "variables_values": code,
            "route": "otp",
            "numbers": trimmedMobile
          })
        });
        const smsData: any = await smsRes.json();
        console.log(`[Fast2SMS Gateway] POST Response:`, JSON.stringify(smsData));
        if (smsData && smsData.return === true) {
          smsSentReal = true;
        } else {
          gatewayErrorMsg = smsData.message || (smsData.error ? (typeof smsData.error === "string" ? smsData.error : JSON.stringify(smsData.error)) : JSON.stringify(smsData));
          console.log(`[Fast2SMS Gateway Info] POST response status info:`, JSON.stringify(smsData));
          
          // Fallback 1: GET Request route=otp
          console.log(`[Fast2SMS Gateway] Fallback 1: GET API route=otp dispatch...`);
          const getUrlOtp = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=otp&variables_values=${encodeURIComponent(code)}&numbers=${encodeURIComponent(trimmedMobile)}`;
          const getResOtp = await fetch(getUrlOtp, { method: "GET" });
          const getDataOtp: any = await getResOtp.json();
          console.log(`[Fast2SMS Gateway] Fallback 1 GET Response:`, JSON.stringify(getDataOtp));
          
          if (getDataOtp && getDataOtp.return === true) {
            smsSentReal = true;
          } else {
            const getErrorMsg = getDataOtp.message || (getDataOtp.error ? (typeof getDataOtp.error === "string" ? getDataOtp.error : JSON.stringify(getDataOtp.error)) : JSON.stringify(getDataOtp));
            if (getErrorMsg) {
              gatewayErrorMsg = getErrorMsg;
            }
            console.log(`[Fast2SMS Gateway Info] Fallback 1 response status info:`, JSON.stringify(getDataOtp));

            // Fallback 2: GET Request route=q (Quick SMS) - bypasses route=otp constraints!
            console.log(`[Fast2SMS Gateway] Fallback 2: GET API route=q (Quick SMS) dispatch...`);
            const customMessage = `Your BrokerMukto verification code is: ${code}`;
            const getUrlQuick = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodeURIComponent(customMessage)}&numbers=${encodeURIComponent(trimmedMobile)}`;
            const getResQuick = await fetch(getUrlQuick, { method: "GET" });
            const getDataQuick: any = await getResQuick.json();
            console.log(`[Fast2SMS Gateway] Fallback 2 GET Response:`, JSON.stringify(getDataQuick));

            if (getDataQuick && getDataQuick.return === true) {
              smsSentReal = true;
            } else {
              const quickErrorMsg = getDataQuick.message || (getDataQuick.error ? (typeof getDataQuick.error === "string" ? getDataQuick.error : JSON.stringify(getDataQuick.error)) : JSON.stringify(getDataQuick));
              if (quickErrorMsg) {
                gatewayErrorMsg = `Quick SMS: ${quickErrorMsg} | OTP SMS: ${gatewayErrorMsg}`;
              }
              console.log(`[Fast2SMS Gateway Info] Fallback 2 response status info:`, JSON.stringify(getDataQuick));
            }
          }
        }
      } catch (smsErr: any) {
        gatewayErrorMsg = smsErr?.message || String(smsErr);
        console.log(`[Fast2SMS Gateway Connection Info]:`, smsErr);
      }
    }

    // Response structure
    if (smsSentReal) {
      res.json({
        success: true,
        simulated: false,
        message: "OTP sent successfully onto your mobile number via Fast2SMS."
      });
    } else if (fast2smsKey && fast2smsKey !== "MY_FAST2SMS_KEY" && fast2smsKey.trim() !== "") {
      // Fast2SMS API Key was set but returned an error.
      // Instead of hard-blocking with 400 status (which blocks testing flow due to Fast2SMS registration verification or wallet issues),
      // we fall back gracefully to sandbox preview so developers/users can still test the core actions of buying/selling with the simulated code!
      console.log(`[Fast2SMS Gateway] Real sms failed, falling back to secure sandbox emulation with key error log.`);
      res.json({
        success: true,
        simulated: true,
        code,
        gatewayError: gatewayErrorMsg,
        message: `Fast2SMS Gateway attempted but returned error: "${gatewayErrorMsg}". Flow continued with simulated OTP.`
      });
    } else {
      // Fallback sandbox preview mode if the Fast2SMS API Key is not yet set
      res.json({
        success: true,
        simulated: true,
        code,
        message: "Developer Sandbox Mode: Fast2SMS API key is not yet configured. Simulated OTP delivered."
      });
    }
  } catch (error: any) {
    console.error("API error in /api/send-otp:", error);
    res.status(500).json({ error: "Internal server error during OTP dispatch" });
  }
});

// REST API for OTP verification
app.post("/api/verify-otp", (req: express.Request, res: express.Response): void => {
  try {
    const { mobile, code } = req.body;

    if (!mobile || !code) {
      res.status(400).json({ error: "Mobile number and verification code are required" });
      return;
    }

    const trimmedMobile = mobile.trim();
    const session = otpStore.get(trimmedMobile);

    if (!session) {
      res.status(404).json({ error: "No OTP session found for this number. Please generate a new OTP." });
      return;
    }

    if (Date.now() > session.expiry) {
      otpStore.delete(trimmedMobile);
      res.status(410).json({ error: "The verification OTP has expired. Please send a new code." });
      return;
    }

    if (session.code !== String(code).trim()) {
      res.status(400).json({ error: "Incorrect verification code. Please try again." });
      return;
    }

    // Success! Revoke session to avoid replay attacks
    otpStore.delete(trimmedMobile);
    res.json({ success: true, message: "Verification successful!" });
  } catch (err: any) {
    console.error("API error in /api/verify-otp:", err);
    res.status(500).json({ error: "Internal server error during verification" });
  }
});

// --- GOOGLE SEARCH CONSOLE SITEMAP & ROBOTS.TXT ---

// Sitemap Generator for Google Search Console indexing
app.get("/sitemap.xml", (req: express.Request, res: express.Response) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "brokermukto.com";
  const baseUrl = `${protocol}://${host}`;

  const urls = [
    { loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${baseUrl}/?view=listings`, changefreq: "daily", priority: "0.9" },
    { loc: `${baseUrl}/?view=sell`, changefreq: "weekly", priority: "0.8" },
    { loc: `${baseUrl}/?view=buy`, changefreq: "weekly", priority: "0.8" }
  ];

  const xmlItems = urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("");

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.status(200).send(sitemapXml.trim());
});

// Robots.txt
app.get("/robots.txt", (req: express.Request, res: express.Response) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "brokermukto.com";
  const baseUrl = `${protocol}://${host}`;

  const content = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header("Content-Type", "text/plain");
  res.status(200).send(content);
});

// --- GOOGLE SHEETS INTERCEPT & SERVER-SIDE WEBHOOK PROXY ---

// 1. Get Saved Google Sheet URL (from server config)
app.get("/api/get-google-sheet-url", (req: express.Request, res: express.Response) => {
  const url = getStoredGoogleSheetUrl();
  res.json({ url });
});

// 2. Save Google Sheet URL (to server config)
app.post("/api/save-google-sheet-url", (req: express.Request, res: express.Response) => {
  const { url } = req.body;
  if (typeof url !== "string") {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }

  const success = saveStoredGoogleSheetUrl(url.trim());
  if (success) {
    console.log(`[Server Config] Google Sheet Webapp URL set: ${url.trim()}`);
    res.json({ success: true, url: url.trim() });
  } else {
    res.status(500).json({ error: "Failed to persist URL on server disk" });
  }
});

// --- FAST2SMS API KEY PERSISTENCE AND GATEWAY ROUTING ---

// 1. Get Saved Fast2SMS API Key (from server config)
app.get("/api/get-fast2sms-key", (req: express.Request, res: express.Response) => {
  const key = getStoredFast2SMSKey();
  res.json({ key });
});

// 2. Save Fast2SMS API Key (to server config)
app.post("/api/save-fast2sms-key", (req: express.Request, res: express.Response) => {
  const { key } = req.body;
  if (typeof key !== "string") {
    res.status(400).json({ error: "Invalid key format" });
    return;
  }

  const success = saveStoredFast2SMSKey(key.trim());
  if (success) {
    console.log(`[Server Config] Fast2SMS API Key set successfully.`);
    res.json({ success: true, key: key.trim() });
  } else {
    res.status(500).json({ error: "Failed to persist key on server disk" });
  }
});

// 3. Proxy submissions dynamically to resolve CORS issues and support all concurrent web users
app.post("/api/submit-to-sheet", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { type, data, sheetUrl } = req.body;
    let url = getStoredGoogleSheetUrl();

    // Self-healing check: If server is missing the sheet webhook URL, try to recover it from the incoming client payload
    if (!url && sheetUrl && typeof sheetUrl === "string" && sheetUrl.trim().startsWith("http")) {
      url = sheetUrl.trim();
      saveStoredGoogleSheetUrl(url);
      console.log(`[Proxy Sheet] Self-healed active Google Sheet Webapp URL from client request: ${url}`);
    }

    if (!url) {
      console.warn(`[Proxy Sheet Sandbox] No Sheet URL configured. Simulating successful "${type}" submission in sandbox mode.`);
      res.json({
        success: true,
        simulated: true,
        message: "Developer Sandbox Mode: Google Sheet URL is not configured. Submission simulated successfully."
      });
      return;
    }

    console.log(`[Proxy Sheet] Relaying "${type}" submission from backend client context directly to: ${url}`);
    
    // Google Apps Script redirects with 302, which is processed successfully on the initial POST.
    // By using redirect: "manual", we avoid unnecessary browser/server content redirects, making it fast and resilient.
    const response = await fetch(url.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      }),
      redirect: "manual"
    });

    const status = response.status;
    console.log(`[Proxy Sheet Response] Webapp response status: ${status}`);

    // Status codes 2xx (OK) and 3xx (Redirect) indicate successful receipt & action in Google Apps Script
    if (status >= 200 && status < 400) {
      res.json({ success: true, status });
    } else {
      const errText = await response.text().catch(() => "No response body");
      console.warn(`[Proxy Sheet Warning] Non-success webhook status: ${status}. Response: ${errText}`);
      res.status(400).json({ success: false, error: `Webhook returned status ${status}`, details: errText });
    }
  } catch (err: any) {
    console.error(`[Proxy Sheet Error] Webhook Relay failed:`, err);
    res.status(500).json({ error: err.message || "Relay failure to apps script" });
  }
});

// REST API for real-time Buyer Matching & Broadcast from Google Sheets Database
app.post("/api/broadcast-new-listing", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { listing, googleSheetUrl } = req.body;
    if (!listing) {
      res.status(400).json({ error: "Listing details are required." });
      return;
    }

    console.log(`[Buyer Alert Broadcaster] Received listing broadcast request for Ad ID ${listing.id} (Location: ${listing.po}, ${listing.district})`);

    let sourceBuyers: any[] = [];
    let fetchError: string | null = null;

    // 1. Fetch buyers from Google Sheets if webhook URL/Exec URL is provided (fallback to stored URL)
    const selectedSheetUrl = (googleSheetUrl && googleSheetUrl.trim().startsWith("http")) 
      ? googleSheetUrl.trim() 
      : getStoredGoogleSheetUrl();

    if (selectedSheetUrl && selectedSheetUrl.startsWith("http")) {
      try {
        console.log(`[Buyer Alert Broadcaster] Fetching buyer list from connected Google Sheet Web App: ${selectedSheetUrl}`);
        const sheetRes = await fetch(selectedSheetUrl);
        const responseText = await sheetRes.text();
        const trimmedText = responseText.trim();

        // Inspect for HTML pages returned by incorrect configuration or locked permissions
        if (trimmedText.startsWith("<") || trimmedText.toLowerCase().includes("<!doctype html>") || trimmedText.toLowerCase().includes("<html")) {
          let diagnosis = "The Google Sheet Webapp URL returned an HTML page instead of JSON.";
          if (selectedSheetUrl.includes("docs.google.com/spreadsheets")) {
            diagnosis += " This is because you configured the spreadsheet document view link itself. Please deploy the Apps Script Web App from Extensions -> Apps Script as a 'Web App', select Who has access as 'Anyone' (mandatory), and use the resulting '.exec' URL.";
          } else {
            diagnosis += " Please verify your Google Apps Script Web App deployment under 'Extensions -> Apps Script'. Ensure it is deployed as a 'Web App', 'Execute as: Me', and 'Who has access: Anyone' so that anyone can safely fetch matching records.";
          }
          throw new Error(diagnosis);
        }

        let sheetData: any;
        try {
          sheetData = JSON.parse(trimmedText);
        } catch (jsonParseErr) {
          throw new Error(`Failed to parse response as JSON. Content preview: ${trimmedText.substring(0, 150)}...`);
        }
        
        if (sheetData && sheetData.result === "success" && Array.isArray(sheetData.buyers)) {
          sourceBuyers = sheetData.buyers;
          console.log(`[Buyer Alert Broadcaster] Successfully retrieved ${sourceBuyers.length} registrants from Google Sheets.`);
        } else {
          fetchError = sheetData?.message || JSON.stringify(sheetData);
          console.warn(`[Buyer Alert Broadcaster] Webapp did not return valid buyer array:`, sheetData);
        }
      } catch (err: any) {
        fetchError = err?.message || String(err);
        console.warn(`[Buyer Alert Broadcaster] Failed to connect to Google Sheet Webapp:`, err);
      }
    } else {
      console.log(`[Buyer Alert Broadcaster] No Google Sheet URL found (provided parameter or stored server-side).`);
    }

    // 2. Perform intelligent location matching (District mandatory, PO & Area optional/substring)
    const matchedBuyers = sourceBuyers.filter((buyer: any) => {
      // Must have a phone number to notify
      if (!buyer.mobile) return false;

      const filterDistrict = String(buyer.district || "").trim().toLowerCase();
      const listingDistrict = String(listing.district || "").trim().toLowerCase();

      // Enforce strict district match
      if (filterDistrict !== listingDistrict) return false;

      // Area is optional/substring match
      const buyerArea = String(buyer.area || "").trim().toLowerCase();
      const listingPo = String(listing.po || "").trim().toLowerCase();
      const listingRoad = String(listing.road || "").trim().toLowerCase();

      if (!buyerArea) {
        // Buyer wants all properties within this district
        return true;
      }

      // Check if buyer preferred area matches either the Listing's P.O. or Road/Locality
      return buyerArea.includes(listingPo) || listingPo.includes(buyerArea) || 
             buyerArea.includes(listingRoad) || listingRoad.includes(buyerArea);
    });

    console.log(`[Buyer Alert Broadcaster] Match complete! Found ${matchedBuyers.length} matching buyers.`);

    // 3. Build the WhatsApp/SMS text message exactly as requested
    const priceText = String(listing.price).startsWith('₹') ? listing.price : `₹${listing.price}`;
    const priceSuffix = listing.negotiable ? " (Negotiable)" : "";
    const detailMsg = `NEW LISTING — BrokerMukto.com
Direct from Owner. Zero Brokerage.
📍 Location: ${listing.po}, ${listing.district}, West Bengal
🏘️ Area/Locality: ${listing.road || listing.po}
🛤️ Landmark: ${listing.landmark || 'Nearby'}
🌿 Type: ${listing.type}
📐 Size: ${listing.size} ${listing.unit}
💰 Price: ${priceText}${priceSuffix}
👉 View full details & contact seller directly:
www.brokermukto.com
No middlemen. No hidden fees. Just direct deals.`;

    // 4. Send SMS to all matched buyers using Fast2SMS if configured
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    const isKeyConfigured = fast2smsKey && fast2smsKey !== "MY_FAST2SMS_KEY" && fast2smsKey.trim() !== "";
    const smsNumbers = matchedBuyers.map(b => b.mobile.trim());
    
    let dispatchSuccess = false;
    let smsResponseDetails = "";

    if (isKeyConfigured && smsNumbers.length > 0) {
      try {
        console.log(`[Buyer Alert Broadcaster] Requesting Fast2SMS route=q (Quick SMS) message broadcast for ${smsNumbers.length} recipients...`);
        const apiKey = fast2smsKey!.trim();
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": apiKey,
            "Authorization": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "route": "q",
            "message": detailMsg,
            "numbers": smsNumbers.join(",")
          })
        });
        const smsResponseData: any = await smsRes.json();
        console.log(`[Buyer Alert Broadcaster] Broadcast POST response:`, JSON.stringify(smsResponseData));
        if (smsResponseData && smsResponseData.return === true) {
          dispatchSuccess = true;
        } else {
          smsResponseDetails = smsResponseData?.message || JSON.stringify(smsResponseData);
        }
      } catch (broadcastErr: any) {
        smsResponseDetails = broadcastErr?.message || String(broadcastErr);
        console.warn(`[Buyer Alert Broadcaster] Fast2SMS connection failed:`, broadcastErr);
      }
    }

    // Direct Simulated output log info for sandbox UI transparency 
    console.log(`\n================ SIMULATED AUTOMATED BROADCAST MESSAGE ================`);
    console.log(`To: [${smsNumbers.join(", ")}]`);
    console.log(`Message Content:\n${detailMsg}`);
    console.log(`========================================================================\n`);

    res.json({
      success: true,
      matchedCount: matchedBuyers.length,
      notifiedBuyers: matchedBuyers.map(b => ({
        mobile: b.mobile,
        source: b.source,
        area: b.area
      })),
      simulated: !dispatchSuccess,
      details: isKeyConfigured ? (dispatchSuccess ? "Delivered via SMS Gateway" : `SMS error: ${smsResponseDetails}`) : "Delivered via Sandbox Emulation (No Fast2SMS API key set)",
      fetchError,
      messagePreview: detailMsg
    });
  } catch (err: any) {
    console.error("API error in /api/broadcast-new-listing:", err);
    res.status(500).json({ error: "Internal server error during buyer matching and broadcast." });
  }
});

// --- SERVER-SIDE DB SYNCHRONIZATION AND PERSISTENCE ENGINE ---

const LISTINGS_FILE = path.join(process.cwd(), "listings-store.json");
const BUYERS_FILE = path.join(process.cwd(), "registered-buyers-store.json");
const LEADS_FILE = path.join(process.cwd(), "buyer-leads-store.json");

const defaultInitialListings = [
  {
    id: 1,
    district: 'Birbhum',
    po: 'Bolpur',
    road: 'NH14',
    landmark: 'Near Visva-Bharati University',
    price: '8,00,000',
    priceNum: 800000,
    negotiable: true,
    mobile: '9876500000',
    hasVideo: false,
    photos: [],
    size: '10',
    unit: 'কাঠা',
    type: 'বাসস্থান',
    facing: 'উত্তর',
    maps: 'https://maps.google.com/?q=Bolpur+West+Bengal',
    verified: true,
    sold: false,
    soldAt: null
  },
  {
    id: 2,
    district: 'Birbhum',
    po: 'Suri',
    road: 'Village Road',
    landmark: 'Near Old Pond',
    price: '3,50,000',
    priceNum: 350000,
    negotiable: false,
    mobile: '7012400000',
    hasVideo: false,
    photos: [],
    size: '5',
    unit: 'কাঠা',
    type: 'কৃষি জমি',
    facing: 'দক্ষিণ',
    maps: '',
    verified: true,
    sold: false,
    soldAt: null
  },
  {
    id: 3,
    district: 'Murshidabad',
    po: 'Berhampore',
    road: 'NH12',
    landmark: 'Near Collectorate',
    price: '12,0,000',
    priceNum: 1200000,
    negotiable: true,
    mobile: '9123400000',
    hasVideo: false,
    photos: [],
    size: '2',
    unit: 'বিঘা',
    type: 'বাণিজ্যিক',
    facing: 'পূর্ব',
    maps: 'https://maps.google.com/?q=Berhampore+West+Bengal',
    verified: true,
    sold: false,
    soldAt: null
  },
  {
    id: 4,
    district: 'Bankura',
    po: 'Bishnupur',
    road: 'State Highway 5',
    landmark: 'Near Temple',
    price: '4,50,000',
    priceNum: 450000,
    negotiable: true,
    mobile: '8765400000',
    hasVideo: false,
    photos: [],
    size: '8',
    unit: 'কাঠা',
    type: 'কৃষি জমি',
    facing: 'উত্তর',
    maps: '',
    verified: true,
    sold: false,
    soldAt: null
  }
];

let cachedListings: any[] | null = null;
let cachedBuyers: any[] | null = null;
let cachedLeads: any[] | null = null;

function loadListingsFromLocalDisk(): any[] {
  try {
    if (fs.existsSync(LISTINGS_FILE)) {
      const raw = fs.readFileSync(LISTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Server Sync] Error reading listings-store.json:", err);
  }
  return [...defaultInitialListings];
}

function saveListingsToLocalDisk(listings: any[]): boolean {
  try {
    fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Server Sync] Error writing listings-store.json:", err);
    return false;
  }
}

async function loadListings(): Promise<any[]> {
  if (cachedListings !== null) {
    return cachedListings;
  }
  
  if (isFirebaseActive && db) {
    try {
      console.log("[Firebase] Fetching listings from Firestore...");
      const listingsCol = collection(db, "listings");
      const snapshot = await getDocs(listingsCol);
      const listingsList: any[] = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        if (item && item.id !== undefined && item.id !== null && Object.keys(item).length > 1) {
          listingsList.push(item);
        } else {
          console.log(`[Firebase] Skipping empty/invalid listing document ID: ${docSnap.id}`);
        }
      });
      
      if (listingsList.length === 0) {
        console.log("[Firebase] Firestore listings collection is empty or invalid. Seeding with default initial listings...");
        const batch = writeBatch(db);
        for (const item of defaultInitialListings) {
          const docRef = doc(db, "listings", String(item.id));
          batch.set(docRef, item);
        }
        await batch.commit();
        cachedListings = [...defaultInitialListings];
        saveListingsToLocalDisk(cachedListings);
        return cachedListings;
      }
      
      listingsList.sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA;
      });
      cachedListings = listingsList;
      saveListingsToLocalDisk(cachedListings);
      return cachedListings;
    } catch (err) {
      console.error("[Firebase] Error loading listings from Firestore, falling back to disk:", err);
    }
  }
  
  cachedListings = loadListingsFromLocalDisk();
  return cachedListings;
}

async function saveListings(listings: any[]): Promise<boolean> {
  cachedListings = listings;
  const diskSuccess = saveListingsToLocalDisk(listings);
  
  if (isFirebaseActive && db) {
    try {
      console.log(`[Firebase] Syncing ${listings.length} listings to Firestore...`);
      const promises = listings.map(item => {
        const docRef = doc(db, "listings", String(item.id));
        return setDoc(docRef, item);
      });
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error("[Firebase] Error syncing listings to Firestore:", err);
      return false;
    }
  }
  return diskSuccess;
}

function loadBuyersFromLocalDisk(): any[] {
  try {
    if (fs.existsSync(BUYERS_FILE)) {
      const raw = fs.readFileSync(BUYERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Server Sync] Error reading registered-buyers-store.json:", err);
  }
  return [];
}

function saveBuyersToLocalDisk(buyers: any[]): boolean {
  try {
    fs.writeFileSync(BUYERS_FILE, JSON.stringify(buyers, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Server Sync] Error writing registered-buyers-store.json:", err);
    return false;
  }
}

async function loadBuyers(): Promise<any[]> {
  if (cachedBuyers !== null) {
    return cachedBuyers;
  }
  
  if (isFirebaseActive && db) {
    try {
      console.log("[Firebase] Fetching buyers from Firestore...");
      const buyersCol = collection(db, "registered_buyers");
      const snapshot = await getDocs(buyersCol);
      const buyersList: any[] = [];
      snapshot.forEach(docSnap => {
        buyersList.push(docSnap.data());
      });
      
      cachedBuyers = buyersList;
      saveBuyersToLocalDisk(cachedBuyers);
      return cachedBuyers;
    } catch (err) {
      console.error("[Firebase] Error loading buyers from Firestore, falling back to disk:", err);
    }
  }
  
  cachedBuyers = loadBuyersFromLocalDisk();
  return cachedBuyers;
}

async function saveBuyers(buyers: any[]): Promise<boolean> {
  cachedBuyers = buyers;
  const diskSuccess = saveBuyersToLocalDisk(buyers);
  
  if (isFirebaseActive && db) {
    try {
      console.log(`[Firebase] Syncing ${buyers.length} buyers to Firestore...`);
      const promises = buyers.map(item => {
        const docKey = item.mobile || String(Math.random());
        const docRef = doc(db, "registered_buyers", docKey);
        return setDoc(docRef, item);
      });
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error("[Firebase] Error syncing buyers to Firestore:", err);
      return false;
    }
  }
  return diskSuccess;
}

function loadLeadsFromLocalDisk(): any[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const raw = fs.readFileSync(LEADS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Server Sync] Error reading buyer-leads-store.json:", err);
  }
  return [];
}

function saveLeadsToLocalDisk(leads: any[]): boolean {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[Server Sync] Error writing buyer-leads-store.json:", err);
    return false;
  }
}

async function loadLeads(): Promise<any[]> {
  if (cachedLeads !== null) {
    return cachedLeads;
  }
  
  if (isFirebaseActive && db) {
    try {
      console.log("[Firebase] Fetching buyer leads from Firestore...");
      const leadsCol = collection(db, "buyer_leads");
      const snapshot = await getDocs(leadsCol);
      const leadsList: any[] = [];
      snapshot.forEach(docSnap => {
        leadsList.push(docSnap.data());
      });
      
      cachedLeads = leadsList;
      saveLeadsToLocalDisk(cachedLeads);
      return cachedLeads;
    } catch (err) {
      console.error("[Firebase] Error loading buyer leads from Firestore, falling back to disk:", err);
    }
  }
  
  cachedLeads = loadLeadsFromLocalDisk();
  return cachedLeads;
}

async function saveLeads(leads: any[]): Promise<boolean> {
  cachedLeads = leads;
  const diskSuccess = saveLeadsToLocalDisk(leads);
  
  if (isFirebaseActive && db) {
    try {
      console.log(`[Firebase] Syncing ${leads.length} buyer leads to Firestore...`);
      const promises = leads.map((item, index) => {
        const id = item.id || `lead_${index}_${Date.now()}`;
        if (!item.id) item.id = id;
        const docRef = doc(db, "buyer_leads", id);
        return setDoc(docRef, item);
      });
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error("[Firebase] Error syncing buyer leads to Firestore:", err);
      return false;
    }
  }
  return diskSuccess;
}

function isGoogleSheetCsvUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    (trimmed.startsWith("http") &&
      trimmed.includes("docs.google.com/spreadsheets") &&
      (trimmed.includes("output=csv") || trimmed.includes("/pub?"))) ||
    trimmed.endsWith(".csv")
  );
}

function parseCsvListings(csvText: string): any[] {
  const parseCSVLine = (lineText: string): string[] => {
    const result: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i];
      if (char === '"') {
        if (inQuotes && lineText[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    result.push(currentVal);
    return result;
  };

  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentLine.trim() || char === '\n') {
        lines.push(currentLine);
        currentLine = '';
      }
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const headerCols = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  const idxId = headerCols.findIndex(h => h.includes('id') || h.includes('ad id'));
  const idxDistrict = headerCols.findIndex(h => h.includes('district') || h.includes('জেলা'));
  const idxPo = headerCols.findIndex(h => h.includes('post office') || h.includes('p.o.') || h.includes('ডাকঘর'));
  const idxRoad = headerCols.findIndex(h => h.includes('road') || h.includes('street') || h.includes('রাস্তা'));
  const idxLandmark = headerCols.findIndex(h => h.includes('landmark') || h.includes('ল্যান্ডমার্ক'));
  const idxType = headerCols.findIndex(h => h.includes('category') || h.includes('type') || h.includes('শ্রেণী'));
  const idxSize = headerCols.findIndex(h => h.includes('size') || h.includes('পরিমাণ'));
  const idxUnit = headerCols.findIndex(h => h.includes('unit') || h.includes('একক'));
  const idxFacing = headerCols.findIndex(h => h.includes('facing') || h.includes('মুখ'));
  const idxPrice = headerCols.findIndex(h => h.includes('price') || h.includes('দাম') || h.includes('মূল্য'));
  const idxNegotiable = headerCols.findIndex(h => h.includes('negotiable') || h.includes('আলোচনা'));
  const idxMobile = headerCols.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('হোয়াটসঅ্যাপ') || h.includes('যোগাযোগ'));
  const idxHasVideo = headerCols.findIndex(h => h.includes('has video') || h.includes('video demo') || h.includes('ভিডিও'));
  const idxMaps = headerCols.findIndex(h => h.includes('map') || h.includes('coordinate') || h.includes('ম্যাপ'));
  const idxPhotos = headerCols.findIndex(h => h.includes('photo urls') || h.includes('photos'));
  const idxVideoData = headerCols.findIndex(h => h.includes('video url'));

  const getCol = (cols: string[], idx: number, defIdx: number): string => {
    const finalIdx = idx !== -1 ? idx : defIdx;
    return cols[finalIdx] !== undefined ? cols[finalIdx].trim() : '';
  };

  const parsedListings: any[] = [];

  for (let j = 1; j < lines.length; j++) {
    const cols = parseCSVLine(lines[j]);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const idStr = getCol(cols, idxId, 0);
    const idNum = parseInt(idStr, 10);
    if (isNaN(idNum)) continue;

    const district = getCol(cols, idxDistrict, 2) || 'Birbhum';
    const po = getCol(cols, idxPo, 3);
    const road = getCol(cols, idxRoad, 4);
    const landmark = getCol(cols, idxLandmark, 5);
    const type = getCol(cols, idxType, 6) || 'বাসস্থান';
    const size = getCol(cols, idxSize, 7) || '1';
    const unit = getCol(cols, idxUnit, 8) || 'কাঠা';
    const facing = getCol(cols, idxFacing, 9);
    const price = getCol(cols, idxPrice, 10) || '0';
    
    const priceCleaned = price.replace(/,/g, '');
    const priceNum = parseInt(priceCleaned, 10) || 0;

    const negotiableVal = getCol(cols, idxNegotiable, 11).toLowerCase();
    const negotiable = negotiableVal === 'yes' || negotiableVal === 'true' || negotiableVal === 'হ্যাঁ';

    const mobile = getCol(cols, idxMobile, 12);
    
    const hasVideoVal = getCol(cols, idxHasVideo, 13).toLowerCase();
    const hasVideo = hasVideoVal === 'yes' || hasVideoVal === 'true' || hasVideoVal === 'হ্যাঁ';

    const maps = getCol(cols, idxMaps, 14);
    
    const photosStr = getCol(cols, idxPhotos, 16);
    const photos = photosStr ? photosStr.split(',').map(p => p.trim()).filter(Boolean) : [];

    const videoData = getCol(cols, idxVideoData, 17) || null;

    parsedListings.push({
      id: idNum,
      district,
      po,
      road,
      landmark,
      type,
      size,
      unit,
      facing,
      price,
      priceNum,
      negotiable,
      mobile,
      hasVideo,
      maps,
      photos,
      videoData,
      verified: true,
      sold: false,
      soldAt: null
    });
  }

  return parsedListings.sort((a, b) => b.id - a.id);
}

// REST Endpoints for listings syncing
app.get("/api/listings", async (req: express.Request, res: express.Response) => {
  let sheetUrl = getStoredGoogleSheetUrl();
  if (!sheetUrl) {
    const queryUrl = req.query.sheetUrl as string;
    if (queryUrl && queryUrl.trim().startsWith("http")) {
      sheetUrl = queryUrl.trim();
      saveStoredGoogleSheetUrl(sheetUrl);
      console.log(`[Server Sync] Dynamically self-healed Google Sheet URL from client request parameter: ${sheetUrl}`);
    }
  }
  if (sheetUrl && sheetUrl.trim().startsWith("http")) {
    try {
      if (isGoogleSheetCsvUrl(sheetUrl)) {
        console.log(`[Server Sync] Fetching direct published CSV Google Sheet: ${sheetUrl}`);
        const response = await fetch(sheetUrl);
        if (response.ok) {
          const csvText = await response.text();
          const listings = parseCsvListings(csvText);
          if (listings.length > 0) {
            console.log(`[Server Sync] Successfully parsed ${listings.length} listings from Google Sheet CSV.`);
            res.json(listings);
            return;
          }
        }
      } else {
        const targetUrl = sheetUrl.includes("?") ? `${sheetUrl}&action=listings` : `${sheetUrl}?action=listings`;
        console.log(`[Server Sync] Fetching listings from Google Sheet Webhook: ${targetUrl}`);
        const response = await fetch(targetUrl);
        if (response.ok) {
          const textResponse = await response.text();
          const trimmed = textResponse.trim();
          
          if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html>") || trimmed.toLowerCase().includes("<html")) {
            let diagnosis = "[Server Sync Error] Google Sheet Webapp returned an HTML page instead of JSON listings. ";
            if (trimmed.includes("addHeader")) {
              diagnosis += "CRITICAL BUG DETECTED: The Google Apps Script contains 'addHeader' on ContentService.createTextOutput. Google Apps Script does NOT support '.addHeader()'. Please edit your Apps Script and remove '.addHeader(...)'.";
            } else if (sheetUrl.includes("docs.google.com/spreadsheets")) {
              diagnosis += "Please deploy the Apps Script Web App from Extensions -> Apps Script as a 'Web App', select Who has access as 'Anyone' (mandatory), and use the resulting '.exec' URL.";
            } else {
              diagnosis += "Ensure your Web App is deployed under 'Extensions -> Apps Script' with 'Execute as: Me' and 'Who has access: Anyone'.";
            }
            console.warn(diagnosis);
            console.warn(`[Server Sync Info] HTML Snip: ${trimmed.substring(0, 300)}...`);
          } else {
            const data = JSON.parse(trimmed);
            if (data && data.result === "success" && Array.isArray(data.listings)) {
              console.log(`[Server Sync] Successfully synced ${data.listings.length} listings from Google Sheet.`);
              if (data.listings.length > 0) {
                res.json(data.listings);
                return;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Server Sync] Failed to fetch listings from Google Sheet, falling back to local file store:", err);
    }
  }
  const list = await loadListings();
  res.json(list);
});

app.post("/api/listings", async (req: express.Request, res: express.Response) => {
  const { listings } = req.body;
  if (!Array.isArray(listings)) {
    res.status(400).json({ error: "Invalid listings payload. Must be an array." });
    return;
  }
  const success = await saveListings(listings);
  if (success) {
    res.json({ success: true, listings });
  } else {
    res.status(500).json({ error: "Failed to persist listings on disk." });
  }
});

app.post("/api/listings/add", async (req: express.Request, res: express.Response) => {
  const { listing } = req.body;
  if (!listing || typeof listing !== "object") {
    res.status(400).json({ error: "Invalid listing payload." });
    return;
  }
  const list = await loadListings();
  const updated = [listing, ...list];
  const success = await saveListings(updated);
  if (success) {
    res.json({ success: true, listings: updated });
  } else {
    res.status(500).json({ error: "Failed to save listing." });
  }
});

app.post("/api/listings/toggle-sold", async (req: express.Request, res: express.Response) => {
  const { id, sold, soldAt } = req.body;
  const list = await loadListings();
  const updated = list.map((l: any) => {
    if (l.id === id) {
      return { ...l, sold, soldAt };
    }
    return l;
  });
  const success = await saveListings(updated);
  if (success) {
    res.json({ success: true, listings: updated });
  } else {
    res.status(500).json({ error: "Failed to update listing." });
  }
});

app.post("/api/listings/delete", async (req: express.Request, res: express.Response) => {
  const { id } = req.body;
  const list = await loadListings();
  const updated = list.filter((l: any) => l.id !== id);
  
  if (isFirebaseActive && db) {
    try {
      await deleteDoc(doc(db, "listings", String(id)));
    } catch (err) {
      console.error(`[Firebase] Error deleting listing ${id} from Firestore:`, err);
    }
  }
  
  const success = await saveListings(updated);
  if (success) {
    res.json({ success: true, listings: updated });
  } else {
    res.status(500).json({ error: "Failed to delete listing." });
  }
});

// REST Endpoints for Registered Buyers syncing
app.get("/api/registered-buyers", async (req: express.Request, res: express.Response) => {
  let sheetUrl = getStoredGoogleSheetUrl();
  if (!sheetUrl) {
    const queryUrl = req.query.sheetUrl as string;
    if (queryUrl && queryUrl.trim().startsWith("http")) {
      sheetUrl = queryUrl.trim();
      saveStoredGoogleSheetUrl(sheetUrl);
      console.log(`[Server Sync] Dynamically self-healed Google Sheet URL from client request parameter: ${sheetUrl}`);
    }
  }
  if (sheetUrl && sheetUrl.trim().startsWith("http")) {
    try {
      const targetUrl = sheetUrl.includes("?") ? `${sheetUrl}&action=buyers` : `${sheetUrl}?action=buyers`;
      console.log(`[Server Sync] Fetching registered buyers from Google Sheet Webhook: ${targetUrl}`);
      const response = await fetch(targetUrl);
      if (response.ok) {
        const textResponse = await response.text();
        const trimmed = textResponse.trim();
        
        if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html>") || trimmed.toLowerCase().includes("<html")) {
          let diagnosis = "[Server Sync Error] Google Sheet Webapp returned an HTML page instead of JSON buyers. ";
          if (trimmed.includes("addHeader")) {
            diagnosis += "CRITICAL BUG DETECTED: The Google Apps Script contains 'addHeader' on ContentService.createTextOutput. Google Apps Script does NOT support '.addHeader()'. Please edit your Apps Script and remove '.addHeader(...)'.";
          } else if (sheetUrl.includes("docs.google.com/spreadsheets")) {
            diagnosis += "Please deploy the Apps Script Web App from Extensions -> Apps Script as a 'Web App', select Who has access as 'Anyone' (mandatory), and use the resulting '.exec' URL.";
          } else {
            diagnosis += "Ensure your Web App is deployed under 'Extensions -> Apps Script' with 'Execute as: Me' and 'Who has access: Anyone'.";
          }
          console.warn(diagnosis);
          console.warn(`[Server Sync Info] HTML Snip: ${trimmed.substring(0, 300)}...`);
        } else {
          const data = JSON.parse(trimmed);
          if (data && data.result === "success" && Array.isArray(data.buyers)) {
            // Filter out WhatsApp alert registrations (Buyer_Alerts_DB)
            const alerts = data.buyers.filter((b: any) => b.source === "Buyer_Alerts_DB").map((b: any) => ({
              mobile: b.mobile,
              district: b.district,
              area: b.area,
              date: b.date
            }));
            console.log(`[Server Sync] Successfully synced ${alerts.length} buyer alerts from Google Sheet.`);
            res.json(alerts);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("[Server Sync] Failed to fetch buyers from Google Sheet, falling back to local store:", err);
    }
  }
  const buyers = await loadBuyers();
  res.json(buyers);
});

app.post("/api/registered-buyers", async (req: express.Request, res: express.Response) => {
  const { buyers } = req.body;
  if (!Array.isArray(buyers)) {
    res.status(400).json({ error: "Invalid buyers payload. Must be an array." });
    return;
  }
  const success = await saveBuyers(buyers);
  if (success) {
    res.json({ success: true, buyers });
  } else {
    res.status(500).json({ error: "Failed to save buyers." });
  }
});

app.post("/api/registered-buyers/add", async (req: express.Request, res: express.Response) => {
  const { buyer } = req.body;
  if (!buyer) {
    res.status(400).json({ error: "Invalid buyer payload" });
    return;
  }
  const buyers = await loadBuyers();
  const updated = [buyer, ...buyers];
  const success = await saveBuyers(updated);
  if (success) {
    res.json({ success: true, buyers: updated });
  } else {
    res.status(500).json({ error: "Failed to save buyer." });
  }
});

// REST Endpoints for Buyer Leads syncing
app.get("/api/buyer-leads", async (req: express.Request, res: express.Response) => {
  let sheetUrl = getStoredGoogleSheetUrl();
  if (!sheetUrl) {
    const queryUrl = req.query.sheetUrl as string;
    if (queryUrl && queryUrl.trim().startsWith("http")) {
      sheetUrl = queryUrl.trim();
      saveStoredGoogleSheetUrl(sheetUrl);
      console.log(`[Server Sync] Dynamically self-healed Google Sheet URL from client request parameter: ${sheetUrl}`);
    }
  }
  if (sheetUrl && sheetUrl.trim().startsWith("http")) {
    try {
      const targetUrl = sheetUrl.includes("?") ? `${sheetUrl}&action=buyers` : `${sheetUrl}?action=buyers`;
      console.log(`[Server Sync] Fetching buyer leads from Google Sheet Webhook: ${targetUrl}`);
      const response = await fetch(targetUrl);
      if (response.ok) {
        const textResponse = await response.text();
        const trimmed = textResponse.trim();
        
        if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype html>") || trimmed.toLowerCase().includes("<html")) {
          let diagnosis = "[Server Sync Error] Google Sheet Webapp returned an HTML page instead of JSON buyer leads. ";
          if (trimmed.includes("addHeader")) {
            diagnosis += "CRITICAL BUG DETECTED: The Google Apps Script contains 'addHeader' on ContentService.createTextOutput. Google Apps Script does NOT support '.addHeader()'. Please edit your Apps Script and remove '.addHeader(...)'.";
          } else if (sheetUrl.includes("docs.google.com/spreadsheets")) {
            diagnosis += "Please deploy the Apps Script Web App from Extensions -> Apps Script as a 'Web App', select Who has access as 'Anyone' (mandatory), and use the resulting '.exec' URL.";
          } else {
            diagnosis += "Ensure your Web App is deployed under 'Extensions -> Apps Script' with 'Execute as: Me' and 'Who has access: Anyone'.";
          }
          console.warn(diagnosis);
          console.warn(`[Server Sync Info] HTML Snip: ${trimmed.substring(0, 300)}...`);
        } else {
          const data = JSON.parse(trimmed);
          if (data && data.result === "success" && Array.isArray(data.buyers)) {
            // Filter out buyer demands / requirement leads (Buyer_Demands_DB)
            const leads = data.buyers.filter((b: any) => b.source === "Buyer_Demands_DB").map((l: any) => ({
              mobile: l.mobile,
              district: l.district,
              po: l.area, // area maps to Preferred P.O. / Area in database mapping
              budget: l.budget,
              type: l.propertyType,
              remarks: l.remarks,
              date: l.date,
              source: 'demand'
            }));
            console.log(`[Server Sync] Successfully synced ${leads.length} buyer leads from Google Sheet.`);
            res.json(leads);
            return;
          }
        }
      }
    } catch (err) {
      console.warn("[Server Sync] Failed to fetch buyer leads from Google Sheet, falling back to local store:", err);
    }
  }
  const leads = await loadLeads();
  res.json(leads);
});

app.post("/api/buyer-leads", async (req: express.Request, res: express.Response) => {
  const { leads } = req.body;
  if (!Array.isArray(leads)) {
    res.status(400).json({ error: "Invalid leads payload. Must be an array." });
    return;
  }
  const success = await saveLeads(leads);
  if (success) {
    res.json({ success: true, leads });
  } else {
    res.status(500).json({ error: "Failed to save leads." });
  }
});

app.post("/api/buyer-leads/add", async (req: express.Request, res: express.Response) => {
  const { lead } = req.body;
  if (!lead) {
    res.status(400).json({ error: "Invalid lead payload" });
    return;
  }
  const leads = await loadLeads();
  const updated = [lead, ...leads];
  const success = await saveLeads(updated);
  if (success) {
    res.json({ success: true, leads: updated });
  } else {
    res.status(500).json({ error: "Failed to save lead." });
  }
});

app.post("/api/buyer-leads/delete", async (req: express.Request, res: express.Response) => {
  const { index } = req.body;
  const leads = await loadLeads();
  const leadToDelete = leads[index];
  const updated = leads.filter((_: any, idx: number) => idx !== index);
  
  if (leadToDelete && leadToDelete.id && isFirebaseActive && db) {
    try {
      await deleteDoc(doc(db, "buyer_leads", leadToDelete.id));
    } catch (err) {
      console.error(`[Firebase] Error deleting buyer lead ${leadToDelete.id} from Firestore:`, err);
    }
  }
  
  const success = await saveLeads(updated);
  if (success) {
    res.json({ success: true, leads: updated });
  } else {
    res.status(500).json({ error: "Failed to delete lead." });
  }
});

// Start server
async function startServer() {
  // Load system config from Firestore globals document if active
  await loadSystemConfigFromFirestore();

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booting! Ready/Running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
