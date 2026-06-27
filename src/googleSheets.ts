/**
 * Google Sheets Integration Helper
 * 
 * Works by sending submissions as POST JSON requests to a Google Apps Script Web App Webhook.
 * It is highly robust, zero-cost, and does not require complex server-side authentication refreshes.
 */

export function getGoogleSheetUrl(): string {
  try {
    return localStorage.getItem('bm_google_sheet_url') || '';
  } catch {
    return '';
  }
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
  try {
    return localStorage.getItem('bm_fast2sms_api_key') || '';
  } catch {
    return '';
  }
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
        "Has Video Demo?", "Map Coordinates / PinLink", "Photos Count"
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
    }
  });

  // Try to delete Default "Sheet1" if it's unused to clean up the spreadsheet
  try {
    var sheet1 = doc.getSheetByName("Sheet1");
    if (sheet1 && doc.getSheets().length > 1 && sheet1.getLastRow() === 0) {
      doc.deleteSheet(sheet1);
    }
  } catch(e){}

  Logger.log("🎉 BrokerMukto Google Spreadsheet Setup Complete! All 6 Database tabs are ready.");
  return "Setup complete! Created 6 database tabs with styled headers.";
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
        json.data.hasVideo ? "Yes" : "No",
        json.data.maps || "",
        json.data.photos ? json.data.photos.length : 0
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
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
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
                photos: [],
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
        .setMimeType(ContentService.MimeType.JSON)
        .addHeader("Access-Control-Allow-Origin", "*");
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
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  }
}
`;
