// ============================================
// DATABASE FUNCTIONS
// Core CRUD operations for Google Sheets
// ============================================

/**
 * Get all rows from a sheet as objects
 */
function getAllRows(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return []; // Only headers, no data
  }

  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[getFieldName(headers[j])] = data[i][j];
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Get row by ID
 */
function getRowById(sheetName, idField, id) {
  const rows = getAllRows(sheetName);
  return rows.find(row => row[idField] === id) || null;
}

/**
 * Insert a new row
 */
function insertRow(sheetName, data) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(header => {
    const fieldName = getFieldName(header);
    return data[fieldName] !== undefined ? data[fieldName] : '';
  });

  sheet.appendRow(rowData);
  return data;
}

/**
 * Update a row by ID
 */
function updateRow(sheetName, idField, id, updates) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.findIndex(h => getFieldName(h) === idField);

  if (idIndex === -1) {
    throw new Error('ID field not found: ' + idField);
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      // Found the row, update it
      for (let j = 0; j < headers.length; j++) {
        const fieldName = getFieldName(headers[j]);
        if (updates[fieldName] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(updates[fieldName]);
        }
      }

      // Return updated row
      return getRowById(sheetName, idField, id);
    }
  }

  return null; // Not found
}

/**
 * Delete a row by ID
 */
function deleteRow(sheetName, idField, id) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.findIndex(h => getFieldName(h) === idField);

  if (idIndex === -1) {
    throw new Error('ID field not found: ' + idField);
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  return false; // Not found
}

/**
 * Filter rows by a predicate function
 */
function filterRows(sheetName, predicate) {
  const rows = getAllRows(sheetName);
  return rows.filter(predicate);
}

/**
 * Map Arabic header to English field name
 */
function getFieldName(arabicHeader) {
  const mapping = {
    // Wallets
    'معرف المحفظة': 'wallet_id',
    'رقم الهاتف': 'phone_number',
    'اسم المحفظة': 'wallet_name',
    'الرصيد الافتتاحي': 'initial_balance',
    'الرصيد الحالي': 'current_balance',
    'نشط': 'is_active',
    'ملاحظات': 'notes',
    'تاريخ الإنشاء': 'created_at',
    'تاريخ التحديث': 'updated_at',

    // Clients
    'معرف العميل': 'client_id',
    'اسم العميل': 'client_name',
    'الرقم القومي': 'national_id',
    'العنوان': 'address',
    'إجمالي الدين': 'total_debt',

    // Client Phones
    'معرف الهاتف': 'phone_id',
    'رئيسي': 'is_primary',
    'تصنيف': 'phone_label',

    // Transactions
    'معرف المعاملة': 'transaction_id',
    'نوع المعاملة': 'transaction_type',
    'مبلغ ف.ك': 'vc_amount',
    'المبلغ النقدي': 'cash_amount',
    'العمولة': 'fee_amount',
    'حالة الدفع': 'payment_status',
    'المدفوع': 'amount_paid',
    'المتبقي': 'amount_due',
    'رقم المستلم': 'recipient_phone',
    'الوصف': 'description',
    'معرف المرفق': 'attachment_id',
    'تاريخ المعاملة': 'transaction_date',

    // Payments
    'معرف الدفعة': 'payment_id',
    'المبلغ': 'amount',
    'طريقة الدفع': 'payment_method',
    'تاريخ الدفع': 'payment_date',

    // Attachments
    'اسم الملف': 'file_name',
    'معرف الملف': 'file_id',
    'رابط الملف': 'file_url',
    'نوع الملف': 'mime_type',
    'حجم الملف': 'file_size',

    // Sessions
    'معرف الجلسة': 'session_id',
    'توكن الجلسة': 'token_hash',
    'تاريخ الانتهاء': 'expires_at',
  };

  return mapping[arabicHeader] || arabicHeader;
}

/**
 * Generate UUID v4
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Get current ISO timestamp
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Get today's date as yyyy-MM-dd
 */
function todayDate() {
  return Utilities.formatDate(new Date(), 'GMT+2', 'yyyy-MM-dd');
}

/**
 * Format date to yyyy-MM-dd
 */
function formatDateYMD(date) {
  if (!date) return '';
  const d = new Date(date);
  return Utilities.formatDate(d, 'GMT+2', 'yyyy-MM-dd');
}

/**
 * Parse boolean from sheet value
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toUpperCase() === 'TRUE';
  }
  return Boolean(value);
}

/**
 * Parse number from sheet value
 */
function parseNumber(value) {
  if (typeof value === 'number') return value;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Validate Egyptian phone number
 */
function isValidEgyptianPhone(phone) {
  return /^01[0125][0-9]{8}$/.test(phone);
}

/**
 * Calculate days difference
 */
function daysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get start of week (Saturday for Egypt)
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 6 ? 0 : (day + 1);
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of month
 */
function getMonthStart(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Sort array by date field descending
 */
function sortByDateDesc(arr, field) {
  return arr.sort((a, b) => new Date(b[field]) - new Date(a[field]));
}

/**
 * Sort array by date field ascending
 */
function sortByDateAsc(arr, field) {
  return arr.sort((a, b) => new Date(a[field]) - new Date(b[field]));
}
