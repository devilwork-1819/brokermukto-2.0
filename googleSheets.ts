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

export function setGoogleSheetUrl(url: string): void {
  try {
    localStorage.setItem('bm_google_sheet_url', url);
  } catch {}
}

export async function sendToGoogleSheet(
  type: 'seller' | 'buyer_alert' | 'buyer_lead' | 'buyer_unlock' | 'seller_change_status' | 'seller_delete',
  data: any
): Promise<boolean> {
  const url = getGoogleSheetUrl();
  if (!url) {
    console.log('[Google Sheets] No Webhook URL configured. Submission saved locally only.');
    return false;
  }

  try {
    console.log(`[Google Sheets] Dispatching ${type} row to Google Sheet webhook...`);
    
    // Google Apps Script requires a simple POST request. 
    // We use mode: 'no-cors' to bypass CORS, which works perfectly for appending rows from client-side SPA.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      }),
    });

    console.log('[Google Sheets] Success! Appended to spreadsheet queue.');
    return true;
  } catch (err) {
    console.warn('[Google Sheets] Webhook POST failed:', err);
    return false;
  }
}

// Pre-configured Apps Script code template that developers can copy and paste
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ---------------- PAGE COPY-PASTE GOOGLE APPS SCRIPT ----------------
// Paste this code in Extensions -> Apps Script inside your Google Sheet!

function doPost(e) {
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
    
    var sheet = doc.getSheetByName(sheetName);
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
      // Auto-populate custom header rows
      if (json.type === 'seller') {
        sheet.appendRow([
          "Ad ID", "Submission Date", "District", "Post Office (P.O.)", 
          "Road / Street", "Landmark", "Property Category / Type", 
          "Size", "Unit (Dec/Katha/Bigha)", "Facing Direction", 
          "Price (INR)", "Is Price Negotiable?", "Mobile (WhatsApp)", 
          "Has Video Demo?", "Map Coordinates / PinLink", "Photos Count"
        ]);
        sheet.setRowHeight(1, 28);
        sheet.getRange("A1:P1").setFontWeight("bold").setBackground("#dcfce7").setFontColor("#15803d");
      } else if (json.type === 'buyer_alert') {
        sheet.appendRow(["Registration Date", "Mobile Number", "Selected District", "Preferred Area/Block"]);
        sheet.setRowHeight(1, 28);
        sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#fef9c3").setFontColor("#a16207");
      } else if (json.type === 'buyer_lead') {
        sheet.appendRow([
          "Date Received", "Mobile Number", "Target District", 
          "Preferred P.O.", "Max Budget Range (INR)", 
          "Required Property Type", "Additional Remarks/Details"
        ]);
        sheet.setRowHeight(1, 28);
        sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#dbeafe").setFontColor("#1d4ed8");
      } else if (json.type === 'buyer_unlock') {
        sheet.appendRow([
          "Unlock Timestamp", "Unlocking Buyer Name", "Unlocking Buyer Mobile Number", 
          "Property ID Unlocked", "Property Location", "Property Price", "Seller Mobile Number"
        ]);
        sheet.setRowHeight(1, 28);
        sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#fed7aa").setFontColor("#c2410c");
      } else if (json.type === 'seller_change_status') {
        sheet.appendRow([
          "Update Timestamp", "Ad ID", "Mobile (Verified)", "New Status (Sold/Available)", "Location", "Price"
        ]);
        sheet.setRowHeight(1, 28);
        sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#e0f2fe").setFontColor("#0369a1");
      } else if (json.type === 'seller_delete') {
        sheet.appendRow([
          "Deletion Timestamp", "Ad ID", "Mobile (Verified)", "Location", "Price"
        ]);
        sheet.setRowHeight(1, 28);
        sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#fee2e2").setFontColor("#b91c1c");
      }
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
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
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
