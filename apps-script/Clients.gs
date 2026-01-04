// ============================================
// CLIENT API HANDLERS
// ============================================

/**
 * Get all clients with phones
 */
function handleGetClients() {
  const clients = getAllRows(SHEETS.CLIENTS);
  const phones = getAllRows(SHEETS.CLIENT_PHONES);

  // Join phones with clients
  const processed = clients.map(c => ({
    ...c,
    total_debt: parseNumber(c.total_debt),
    is_active: parseBoolean(c.is_active),
    phones: phones
      .filter(p => p.client_id === c.client_id)
      .map(p => ({
        ...p,
        is_primary: parseBoolean(p.is_primary)
      }))
  }));

  // Sort by created_at descending
  const sorted = sortByDateDesc(processed, 'created_at');

  return jsonResponse({
    success: true,
    data: sorted
  });
}

/**
 * Get client by ID
 */
function handleGetClient(clientId) {
  const client = getRowById(SHEETS.CLIENTS, 'client_id', clientId);

  if (!client) {
    return jsonResponse({ success: false, message: 'العميل غير موجود' }, 404);
  }

  const phones = filterRows(SHEETS.CLIENT_PHONES, p => p.client_id === clientId);

  return jsonResponse({
    success: true,
    data: {
      ...client,
      total_debt: parseNumber(client.total_debt),
      is_active: parseBoolean(client.is_active),
      phones: phones.map(p => ({
        ...p,
        is_primary: parseBoolean(p.is_primary)
      }))
    }
  });
}

/**
 * Create a new client
 */
function handleCreateClient(body) {
  const { client_name, national_id, address, notes, phone_number, phone_label } = body;

  // Validation
  if (!client_name) {
    return jsonResponse({ success: false, message: 'اسم العميل مطلوب' }, 400);
  }

  const now = nowISO();
  const clientId = generateUUID();

  const client = {
    client_id: clientId,
    client_name,
    national_id: national_id || '',
    address: address || '',
    notes: notes || '',
    total_debt: 0,
    is_active: 'TRUE',
    created_at: now,
    updated_at: now
  };

  insertRow(SHEETS.CLIENTS, client);

  // Add phone if provided
  let phones = [];
  if (phone_number) {
    if (!isValidEgyptianPhone(phone_number)) {
      // Rollback client creation
      deleteRow(SHEETS.CLIENTS, 'client_id', clientId);
      return jsonResponse({ success: false, message: 'رقم الهاتف غير صحيح' }, 400);
    }

    const phone = {
      phone_id: generateUUID(),
      client_id: clientId,
      phone_number,
      is_primary: 'TRUE',
      phone_label: phone_label || 'شخصي',
      created_at: now
    };

    insertRow(SHEETS.CLIENT_PHONES, phone);
    phones.push({
      ...phone,
      is_primary: true
    });
  }

  return jsonResponse({
    success: true,
    message: 'تم إنشاء العميل بنجاح',
    data: {
      ...client,
      total_debt: 0,
      is_active: true,
      phones
    }
  });
}

/**
 * Add phone to client
 */
function handleAddClientPhone(clientId, body) {
  const client = getRowById(SHEETS.CLIENTS, 'client_id', clientId);

  if (!client) {
    return jsonResponse({ success: false, message: 'العميل غير موجود' }, 404);
  }

  const { phone_number, is_primary, phone_label } = body;

  if (!phone_number) {
    return jsonResponse({ success: false, message: 'رقم الهاتف مطلوب' }, 400);
  }

  if (!isValidEgyptianPhone(phone_number)) {
    return jsonResponse({ success: false, message: 'رقم الهاتف غير صحيح' }, 400);
  }

  // If new phone is primary, remove primary from others
  if (is_primary) {
    const existingPhones = filterRows(SHEETS.CLIENT_PHONES, p => p.client_id === clientId);
    existingPhones.forEach(p => {
      if (parseBoolean(p.is_primary)) {
        updateRow(SHEETS.CLIENT_PHONES, 'phone_id', p.phone_id, { is_primary: 'FALSE' });
      }
    });
  }

  const phone = {
    phone_id: generateUUID(),
    client_id: clientId,
    phone_number,
    is_primary: is_primary ? 'TRUE' : 'FALSE',
    phone_label: phone_label || 'شخصي',
    created_at: nowISO()
  };

  insertRow(SHEETS.CLIENT_PHONES, phone);

  return jsonResponse({
    success: true,
    message: 'تم إضافة رقم الهاتف بنجاح',
    data: {
      ...phone,
      is_primary: parseBoolean(phone.is_primary)
    }
  });
}

/**
 * Update client's total debt from unpaid transactions
 */
function updateClientDebt(clientId) {
  const transactions = filterRows(SHEETS.TRANSACTIONS, t =>
    t.client_id === clientId &&
    t.transaction_type === 'TRANSFER_OUT' &&
    (t.payment_status === 'debt' || t.payment_status === 'partial')
  );

  const totalDebt = transactions.reduce((sum, t) => sum + parseNumber(t.amount_due), 0);

  updateRow(SHEETS.CLIENTS, 'client_id', clientId, {
    total_debt: totalDebt,
    updated_at: nowISO()
  });

  return totalDebt;
}

/**
 * Get total debt across all clients
 */
function getTotalClientDebts() {
  const clients = getAllRows(SHEETS.CLIENTS);
  return clients.reduce((sum, c) => sum + parseNumber(c.total_debt), 0);
}

/**
 * Get count of active clients (with transactions in last 30 days)
 */
function getActiveClientsCount() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = filterRows(SHEETS.TRANSACTIONS, t => {
    const txDate = new Date(t.transaction_date);
    return t.client_id && txDate >= thirtyDaysAgo;
  });

  const uniqueClients = new Set(transactions.map(t => t.client_id));
  return uniqueClients.size;
}

/**
 * Get client statement for date range
 */
function handleGetClientStatement(clientId, params) {
  const client = getRowById(SHEETS.CLIENTS, 'client_id', clientId);

  if (!client) {
    return jsonResponse({ success: false, message: 'العميل غير موجود' }, 404);
  }

  // Get phones
  const phones = filterRows(SHEETS.CLIENT_PHONES, p => p.client_id === clientId);

  // Date range
  const today = todayDate();
  const monthStart = formatDateYMD(getMonthStart(new Date()));
  const fromDate = params.from || monthStart;
  const toDate = params.to || today;

  // Get all transactions for this client
  const allTransactions = filterRows(SHEETS.TRANSACTIONS, t =>
    t.client_id === clientId && t.transaction_type === 'TRANSFER_OUT'
  );

  // Get all payments for this client
  const allPayments = filterRows(SHEETS.PAYMENTS, p => p.client_id === clientId);

  // Calculate opening balance (transactions before fromDate minus payments before fromDate)
  let openingBalance = 0;

  allTransactions.forEach(t => {
    if (t.transaction_date < fromDate) {
      openingBalance += parseNumber(t.amount_due);
    }
  });

  allPayments.forEach(p => {
    if (p.payment_date < fromDate) {
      openingBalance -= parseNumber(p.amount);
    }
  });

  // Get period transactions
  const periodTransactions = allTransactions
    .filter(t => t.transaction_date >= fromDate && t.transaction_date <= toDate)
    .map(t => ({
      ...t,
      vc_amount: parseNumber(t.vc_amount),
      cash_amount: parseNumber(t.cash_amount),
      fee_amount: parseNumber(t.fee_amount),
      amount_paid: parseNumber(t.amount_paid),
      amount_due: parseNumber(t.amount_due)
    }));

  // Get period payments
  const periodPayments = allPayments
    .filter(p => p.payment_date >= fromDate && p.payment_date <= toDate)
    .map(p => ({
      ...p,
      amount: parseNumber(p.amount)
    }));

  // Calculate totals
  const periodDebits = periodTransactions.reduce((sum, t) => sum + t.amount_due, 0);
  const periodCredits = periodPayments.reduce((sum, p) => sum + p.amount, 0);
  const closingBalance = openingBalance + periodDebits - periodCredits;

  // Sort by date
  sortByDateAsc(periodTransactions, 'transaction_date');
  sortByDateAsc(periodPayments, 'payment_date');

  return jsonResponse({
    success: true,
    data: {
      client: {
        ...client,
        total_debt: parseNumber(client.total_debt),
        is_active: parseBoolean(client.is_active),
        phones: phones.map(p => ({
          ...p,
          is_primary: parseBoolean(p.is_primary)
        }))
      },
      fromDate,
      toDate,
      openingBalance,
      transactions: periodTransactions,
      payments: periodPayments,
      periodDebits,
      periodCredits,
      closingBalance
    }
  });
}
