import { DEFAULT_GOOGLE_SHEET_URL, DEFAULT_FAST2SMS_KEY } from './config';
import { Listing } from './types';

/**
 * Google Sheets Integration Helper
 * 
 * Works by sending submissions as POST JSON requests to a Google Apps Script Web App Webhook.
 * It is highly robust, zero-cost, and does not require complex server-side authentication refreshes.
 */

export function getGoogleSheetUrl(): string {
  if (DEFAULT_GOOGLE_SHEET_URL && DEFAULT_GOOGLE_SHEET_URL.trim().startsWith('http')) {
    return DEFAULT_GOOGLE_SHEET_URL.trim();
  }
  try {
    const localUrl = localStorage.getItem('bm_google_sheet_url');
    if (localUrl && localUrl.trim()) {
      return localUrl.trim();
    }
  } catch {}
  return '';
}

export function setGoogleSheetUrl(url: string | null | undefined): void {
  const finalUrl = (url || '').trim();
  try {
    localStorage.setItem('bm_google_sheet_url', finalUrl);
  } catch {}

  // Sync with Express backend persistently so any visitor, homeowner, or buyer can dispatch alerts
  fetch('/api/save-google-sheet-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: finalUrl })
  })
  .then(res => res.json())
  .then(data => {
    console.log('[Google Sheets Proxy] Successfully synced webhook URL to server configuration:', data);
  })
  .catch(err => {
    console.warn('[Google Sheets Proxy] Failed to sync webhook URL to server configuration:', err);
  });
}

export function getFast2SMSKey(): string {
  if (DEFAULT_FAST2SMS_KEY && DEFAULT_FAST2SMS_KEY.trim() && (DEFAULT_FAST2SMS_KEY as string) !== 'MY_FAST2SMS_KEY') {
    return DEFAULT_FAST2SMS_KEY.trim();
  }
  try {
    const localKey = localStorage.getItem('bm_fast2sms_api_key');
    if (localKey && localKey.trim()) {
      return localKey.trim();
    }
  } catch {}
  return '';
}

export function setFast2SMSKey(key: string | null | undefined): void {
  const finalKey = (key || '').trim();
  try {
    localStorage.setItem('bm_fast2sms_api_key', finalKey);
  } catch {}

  // Sync with Express backend persistently so any visitor or admin actions can dispatch SMS
  fetch('/api/save-fast2sms-key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key: finalKey })
  })
  .then(res => res.json())
  .then(data => {
    console.log('[Fast2SMS Proxy] Successfully synced API Key to server configuration:', data);
  })
  .catch(err => {
    console.warn('[Fast2SMS Proxy] Failed to sync API Key to server configuration:', err);
  });
}

export async function sendToGoogleSheet(
  type: 'seller' | 'buyer_alert' | 'buyer_lead' | 'buyer_unlock' | 'seller_change_status' | 'seller_delete',
  data: any
): Promise<boolean> {
  try {
    console.log(`[Google Sheets Proxy] Forwarding "${type}" submission safely via Express server-side broker...`);
    
    const res = await fetch('/api/submit-to-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data,
        sheetUrl: getGoogleSheetUrl()
      }),
    });

    if (res.ok) {
      const respData = await res.json().catch(() => ({}));
      console.log('[Google Sheets Proxy] Success! Record forwarded and stored securely in Google Sheet database queue.', respData);
      return true;
    } else {
      const errRes = await res.json().catch(() => ({}));
      console.warn('[Google Sheets Proxy] Backend queue submit returned warning:', errRes.error || res.statusText);
      return false;
    }
  } catch (err) {
    console.warn('[Google Sheets Proxy] Network failure during relay submission:', err);
    return false;
  }
}

/**
 * Checks if a given URL is a Google Sheets published CSV URL or any standard CSV URL.
 */
export function isGoogleSheetCsvUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    (trimmed.startsWith('http') &&
      trimmed.includes('docs.google.com/spreadsheets') &&
      (trimmed.includes('output=csv') || trimmed.includes('/pub?'))) ||
    trimmed.endsWith('.csv')
  );
}

/**
 * Parses published CSV Google Sheet raw content into strongly-typed Listing objects.
 */
export function parseCsvListings(csvText: string): Listing[] {
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

  // Parse header columns
  const headerCols = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  // Find column indexes by matching header substring
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

  const parsedListings: Listing[] = [];

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

// Pre-configured Apps Script code template that developers can copy and paste
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ---------------- COPY-PASTE GOOGLE APPS SCRIPT ----------------
// Paste this code in Extensions -> Apps Script inside your Google Sheet!

/**
 * Run this function directly in the Apps Script Editor by clicking 'Run' 
 * to automatically initialize all required sheets, columns, and beautiful headers!
 */
function setupSheets() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheetDefinitions = [
    {
      name: "Seller_Listings_DB",
      headers: [
        "Ad ID", "Submission Date", "District", "Post Office (P.O.)", 
        "Road / Street", "Landmark", "Property Category / Type", 
        "Size", "Unit (Dec/Katha/Bigha)", "Facing Direction", 
        "Price (INR)", "Is Price Negotiable?", "Mobile (WhatsApp)", 
        "Has Video Demo?", "Map Coordinates / PinLink", "Photos Count",
        "Photo URLs", "Video URL"
      ],
      color: "#dcfce7",
      textColor: "#15803d"
    },
    {
      name: "Buyer_Alerts_DB",
      headers: ["Registration Date", "Mobile Number", "Selected District", "Preferred Area/Block"],
      color: "#fef9c3",
      textColor: "#a16207"
    },
    {
      name: "Buyer_Demands_DB",
      headers: [
        "Date Received", "Mobile Number", "Target District", 
        "Preferred P.O.", "Max Budget Range (INR)", 
        "Required Property Type", "Additional Remarks/Details"
      ],
      color: "#dbeafe",
      textColor: "#1d4ed8"
    },
    {
      name: "Buyer_Unlocks_DB",
      headers: [
        "Unlock Timestamp", "Unlocking Buyer Name", "Unlocking Buyer Mobile Number", 
        "Property ID Unlocked", "Property Location", "Property Price", "Seller Mobile Number"
      ],
      color: "#fed7aa",
      textColor: "#c2410c"
    },
    {
      name: "Seller_Status_Updates_DB",
      headers: ["Update Timestamp", "Ad ID", "Mobile (Verified)", "New Status (Sold/Available)", "Location", "Price"],
      color: "#e0f2fe",
      textColor: "#0369a1"
    },
    {
      name: "Seller_Deletions_DB",
      headers: ["Deletion Timestamp", "Ad ID", "Mobile (Verified)", "Location", "Price"],
      color: "#fee2e2",
      textColor: "#b91c1c"
    }
  ];

  sheetDefinitions.forEach(function(def) {
    var sheet = doc.getSheetByName(def.name);
    if (!sheet) {
      sheet = doc.insertSheet(def.name);
    }
    // Only write headers if the sheet is empty or has fewer than 1 row of data
    if (sheet.getLastRow() < 1) {
      sheet.appendRow(def.headers);
      sheet.setRowHeight(1, 28);
      var range = sheet.getRange(1, 1, 1, def.headers.length);
      range.setFontWeight("bold");
      range.setBackground(def.color);
      range.setFontColor(def.textColor);
      try {
        range.setHorizontalAlignment("center");
        range.setVerticalAlignment("middle");
      } catch(e){}
    } else {
      // Self-healing check: ensure headers are fully matching definitions (e.g., adding Photo URLs and Video URL if missing)
      var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (currentHeaders.length < def.headers.length) {
        // Clear and rewrite headers to ensure update
        sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
        var range = sheet.getRange(1, 1, 1, def.headers.length);
        range.setFontWeight("bold");
        range.setBackground(def.color);
        range.setFontColor(def.textColor);
      }
    }
  });

  // All database sheets are initialized! No sheets are deleted to guarantee data safety.
  Logger.log("🎉 BrokerMukto Google Spreadsheet Setup Complete! All 6 Database tabs are ready.");
  return "Setup complete! Created/updated 6 database tabs with styled headers.";
}

/**
 * Helper to save base64 media data (photos/videos) to a folder in user's Google Drive.
 * Generates and returns a public view URL.
 */
function saveFileToDrive(base64Data, fileName, folder) {
  try {
    if (!base64Data || base64Data.indexOf("base64,") === -1) return "";
    var splitData = base64Data.split("base64,");
    var header = splitData[0];
    var rawData = splitData[1];
    var contentType = header.match(/:(.*?);/)[1] || "application/octet-stream";
    var decoded = Utilities.base64Decode(rawData);
    var blob = Utilities.newBlob(decoded, contentType, fileName);
    var file = folder.createFile(blob);
    try {
      file.setSharing(SpreadsheetApp.Sharing.ALLOW_ANYONE_WITH_LINK, SpreadsheetApp.Permission.VIEW);
    } catch(err) {
      Logger.log("Google Drive Sharing permission error (normal in strictly managed workspace domains): " + err.toString());
    }
    var fileId = file.getId();
    // Use direct web content link for smooth in-app rendering
    return "https://docs.google.com/uc?export=view&id=" + fileId;
  } catch(e) {
    Logger.log("Error saving file to Google Drive: " + e.toString());
    return "";
  }
}

function doPost(e) {
  // If run manually from the Google Apps Script IDE, e will be undefined or missing postData
  if (!e || !e.postData || !e.postData.contents) {
    var result = setupSheets();
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "Setup executed from doPost manual click. " + result
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var json = JSON.parse(e.postData.contents);
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // Choose/insert sheets based on data category
    var sheetName = "";
    if (json.type === 'seller') {
      sheetName = "Seller_Listings_DB";
    } else if (json.type === 'buyer_alert') {
      sheetName = "Buyer_Alerts_DB";
    } else if (json.type === 'buyer_lead') {
      sheetName = "Buyer_Demands_DB";
    } else if (json.type === 'buyer_unlock') {
      sheetName = "Buyer_Unlocks_DB";
    } else if (json.type === 'seller_change_status') {
      sheetName = "Seller_Status_Updates_DB";
    } else if (json.type === 'seller_delete') {
      sheetName = "Seller_Deletions_DB";
    } else {
      sheetName = "All_Submissions_Backup";
    }
    
    // Ensure sheet exists
    var sheet = doc.getSheetByName(sheetName);
    if (!sheet) {
      setupSheets(); // Initialize all sheets properly
      sheet = doc.getSheetByName(sheetName);
    }
    
    var rowData = [];
    var nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    
    if (json.type === 'seller') {
      var photoUrls = [];
      var videoUrlStr = "";
      
      // Save photos to Google Drive
      if (json.data.photos && Array.isArray(json.data.photos) && json.data.photos.length > 0) {
        try {
          var folderName = "BrokerMukto_Media";
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          for (var p = 0; p < json.data.photos.length; p++) {
            var photoBase64 = json.data.photos[p];
            if (photoBase64 && photoBase64.indexOf("base64,") !== -1) {
              var pName = "listing_" + (json.data.id || Date.now()) + "_photo_" + (p + 1) + ".jpg";
              var u = saveFileToDrive(photoBase64, pName, folder);
              if (u) photoUrls.push(u);
            }
          }
        } catch(err) {
          Logger.log("Error saving photos: " + err.toString());
        }
      }
      
      // Save video to Google Drive
      if (json.data.videoData && json.data.videoData.indexOf("base64,") !== -1) {
        try {
          var folderName = "BrokerMukto_Media";
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          var vName = "listing_" + (json.data.id || Date.now()) + "_video.mp4";
          videoUrlStr = saveFileToDrive(json.data.videoData, vName, folder);
        } catch(err) {
          Logger.log("Error saving video: " + err.toString());
        }
      }

      rowData = [
        json.data.id || "",
        nowStr,
        json.data.district || "",
        json.data.po || "",
        json.data.road || "",
        json.data.landmark || "",
        json.data.type || "",
        json.data.size || "",
        json.data.unit || "",
        json.data.facing || "",
        json.data.price || "",
        json.data.negotiable ? "Yes" : "No",
        json.data.mobile || "",
        (videoUrlStr || json.data.hasVideo) ? "Yes" : "No",
        json.data.maps || "",
        photoUrls.length || (json.data.photos ? json.data.photos.length : 0),
        photoUrls.join(","),
        videoUrlStr
      ];
    } else if (json.type === 'buyer_alert') {
      rowData = [
        json.data.date || nowStr,
        json.data.mobile || "",
        json.data.district || "",
        json.data.area || ""
      ];
    } else if (json.type === 'buyer_lead') {
      rowData = [
        json.data.date || nowStr,
        json.data.mobile || "",
        json.data.district || "",
        json.data.po || "",
        json.data.budget || "",
        json.data.type || "",
        json.data.remarks || ""
      ];
    } else if (json.type === 'buyer_unlock') {
      rowData = [
        nowStr,
        json.data.buyerName || "",
        json.data.buyerMobile || "",
        json.data.id || "",
        json.data.listing ? (json.data.listing.po + ", " + json.data.listing.district) : "",
        json.data.listing ? ("INR " + json.data.listing.price) : "",
        json.data.listing ? json.data.listing.mobile : ""
      ];
    } else if (json.type === 'seller_change_status') {
      rowData = [
        nowStr,
        json.data.id || "",
        json.data.mobile || "",
        json.data.sold ? "Sold" : "Available",
        json.data.location || "",
        json.data.price || ""
      ];
    } else if (json.type === 'seller_delete') {
      rowData = [
        nowStr,
        json.data.id || "",
        json.data.mobile || "",
        json.data.location || "",
        json.data.price || ""
      ];
    }
    
    sheet.appendRow(rowData);
    
    // Auto-resize column widths for beautiful spreadsheet density
    try {
      sheet.autoResizeColumns(1, sheet.getLastColumn());
    } catch(err){}

    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // If run manually from the Google Apps Script IDE, e will be undefined or missing parameter properties
  if (!e) {
    var result = setupSheets();
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "Setup executed from doGet manual click. " + result
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter && e.parameter.action ? e.parameter.action : "buyers";
    
    if (action === "listings") {
      var listings = [];
      
      // 1. Fetch raw listings from Seller_Listings_DB
      var listingsSheet = doc.getSheetByName("Seller_Listings_DB");
      if (listingsSheet) {
        var rows = listingsSheet.getDataRange().getValues();
        if (rows.length > 1) {
          for (var i = 1; i < rows.length; i++) {
            var row = rows[i];
            if (row[0]) { // Has ID
              listings.push({
                id: Number(row[0]),
                date: row[1] ? String(row[1]) : "",
                district: row[2] ? String(row[2]) : "",
                po: row[3] ? String(row[3]) : "",
                road: row[4] ? String(row[4]) : "",
                landmark: row[5] ? String(row[5]) : "",
                type: row[6] ? String(row[6]) : "",
                size: row[7] ? String(row[7]) : "",
                unit: row[8] ? String(row[8]) : "",
                facing: row[9] ? String(row[9]) : "",
                price: row[10] ? String(row[10]) : "",
                negotiable: String(row[11]).toLowerCase() === "yes",
                mobile: row[12] ? String(row[12]) : "",
                hasVideo: String(row[13]).toLowerCase() === "yes",
                maps: row[14] ? String(row[14]) : "",
                photos: row[16] ? String(row[16]).split(",").filter(Boolean) : [],
                videoData: row[17] ? String(row[17]) : null,
                verified: true,
                sold: false,
                soldAt: null
              });
            }
          }
        }
      }
      
      // 2. Apply Status updates from Seller_Status_Updates_DB
      var statusSheet = doc.getSheetByName("Seller_Status_Updates_DB");
      if (statusSheet) {
        var statusRows = statusSheet.getDataRange().getValues();
        if (statusRows.length > 1) {
          for (var k = 1; k < statusRows.length; k++) {
            var statusRow = statusRows[k];
            var adId = Number(statusRow[1]);
            var isSold = String(statusRow[3]).toLowerCase() === "sold";
            var timestampStr = statusRow[0] ? String(statusRow[0]) : "";
            for (var m = 0; m < listings.length; m++) {
              if (listings[m].id === adId) {
                listings[m].sold = isSold;
                listings[m].soldAt = isSold ? new Date(timestampStr).getTime() || Date.now() : null;
              }
            }
          }
        }
      }
      
      // 3. Apply Deletions from Seller_Deletions_DB
      var deletionSheet = doc.getSheetByName("Seller_Deletions_DB");
      if (deletionSheet) {
        var deletionRows = deletionSheet.getDataRange().getValues();
        var deletedIds = {};
        if (deletionRows.length > 1) {
          for (var d = 1; d < deletionRows.length; d++) {
            var delRow = deletionRows[d];
            var delId = Number(delRow[1]);
            if (delId) {
              deletedIds[delId] = true;
            }
          }
        }
        listings = listings.filter(function(item) {
          return !deletedIds[item.id];
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ result: "success", listings: listings }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default action: Fetch buyers and demands
    var buyers = [];
    
    // 1. Fetch from Buyer_Alerts_DB (WhatsApp Alert registrations)
    var alertSheet = doc.getSheetByName("Buyer_Alerts_DB");
    if (alertSheet) {
      var rows = alertSheet.getDataRange().getValues();
      if (rows.length > 1) {
        for (var i = 1; i < rows.length; i++) {
          var row = rows[i];
          if (row[1]) { // Has mobile
            buyers.push({
              source: "Buyer_Alerts_DB",
              date: row[0] ? String(row[0]) : "",
              mobile: String(row[1]).trim(),
              district: row[2] ? String(row[2]) : "",
              area: row[3] ? String(row[3]) : ""
            });
          }
        }
      }
    }
    
    // 2. Fetch from Buyer_Demands_DB (Requirement leads)
    var demandSheet = doc.getSheetByName("Buyer_Demands_DB");
    if (demandSheet) {
      var rowsDemand = demandSheet.getDataRange().getValues();
      if (rowsDemand.length > 1) {
        for (var j = 1; j < rowsDemand.length; j++) {
          var rowD = rowsDemand[j];
          if (rowD[1]) { // Has mobile
            buyers.push({
              source: "Buyer_Demands_DB",
              date: rowD[0] ? String(rowD[0]) : "",
              mobile: String(rowD[1]).trim(),
              district: rowD[2] ? String(rowD[2]) : "",
              area: rowD[3] ? String(rowD[3]) : "", // Preferred P.O. / Area
              budget: rowD[4] ? String(rowD[4]) : "",
              propertyType: rowD[5] ? String(rowD[5]) : "",
              remarks: rowD[6] ? String(rowD[6]) : ""
            });
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success", buyers: buyers }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
\`;
`;
