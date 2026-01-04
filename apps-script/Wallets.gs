// ============================================
// WALLET API HANDLERS
// ============================================

/**
 * Get all wallets
 */
function handleGetWallets() {
  const wallets = getAllRows(SHEETS.WALLETS);

  // Convert boolean and number fields
  const processed = wallets.map(w => ({
    ...w,
    initial_balance: parseNumber(w.initial_balance),
    current_balance: parseNumber(w.current_balance),
    is_active: parseBoolean(w.is_active)
  }));

  // Sort by created_at descending
  const sorted = sortByDateDesc(processed, 'created_at');

  return jsonResponse({
    success: true,
    data: sorted
  });
}

/**
 * Get wallet by ID
 */
function handleGetWallet(walletId) {
  const wallet = getRowById(SHEETS.WALLETS, 'wallet_id', walletId);

  if (!wallet) {
    return jsonResponse({ success: false, message: 'المحفظة غير موجودة' }, 404);
  }

  return jsonResponse({
    success: true,
    data: {
      ...wallet,
      initial_balance: parseNumber(wallet.initial_balance),
      current_balance: parseNumber(wallet.current_balance),
      is_active: parseBoolean(wallet.is_active)
    }
  });
}

/**
 * Create a new wallet
 */
function handleCreateWallet(body) {
  const { phone_number, wallet_name, initial_balance, notes } = body;

  // Validation
  if (!phone_number) {
    return jsonResponse({ success: false, message: 'رقم الهاتف مطلوب' }, 400);
  }

  if (!wallet_name) {
    return jsonResponse({ success: false, message: 'اسم المحفظة مطلوب' }, 400);
  }

  if (!isValidEgyptianPhone(phone_number)) {
    return jsonResponse({ success: false, message: 'رقم الهاتف غير صحيح' }, 400);
  }

  // Check for duplicate phone
  const existing = filterRows(SHEETS.WALLETS, w => w.phone_number === phone_number);
  if (existing.length > 0) {
    return jsonResponse({ success: false, message: 'رقم الهاتف مسجل بالفعل' }, 400);
  }

  const now = nowISO();
  const balance = parseNumber(initial_balance) || 0;

  const wallet = {
    wallet_id: generateUUID(),
    phone_number,
    wallet_name,
    initial_balance: balance,
    current_balance: balance,
    is_active: 'TRUE',
    notes: notes || '',
    created_at: now,
    updated_at: now
  };

  insertRow(SHEETS.WALLETS, wallet);

  return jsonResponse({
    success: true,
    message: 'تم إنشاء المحفظة بنجاح',
    data: {
      ...wallet,
      initial_balance: balance,
      current_balance: balance,
      is_active: true
    }
  });
}

/**
 * Update a wallet
 */
function handleUpdateWallet(walletId, body) {
  const wallet = getRowById(SHEETS.WALLETS, 'wallet_id', walletId);

  if (!wallet) {
    return jsonResponse({ success: false, message: 'المحفظة غير موجودة' }, 404);
  }

  const updates = {
    updated_at: nowISO()
  };

  if (body.wallet_name !== undefined) {
    updates.wallet_name = body.wallet_name;
  }

  if (body.is_active !== undefined) {
    updates.is_active = body.is_active ? 'TRUE' : 'FALSE';
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  const updated = updateRow(SHEETS.WALLETS, 'wallet_id', walletId, updates);

  return jsonResponse({
    success: true,
    message: 'تم تحديث المحفظة بنجاح',
    data: {
      ...updated,
      initial_balance: parseNumber(updated.initial_balance),
      current_balance: parseNumber(updated.current_balance),
      is_active: parseBoolean(updated.is_active)
    }
  });
}

/**
 * Recalculate wallet balance from transactions
 */
function recalculateWalletBalance(walletId) {
  const wallet = getRowById(SHEETS.WALLETS, 'wallet_id', walletId);
  if (!wallet) return;

  const transactions = filterRows(SHEETS.TRANSACTIONS, t => t.wallet_id === walletId);
  const initialBalance = parseNumber(wallet.initial_balance);

  let balance = initialBalance;

  transactions.forEach(t => {
    const vcAmount = parseNumber(t.vc_amount);
    const type = t.transaction_type;

    if (type === 'TRANSFER_OUT' || type === 'WITHDRAW') {
      balance -= vcAmount;
    } else if (type === 'TRANSFER_IN' || type === 'DEPOSIT') {
      balance += vcAmount;
    }
  });

  updateRow(SHEETS.WALLETS, 'wallet_id', walletId, {
    current_balance: balance,
    updated_at: nowISO()
  });

  return balance;
}

/**
 * Get total balance across all wallets
 */
function getTotalWalletBalance() {
  const wallets = getAllRows(SHEETS.WALLETS);
  return wallets.reduce((sum, w) => sum + parseNumber(w.current_balance), 0);
}

/**
 * Delete a wallet
 */
function handleDeleteWallet(walletId) {
  const wallet = getRowById(SHEETS.WALLETS, 'wallet_id', walletId);

  if (!wallet) {
    return jsonResponse({ success: false, message: 'المحفظة غير موجودة' }, 404);
  }

  // Check if wallet has transactions
  const transactions = filterRows(SHEETS.TRANSACTIONS, t => t.wallet_id === walletId);
  if (transactions.length > 0) {
    return jsonResponse({
      success: false,
      message: 'لا يمكن حذف المحفظة لأنها تحتوي على معاملات. يمكنك إلغاء تفعيلها بدلاً من ذلك.'
    }, 400);
  }

  deleteRow(SHEETS.WALLETS, 'wallet_id', walletId);

  return jsonResponse({
    success: true,
    message: 'تم حذف المحفظة بنجاح'
  });
}
