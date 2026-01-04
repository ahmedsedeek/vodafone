// ============================================
// TRANSACTION API HANDLERS
// ============================================

/**
 * Get transactions with filters
 */
function handleGetTransactions(params) {
  let transactions = getAllRows(SHEETS.TRANSACTIONS);

  // Apply filters
  if (params.from) {
    transactions = transactions.filter(t => t.transaction_date >= params.from);
  }

  if (params.to) {
    transactions = transactions.filter(t => t.transaction_date <= params.to);
  }

  if (params.wallet_id) {
    transactions = transactions.filter(t => t.wallet_id === params.wallet_id);
  }

  if (params.client_id) {
    transactions = transactions.filter(t => t.client_id === params.client_id);
  }

  if (params.payment_status) {
    transactions = transactions.filter(t => t.payment_status === params.payment_status);
  }

  if (params.transaction_type) {
    transactions = transactions.filter(t => t.transaction_type === params.transaction_type);
  }

  // Enrich with wallet and client names
  const wallets = getAllRows(SHEETS.WALLETS);
  const clients = getAllRows(SHEETS.CLIENTS);
  const attachments = getAllRows(SHEETS.ATTACHMENTS);

  const enriched = transactions.map(t => {
    const wallet = wallets.find(w => w.wallet_id === t.wallet_id);
    const client = clients.find(c => c.client_id === t.client_id);
    const attachment = attachments.find(a => a.attachment_id === t.attachment_id);

    return {
      ...t,
      vc_amount: parseNumber(t.vc_amount),
      cash_amount: parseNumber(t.cash_amount),
      fee_amount: parseNumber(t.fee_amount),
      amount_paid: parseNumber(t.amount_paid),
      amount_due: parseNumber(t.amount_due),
      wallet_name: wallet ? wallet.wallet_name : null,
      client_name: client ? client.client_name : null,
      attachment_url: attachment ? attachment.file_url : null
    };
  });

  // Sort by date descending
  const sorted = sortByDateDesc(enriched, 'transaction_date');

  return jsonResponse({
    success: true,
    data: sorted
  });
}

/**
 * Create a new transaction
 */
function handleCreateTransaction(body) {
  const {
    wallet_id,
    client_id,
    transaction_type,
    vc_amount,
    cash_amount,
    fee_amount,
    recipient_phone,
    description,
    transaction_date
  } = body;

  // Validation
  if (!wallet_id) {
    return jsonResponse({ success: false, message: 'المحفظة مطلوبة' }, 400);
  }

  if (!transaction_type) {
    return jsonResponse({ success: false, message: 'نوع المعاملة مطلوب' }, 400);
  }

  const validTypes = ['TRANSFER_OUT', 'TRANSFER_IN', 'DEPOSIT', 'WITHDRAW'];
  if (!validTypes.includes(transaction_type)) {
    return jsonResponse({ success: false, message: 'نوع المعاملة غير صحيح' }, 400);
  }

  // Verify wallet exists
  const wallet = getRowById(SHEETS.WALLETS, 'wallet_id', wallet_id);
  if (!wallet) {
    return jsonResponse({ success: false, message: 'المحفظة غير موجودة' }, 404);
  }

  // Verify client exists if provided
  if (client_id) {
    const client = getRowById(SHEETS.CLIENTS, 'client_id', client_id);
    if (!client) {
      return jsonResponse({ success: false, message: 'العميل غير موجود' }, 404);
    }
  }

  // Calculate amounts based on transaction type
  let finalVcAmount = parseNumber(vc_amount) || 0;
  let finalCashAmount = parseNumber(cash_amount) || 0;
  let finalFeeAmount = parseNumber(fee_amount) || 0;
  let paymentStatus = 'paid';
  let amountPaid = 0;
  let amountDue = 0;

  if (transaction_type === 'TRANSFER_OUT') {
    // Client sends money: cash_amount = vc_amount + fee
    if (finalCashAmount > 0 && finalVcAmount > 0 && finalFeeAmount === 0) {
      finalFeeAmount = finalCashAmount - finalVcAmount;
    } else if (finalCashAmount === 0 && finalVcAmount > 0 && finalFeeAmount > 0) {
      finalCashAmount = finalVcAmount + finalFeeAmount;
    } else if (finalCashAmount > 0 && finalFeeAmount > 0 && finalVcAmount === 0) {
      finalVcAmount = finalCashAmount - finalFeeAmount;
    }

    // For TRANSFER_OUT, payment tracking is based on cash_amount
    amountDue = finalCashAmount;
    paymentStatus = 'debt';

  } else if (transaction_type === 'TRANSFER_IN') {
    // Client receives money: cash_amount = vc_amount - fee
    if (finalCashAmount > 0 && finalVcAmount > 0 && finalFeeAmount === 0) {
      finalFeeAmount = finalVcAmount - finalCashAmount;
    } else if (finalCashAmount === 0 && finalVcAmount > 0 && finalFeeAmount > 0) {
      finalCashAmount = finalVcAmount - finalFeeAmount;
    } else if (finalCashAmount > 0 && finalFeeAmount > 0 && finalVcAmount === 0) {
      finalVcAmount = finalCashAmount + finalFeeAmount;
    }

    // TRANSFER_IN is always paid (we paid the client)
    amountPaid = finalCashAmount;
    amountDue = 0;
    paymentStatus = 'paid';

  } else if (transaction_type === 'DEPOSIT' || transaction_type === 'WITHDRAW') {
    // Internal operations: cash = vc, no fee
    finalCashAmount = finalVcAmount;
    finalFeeAmount = 0;
    amountPaid = finalCashAmount;
    amountDue = 0;
    paymentStatus = 'paid';
  }

  const now = nowISO();
  const txDate = transaction_date || todayDate();

  const transaction = {
    transaction_id: generateUUID(),
    wallet_id,
    client_id: client_id || '',
    transaction_type,
    vc_amount: finalVcAmount,
    cash_amount: finalCashAmount,
    fee_amount: finalFeeAmount,
    payment_status: paymentStatus,
    amount_paid: amountPaid,
    amount_due: amountDue,
    recipient_phone: recipient_phone || '',
    description: description || '',
    attachment_id: '',
    transaction_date: txDate,
    created_at: now,
    updated_at: now
  };

  insertRow(SHEETS.TRANSACTIONS, transaction);

  // Recalculate wallet balance
  recalculateWalletBalance(wallet_id);

  // Update client debt if applicable
  if (client_id && transaction_type === 'TRANSFER_OUT') {
    updateClientDebt(client_id);
  }

  return jsonResponse({
    success: true,
    message: 'تم إنشاء المعاملة بنجاح',
    data: transaction
  });
}

/**
 * Update transaction payment info
 */
function updateTransactionPayment(transactionId, amountPaid) {
  const transaction = getRowById(SHEETS.TRANSACTIONS, 'transaction_id', transactionId);
  if (!transaction) return null;

  const cashAmount = parseNumber(transaction.cash_amount);
  const newAmountPaid = parseNumber(transaction.amount_paid) + amountPaid;
  const newAmountDue = Math.max(0, cashAmount - newAmountPaid);

  let newStatus = 'debt';
  if (newAmountDue === 0) {
    newStatus = 'paid';
  } else if (newAmountPaid > 0) {
    newStatus = 'partial';
  }

  updateRow(SHEETS.TRANSACTIONS, 'transaction_id', transactionId, {
    amount_paid: newAmountPaid,
    amount_due: newAmountDue,
    payment_status: newStatus,
    updated_at: nowISO()
  });

  return {
    transactionId,
    amountPaid: newAmountPaid,
    amountDue: newAmountDue,
    paymentStatus: newStatus
  };
}

/**
 * Get unpaid transactions for a client (for FIFO allocation)
 */
function getUnpaidTransactionsByClient(clientId) {
  const transactions = filterRows(SHEETS.TRANSACTIONS, t =>
    t.client_id === clientId &&
    t.transaction_type === 'TRANSFER_OUT' &&
    (t.payment_status === 'debt' || t.payment_status === 'partial')
  );

  // Sort by date ascending (FIFO - oldest first)
  return sortByDateAsc(transactions, 'transaction_date').map(t => ({
    ...t,
    vc_amount: parseNumber(t.vc_amount),
    cash_amount: parseNumber(t.cash_amount),
    fee_amount: parseNumber(t.fee_amount),
    amount_paid: parseNumber(t.amount_paid),
    amount_due: parseNumber(t.amount_due)
  }));
}
