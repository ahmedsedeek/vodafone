// ============================================
// VODAFONE CASH TRACKER - GOOGLE APPS SCRIPT
// Main Entry Point & Router
// ============================================

// Configuration
const CONFIG = {
  SPREADSHEET_NAME: 'Vodafone Cash Tracker - Production',
  DRIVE_FOLDER_NAME: 'Vodafone Cash Attachments',
  API_KEY_PROPERTY: 'API_KEY',
  SPREADSHEET_ID_PROPERTY: 'SPREADSHEET_ID',
  DRIVE_FOLDER_ID_PROPERTY: 'DRIVE_FOLDER_ID',
  ADMIN_PASSWORD_PROPERTY: 'ADMIN_PASSWORD',
  SESSION_SECRET_PROPERTY: 'SESSION_SECRET',
  ALLOWED_ORIGINS: ['https://your-domain.vercel.app'], // Update after deployment
};

// Sheet names (Arabic headers)
const SHEETS = {
  WALLETS: 'المحافظ',
  CLIENTS: 'العملاء',
  CLIENT_PHONES: 'أرقام العملاء',
  TRANSACTIONS: 'المعاملات',
  PAYMENTS: 'المدفوعات',
  ATTACHMENTS: 'المرفقات',
  SESSIONS: 'الجلسات',
};

// ============================================
// MAIN ENTRY POINTS
// ============================================

/**
 * Handle GET requests
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Handle POST requests
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Main request router
 */
function handleRequest(e, method) {
  const startTime = new Date();

  try {
    // Parse request
    const params = e.parameter || {};
    const path = params.path || '';
    const apiKey = params.apiKey || e.parameter?.apiKey;

    // Parse body for POST requests
    let body = {};
    if (method === 'POST' && e.postData) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        return jsonResponse({ success: false, message: 'Invalid JSON body' }, 400);
      }
    }

    // API Key validation (skip for auth routes)
    if (!path.startsWith('auth/') && !validateApiKey(apiKey)) {
      return jsonResponse({ success: false, message: 'Invalid API key' }, 401);
    }

    // Route the request
    const result = routeRequest(path, method, params, body);

    // Log request duration
    const duration = new Date() - startTime;
    Logger.log(`${method} /${path} - ${duration}ms`);

    return result;

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return jsonResponse({
      success: false,
      message: 'خطأ في الخادم',
      error: error.toString()
    }, 500);
  }
}

/**
 * Route requests to appropriate handlers
 */
function routeRequest(path, method, params, body) {
  // Auth routes
  if (path === 'auth/login' && method === 'POST') {
    return handleLogin(body);
  }
  if (path === 'auth/logout' && method === 'POST') {
    return handleLogout(body);
  }
  if (path === 'auth/check' && method === 'GET') {
    return handleAuthCheck(params);
  }

  // Wallet routes
  if (path === 'wallets' && method === 'GET') {
    return handleGetWallets();
  }
  if (path === 'wallets' && method === 'POST') {
    return handleCreateWallet(body);
  }
  if (path.match(/^wallets\/[\w-]+$/) && method === 'GET') {
    const walletId = path.split('/')[1];
    return handleGetWallet(walletId);
  }
  if (path.match(/^wallets\/[\w-]+$/) && method === 'POST') {
    const walletId = path.split('/')[1];
    return handleUpdateWallet(walletId, body);
  }
  if (path.match(/^wallets\/[\w-]+\/delete$/) && method === 'POST') {
    const walletId = path.split('/')[1];
    return handleDeleteWallet(walletId);
  }

  // Client routes
  if (path === 'clients' && method === 'GET') {
    return handleGetClients();
  }
  if (path === 'clients' && method === 'POST') {
    return handleCreateClient(body);
  }
  if (path.match(/^clients\/[\w-]+$/) && method === 'GET') {
    const clientId = path.split('/')[1];
    return handleGetClient(clientId);
  }
  if (path.match(/^clients\/[\w-]+\/phones$/) && method === 'POST') {
    const clientId = path.split('/')[1];
    return handleAddClientPhone(clientId, body);
  }
  if (path.match(/^clients\/[\w-]+\/statement$/) && method === 'GET') {
    const clientId = path.split('/')[1];
    return handleGetClientStatement(clientId, params);
  }
  if (path.match(/^clients\/[\w-]+\/delete$/) && method === 'POST') {
    const clientId = path.split('/')[1];
    return handleDeleteClient(clientId);
  }

  // Transaction routes
  if (path === 'transactions' && method === 'GET') {
    return handleGetTransactions(params);
  }
  if (path === 'transactions' && method === 'POST') {
    return handleCreateTransaction(body);
  }
  if (path.match(/^transactions\/[\w-]+\/delete$/) && method === 'POST') {
    const transactionId = path.split('/')[1];
    return handleDeleteTransaction(transactionId);
  }

  // Payment routes
  if (path === 'payments' && method === 'GET') {
    return handleGetPayments(params);
  }
  if (path === 'payments' && method === 'POST') {
    return handleCreatePayment(body);
  }

  // Attachment routes
  if (path === 'attachments' && method === 'POST') {
    return handleUploadAttachment(body);
  }

  // Report routes
  if (path === 'dashboard' && method === 'GET') {
    return handleGetDashboard();
  }
  if (path === 'reports/chart' && method === 'GET') {
    return handleGetProfitChart(params);
  }
  if (path === 'reports/profit' && method === 'GET') {
    return handleGetProfitReport(params);
  }
  if (path === 'reports/debt-aging' && method === 'GET') {
    return handleGetDebtAging();
  }
  if (path === 'reports/top-clients' && method === 'GET') {
    return handleGetTopClients(params);
  }

  // PDF generation
  if (path.match(/^clients\/[\w-]+\/statement\/pdf$/) && method === 'GET') {
    const clientId = path.split('/')[1];
    return handleGenerateStatementPdf(clientId, params);
  }

  // Seed data (for development/testing)
  if (path === 'seed' && method === 'POST') {
    return handleSeedData();
  }

  // 404
  return jsonResponse({ success: false, message: 'Route not found: ' + path }, 404);
}

/**
 * Validate API key
 */
function validateApiKey(key) {
  const storedKey = PropertiesService.getScriptProperties().getProperty(CONFIG.API_KEY_PROPERTY);
  return key && key === storedKey;
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, statusCode = 200) {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    timestamp: new Date().toISOString(),
    ...data
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create PDF response
 */
function pdfResponse(blob) {
  return ContentService
    .createTextOutput(Utilities.base64Encode(blob.getBytes()))
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================
// SETUP FUNCTIONS (Run once)
// ============================================

/**
 * Initial setup - creates spreadsheet, sheets, and folder
 * Run this function manually from Apps Script editor
 */
function initialSetup() {
  Logger.log('Starting initial setup...');

  // Create spreadsheet
  const spreadsheet = createProductionSpreadsheet();
  const spreadsheetId = spreadsheet.getId();

  // Create Drive folder
  const folder = createAttachmentsFolder();
  const folderId = folder.getId();

  // Generate API key
  const apiKey = generateApiKey();

  // Generate session secret
  const sessionSecret = Utilities.getUuid() + '-' + Utilities.getUuid();

  // Store in script properties
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.SPREADSHEET_ID_PROPERTY, spreadsheetId);
  props.setProperty(CONFIG.DRIVE_FOLDER_ID_PROPERTY, folderId);
  props.setProperty(CONFIG.API_KEY_PROPERTY, apiKey);
  props.setProperty(CONFIG.SESSION_SECRET_PROPERTY, sessionSecret);
  props.setProperty(CONFIG.ADMIN_PASSWORD_PROPERTY, 'CHANGE_THIS_PASSWORD');

  Logger.log('='.repeat(50));
  Logger.log('SETUP COMPLETE');
  Logger.log('='.repeat(50));
  Logger.log('Spreadsheet ID: ' + spreadsheetId);
  Logger.log('Spreadsheet URL: ' + spreadsheet.getUrl());
  Logger.log('Drive Folder ID: ' + folderId);
  Logger.log('Drive Folder URL: https://drive.google.com/drive/folders/' + folderId);
  Logger.log('API Key: ' + apiKey);
  Logger.log('');
  Logger.log('IMPORTANT: Change the admin password in Script Properties!');
  Logger.log('Go to: Project Settings > Script Properties > ADMIN_PASSWORD');
  Logger.log('='.repeat(50));

  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheet.getUrl(),
    folderId,
    folderUrl: 'https://drive.google.com/drive/folders/' + folderId,
    apiKey
  };
}

/**
 * Generate a secure API key
 */
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'vck_'; // Vodafone Cash Key prefix
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Create the production spreadsheet with all sheets
 */
function createProductionSpreadsheet() {
  // Create new spreadsheet
  const spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);

  // Create sheets with headers
  createWalletsSheet(spreadsheet);
  createClientsSheet(spreadsheet);
  createClientPhonesSheet(spreadsheet);
  createTransactionsSheet(spreadsheet);
  createPaymentsSheet(spreadsheet);
  createAttachmentsSheet(spreadsheet);
  createSessionsSheet(spreadsheet);

  // Delete default Sheet1
  const defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet) {
    spreadsheet.deleteSheet(defaultSheet);
  }

  Logger.log('Spreadsheet created: ' + spreadsheet.getUrl());
  return spreadsheet;
}

/**
 * Create Wallets sheet
 */
function createWalletsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.WALLETS);

  // Headers (Arabic)
  const headers = [
    'معرف المحفظة',      // wallet_id
    'رقم الهاتف',        // phone_number
    'اسم المحفظة',       // wallet_name
    'الرصيد الافتتاحي',  // initial_balance
    'الرصيد الحالي',     // current_balance
    'نشط',              // is_active
    'ملاحظات',          // notes
    'تاريخ الإنشاء',     // created_at
    'تاريخ التحديث'      // updated_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  // Set column widths
  sheet.setColumnWidth(1, 300); // wallet_id
  sheet.setColumnWidth(2, 120); // phone_number
  sheet.setColumnWidth(3, 150); // wallet_name
  sheet.setColumnWidth(4, 120); // initial_balance
  sheet.setColumnWidth(5, 120); // current_balance
  sheet.setColumnWidth(6, 60);  // is_active
  sheet.setColumnWidth(7, 200); // notes
  sheet.setColumnWidth(8, 150); // created_at
  sheet.setColumnWidth(9, 150); // updated_at

  // Data validation for is_active
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  sheet.getRange('F2:F').setDataValidation(activeRule);

  // Number format for balance columns
  sheet.getRange('D2:E').setNumberFormat('#,##0.00');

  return sheet;
}

/**
 * Create Clients sheet
 */
function createClientsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.CLIENTS);

  const headers = [
    'معرف العميل',       // client_id
    'اسم العميل',        // client_name
    'الرقم القومي',      // national_id
    'العنوان',          // address
    'ملاحظات',          // notes
    'إجمالي الدين',      // total_debt
    'نشط',              // is_active
    'تاريخ الإنشاء',     // created_at
    'تاريخ التحديث'      // updated_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 200);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 60);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 150);

  // Data validation for is_active
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  sheet.getRange('G2:G').setDataValidation(activeRule);

  // Number format for debt
  sheet.getRange('F2:F').setNumberFormat('#,##0.00');

  return sheet;
}

/**
 * Create Client Phones sheet
 */
function createClientPhonesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.CLIENT_PHONES);

  const headers = [
    'معرف الهاتف',       // phone_id
    'معرف العميل',       // client_id
    'رقم الهاتف',        // phone_number
    'رئيسي',            // is_primary
    'تصنيف',            // phone_label
    'تاريخ الإنشاء'      // created_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 60);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 150);

  // Data validation for is_primary
  const primaryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'], true)
    .build();
  sheet.getRange('D2:D').setDataValidation(primaryRule);

  return sheet;
}

/**
 * Create Transactions sheet
 */
function createTransactionsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.TRANSACTIONS);

  const headers = [
    'معرف المعاملة',      // transaction_id
    'معرف المحفظة',       // wallet_id
    'معرف العميل',        // client_id
    'نوع المعاملة',       // transaction_type
    'مبلغ ف.ك',          // vc_amount
    'المبلغ النقدي',      // cash_amount
    'العمولة',           // fee_amount
    'حالة الدفع',        // payment_status
    'المدفوع',           // amount_paid
    'المتبقي',           // amount_due
    'رقم المستلم',       // recipient_phone
    'الوصف',            // description
    'معرف المرفق',       // attachment_id
    'تاريخ المعاملة',     // transaction_date
    'تاريخ الإنشاء',      // created_at
    'تاريخ التحديث'       // updated_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 100);
  sheet.setColumnWidth(8, 80);
  sheet.setColumnWidth(9, 100);
  sheet.setColumnWidth(10, 100);
  sheet.setColumnWidth(11, 120);
  sheet.setColumnWidth(12, 200);
  sheet.setColumnWidth(13, 300);
  sheet.setColumnWidth(14, 100);
  sheet.setColumnWidth(15, 150);
  sheet.setColumnWidth(16, 150);

  // Data validation for transaction_type
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRANSFER_OUT', 'TRANSFER_IN', 'DEPOSIT', 'WITHDRAW'], true)
    .build();
  sheet.getRange('D2:D').setDataValidation(typeRule);

  // Data validation for payment_status
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['paid', 'partial', 'debt'], true)
    .build();
  sheet.getRange('H2:H').setDataValidation(statusRule);

  // Number formats
  sheet.getRange('E2:G').setNumberFormat('#,##0.00');
  sheet.getRange('I2:J').setNumberFormat('#,##0.00');

  return sheet;
}

/**
 * Create Payments sheet
 */
function createPaymentsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.PAYMENTS);

  const headers = [
    'معرف الدفعة',       // payment_id
    'معرف العميل',       // client_id
    'معرف المعاملة',     // transaction_id
    'المبلغ',           // amount
    'طريقة الدفع',      // payment_method
    'ملاحظات',         // notes
    'تاريخ الدفع',      // payment_date
    'تاريخ الإنشاء'      // created_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 200);
  sheet.setColumnWidth(7, 100);
  sheet.setColumnWidth(8, 150);

  // Data validation for payment_method
  const methodRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['cash', 'vc_transfer', 'bank'], true)
    .build();
  sheet.getRange('E2:E').setDataValidation(methodRule);

  // Number format
  sheet.getRange('D2:D').setNumberFormat('#,##0.00');

  return sheet;
}

/**
 * Create Attachments sheet
 */
function createAttachmentsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.ATTACHMENTS);

  const headers = [
    'معرف المرفق',       // attachment_id
    'معرف المعاملة',     // transaction_id
    'اسم الملف',        // file_name
    'معرف الملف',       // file_id (Drive file ID)
    'رابط الملف',       // file_url
    'نوع الملف',        // mime_type
    'حجم الملف',        // file_size
    'تاريخ الإنشاء'      // created_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 300);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 80);
  sheet.setColumnWidth(8, 150);

  return sheet;
}

/**
 * Create Sessions sheet (for auth)
 */
function createSessionsSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet(SHEETS.SESSIONS);

  const headers = [
    'معرف الجلسة',       // session_id
    'توكن الجلسة',       // token_hash
    'تاريخ الإنشاء',      // created_at
    'تاريخ الانتهاء'      // expires_at
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 150);

  return sheet;
}

/**
 * Format header row
 */
function formatHeaderRow(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange
    .setBackground('#e60000') // Vodafone red
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // Freeze header row
  sheet.setFrozenRows(1);
}

/**
 * Create attachments folder in Drive
 */
function createAttachmentsFolder() {
  const folder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  Logger.log('Drive folder created: ' + folder.getUrl());
  return folder;
}

/**
 * Get spreadsheet by stored ID
 */
function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.SPREADSHEET_ID_PROPERTY);
  if (!id) {
    throw new Error('Spreadsheet ID not found. Run initialSetup() first.');
  }
  return SpreadsheetApp.openById(id);
}

/**
 * Get Drive folder by stored ID
 */
function getDriveFolder() {
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.DRIVE_FOLDER_ID_PROPERTY);
  if (!id) {
    throw new Error('Drive folder ID not found. Run initialSetup() first.');
  }
  return DriveApp.getFolderById(id);
}
