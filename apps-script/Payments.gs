// ============================================
// PAYMENT API HANDLERS
// FIFO Payment Allocation
// ============================================

/**
 * Get payments with filters
 */
function handleGetPayments(params) {
  let payments = getAllRows(SHEETS.PAYMENTS);

  // Apply filters
  if (params.client_id) {
    payments = payments.filter(p => p.client_id === params.client_id);
  }

  if (params.from) {
    payments = payments.filter(p => p.payment_date >= params.from);
  }

  if (params.to) {
    payments = payments.filter(p => p.payment_date <= params.to);
  }

  // Enrich with client names
  const clients = getAllRows(SHEETS.CLIENTS);
  const transactions = getAllRows(SHEETS.TRANSACTIONS);

  const enriched = payments.map(p => {
    const client = clients.find(c => c.client_id === p.client_id);
    const transaction = transactions.find(t => t.transaction_id === p.transaction_id);

    return {
      ...p,
      amount: parseNumber(p.amount),
      client_name: client ? client.client_name : null,
      transaction_description: transaction ? transaction.description : null
    };
  });

  // Sort by date descending
  const sorted = sortByDateDesc(enriched, 'payment_date');

  return jsonResponse({
    success: true,
    data: sorted
  });
}

/**
 * Create a payment with FIFO allocation
 */
function handleCreatePayment(body) {
  const { client_id, amount, payment_method, notes, payment_date } = body;

  // Validation
  if (!client_id) {
    return jsonResponse({ success: false, message: 'العميل مطلوب' }, 400);
  }

  const paymentAmount = parseNumber(amount);
  if (paymentAmount <= 0) {
    return jsonResponse({ success: false, message: 'المبلغ يجب أن يكون أكبر من صفر' }, 400);
  }

  // Verify client exists
  const client = getRowById(SHEETS.CLIENTS, 'client_id', client_id);
  if (!client) {
    return jsonResponse({ success: false, message: 'العميل غير موجود' }, 404);
  }

  // Get unpaid transactions (sorted by date - oldest first)
  const unpaidTransactions = getUnpaidTransactionsByClient(client_id);

  if (unpaidTransactions.length === 0) {
    return jsonResponse({ success: false, message: 'لا توجد معاملات غير مدفوعة لهذا العميل' }, 400);
  }

  // FIFO Allocation
  let remainingAmount = paymentAmount;
  const allocations = [];
  const now = nowISO();
  const payDate = payment_date || todayDate();

  for (const transaction of unpaidTransactions) {
    if (remainingAmount <= 0) break;

    const amountDue = transaction.amount_due;
    const allocationAmount = Math.min(remainingAmount, amountDue);

    // Create payment record for this allocation
    const payment = {
      payment_id: generateUUID(),
      client_id,
      transaction_id: transaction.transaction_id,
      amount: allocationAmount,
      payment_method: payment_method || 'cash',
      notes: notes || '',
      payment_date: payDate,
      created_at: now
    };

    insertRow(SHEETS.PAYMENTS, payment);

    // Update transaction payment info
    updateTransactionPayment(transaction.transaction_id, allocationAmount);

    allocations.push({
      ...payment,
      transactionDescription: transaction.description
    });

    remainingAmount -= allocationAmount;
  }

  // Update client's total debt
  updateClientDebt(client_id);

  // Calculate results
  const totalAllocated = paymentAmount - remainingAmount;

  return jsonResponse({
    success: true,
    message: remainingAmount > 0
      ? `تم تسجيل دفعة ${totalAllocated.toFixed(2)} جنيه. متبقي ${remainingAmount.toFixed(2)} جنيه بدون تخصيص`
      : 'تم تسجيل الدفعة بنجاح',
    data: {
      payments: allocations,
      totalAllocated,
      unallocated: remainingAmount
    }
  });
}

/**
 * Get payments for a specific transaction
 */
function getPaymentsByTransaction(transactionId) {
  return filterRows(SHEETS.PAYMENTS, p => p.transaction_id === transactionId)
    .map(p => ({
      ...p,
      amount: parseNumber(p.amount)
    }));
}

/**
 * Get total payments in a date range
 */
function getTotalPaymentsForPeriod(fromDate, toDate) {
  const payments = filterRows(SHEETS.PAYMENTS, p =>
    p.payment_date >= fromDate && p.payment_date <= toDate
  );

  return payments.reduce((sum, p) => sum + parseNumber(p.amount), 0);
}
