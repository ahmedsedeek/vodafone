// ============================================
// SEED DATA FUNCTIONS
// Generate sample data for testing
// ============================================

/**
 * Handle seed data request via API
 */
function handleSeedData() {
  try {
    seedDummyData();
    return jsonResponse({
      success: true,
      message: 'تم إنشاء البيانات التجريبية بنجاح'
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: 'فشل في إنشاء البيانات: ' + error.toString()
    }, 500);
  }
}

/**
 * Main seed function - can also be run manually from Apps Script
 */
function seedDummyData() {
  const now = nowISO();

  // Create wallets
  const wallet1 = {
    wallet_id: generateUUID(),
    phone_number: '01012345678',
    wallet_name: 'المحفظة الرئيسية',
    initial_balance: 50000,
    current_balance: 50000,
    is_active: 'TRUE',
    notes: 'محفظة العمل الأساسية',
    created_at: now,
    updated_at: now
  };

  const wallet2 = {
    wallet_id: generateUUID(),
    phone_number: '01098765432',
    wallet_name: 'المحفظة الثانوية',
    initial_balance: 25000,
    current_balance: 25000,
    is_active: 'TRUE',
    notes: 'محفظة احتياطية',
    created_at: now,
    updated_at: now
  };

  insertRow(SHEETS.WALLETS, wallet1);
  insertRow(SHEETS.WALLETS, wallet2);

  // Create clients
  const clients = [
    { name: 'أحمد محمد علي', phone: '01111111111', nationalId: '29001011234567', address: 'شارع النيل، المنصورة' },
    { name: 'محمود حسن إبراهيم', phone: '01222222222', nationalId: '', address: 'شارع الجمهورية، طنطا' },
    { name: 'سارة أحمد محمد', phone: '01555555555', nationalId: '', address: '' },
    { name: 'محمد عبدالله', phone: '01066666666', nationalId: '', address: 'المعادي، القاهرة' },
    { name: 'فاطمة السيد', phone: '01277777777', nationalId: '', address: '' }
  ];

  const createdClients = [];

  for (const c of clients) {
    const clientId = generateUUID();
    const client = {
      client_id: clientId,
      client_name: c.name,
      national_id: c.nationalId,
      address: c.address,
      notes: '',
      total_debt: 0,
      is_active: 'TRUE',
      created_at: now,
      updated_at: now
    };
    insertRow(SHEETS.CLIENTS, client);
    createdClients.push(client);

    // Add phone
    const phone = {
      phone_id: generateUUID(),
      client_id: clientId,
      phone_number: c.phone,
      is_primary: 'TRUE',
      phone_label: 'شخصي',
      created_at: now
    };
    insertRow(SHEETS.CLIENT_PHONES, phone);
  }

  // Create transactions over last 30 days
  const wallets = [wallet1, wallet2];
  const transactionAmounts = [500, 1000, 1500, 2000, 2500, 3000, 5000];
  const feePercentages = [0.005, 0.01, 0.015, 0.02];
  const recipientPhones = ['01000000001', '01000000002', '01000000003'];

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - daysAgo);
    const dateStr = Utilities.formatDate(txDate, 'GMT+2', 'yyyy-MM-dd');

    const randomClient = createdClients[Math.floor(Math.random() * createdClients.length)];
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
    const vcAmount = transactionAmounts[Math.floor(Math.random() * transactionAmounts.length)];
    const feePercent = feePercentages[Math.floor(Math.random() * feePercentages.length)];
    const feeAmount = Math.round(vcAmount * feePercent);
    const cashAmount = vcAmount + feeAmount;

    // Random payment status: 40% paid, 30% partial, 30% debt
    const paymentRoll = Math.random();
    let amountPaid = 0;
    let amountDue = cashAmount;
    let paymentStatus = 'debt';

    if (paymentRoll < 0.4) {
      amountPaid = cashAmount;
      amountDue = 0;
      paymentStatus = 'paid';
    } else if (paymentRoll < 0.7) {
      amountPaid = Math.round(cashAmount * (0.3 + Math.random() * 0.4));
      amountDue = cashAmount - amountPaid;
      paymentStatus = 'partial';
    }

    const transaction = {
      transaction_id: generateUUID(),
      wallet_id: randomWallet.wallet_id,
      client_id: randomClient.client_id,
      transaction_type: 'TRANSFER_OUT',
      vc_amount: vcAmount,
      cash_amount: cashAmount,
      fee_amount: feeAmount,
      payment_status: paymentStatus,
      amount_paid: amountPaid,
      amount_due: amountDue,
      recipient_phone: recipientPhones[Math.floor(Math.random() * recipientPhones.length)],
      description: 'تحويل رقم ' + (i + 1),
      attachment_id: '',
      transaction_date: dateStr,
      created_at: now,
      updated_at: now
    };

    insertRow(SHEETS.TRANSACTIONS, transaction);
  }

  // Add some deposits and withdrawals
  for (let i = 0; i < 5; i++) {
    const daysAgo = Math.floor(Math.random() * 15);
    const txDate = new Date();
    txDate.setDate(txDate.getDate() - daysAgo);
    const dateStr = Utilities.formatDate(txDate, 'GMT+2', 'yyyy-MM-dd');

    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
    const amount = [5000, 10000, 15000, 20000][Math.floor(Math.random() * 4)];
    const txType = Math.random() > 0.5 ? 'DEPOSIT' : 'WITHDRAW';

    const transaction = {
      transaction_id: generateUUID(),
      wallet_id: randomWallet.wallet_id,
      client_id: '',
      transaction_type: txType,
      vc_amount: amount,
      cash_amount: amount,
      fee_amount: 0,
      payment_status: 'paid',
      amount_paid: amount,
      amount_due: 0,
      recipient_phone: '',
      description: txType === 'DEPOSIT' ? 'إيداع رصيد' : 'سحب رصيد',
      attachment_id: '',
      transaction_date: dateStr,
      created_at: now,
      updated_at: now
    };

    insertRow(SHEETS.TRANSACTIONS, transaction);
  }

  // Recalculate wallet balances
  recalculateWalletBalance(wallet1.wallet_id);
  recalculateWalletBalance(wallet2.wallet_id);

  // Update client debts
  for (const client of createdClients) {
    updateClientDebt(client.client_id);
  }

  Logger.log('Seed data created successfully!');
}

/**
 * Clear all data from sheets (use with caution!)
 */
function clearAllData() {
  const sheets = [
    SHEETS.WALLETS,
    SHEETS.CLIENTS,
    SHEETS.CLIENT_PHONES,
    SHEETS.TRANSACTIONS,
    SHEETS.PAYMENTS,
    SHEETS.ATTACHMENTS
  ];

  const spreadsheet = getSpreadsheet();

  for (const sheetName of sheets) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  }

  Logger.log('All data cleared!');
}
