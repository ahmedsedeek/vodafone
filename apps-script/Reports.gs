// ============================================
// REPORT API HANDLERS
// Dashboard, Profit, Debt Aging, Top Clients
// ============================================

/**
 * Get dashboard KPIs
 */
function handleGetDashboard() {
  const transactions = getAllRows(SHEETS.TRANSACTIONS);
  const clients = getAllRows(SHEETS.CLIENTS);
  const wallets = getAllRows(SHEETS.WALLETS);

  const today = todayDate();
  const weekStart = formatDateYMD(getWeekStart(new Date()));
  const monthStart = formatDateYMD(getMonthStart(new Date()));

  // Calculate today's metrics
  const todayTxs = transactions.filter(t => t.transaction_date === today);
  const todayProfit = todayTxs.reduce((sum, t) => sum + parseNumber(t.fee_amount), 0);
  const todayVolume = todayTxs.reduce((sum, t) => sum + parseNumber(t.vc_amount), 0);
  const todayTransactionCount = todayTxs.length;

  // Calculate week's metrics
  const weekTxs = transactions.filter(t => t.transaction_date >= weekStart);
  const weekProfit = weekTxs.reduce((sum, t) => sum + parseNumber(t.fee_amount), 0);
  const weekTransactionCount = weekTxs.length;

  // Calculate month's metrics
  const monthTxs = transactions.filter(t => t.transaction_date >= monthStart);
  const monthProfit = monthTxs.reduce((sum, t) => sum + parseNumber(t.fee_amount), 0);
  const monthTransactionCount = monthTxs.length;

  // Calculate totals
  const totalWalletBalance = wallets.reduce((sum, w) => sum + parseNumber(w.current_balance), 0);
  const totalDebts = clients.reduce((sum, c) => sum + parseNumber(c.total_debt), 0);
  const totalClients = clients.length;
  const activeClients = getActiveClientsCount();
  const totalWallets = wallets.length;

  // Debt aging buckets
  const debtAging = calculateDebtAgingBuckets(transactions);

  return jsonResponse({
    success: true,
    data: {
      todayProfit,
      todayVolume,
      todayTransactionCount,
      weekProfit,
      weekTransactionCount,
      monthProfit,
      monthTransactionCount,
      totalWalletBalance,
      totalDebts,
      totalClients,
      activeClients,
      totalWallets,
      debtAging
    }
  });
}

/**
 * Get profit chart data
 */
function handleGetProfitChart(params) {
  const days = parseInt(params.days) || 30;
  const transactions = getAllRows(SHEETS.TRANSACTIONS);

  // Generate last N days
  const chartData = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateYMD(date);

    const dayTxs = transactions.filter(t => t.transaction_date === dateStr);
    const profit = dayTxs.reduce((sum, t) => sum + parseNumber(t.fee_amount), 0);

    chartData.push({
      date: dateStr,
      profit,
      transactions: dayTxs.length
    });
  }

  return jsonResponse({
    success: true,
    data: chartData
  });
}

/**
 * Get profit report for date range
 */
function handleGetProfitReport(params) {
  const today = todayDate();
  const monthStart = formatDateYMD(getMonthStart(new Date()));
  const fromDate = params.from || monthStart;
  const toDate = params.to || today;

  const transactions = filterRows(SHEETS.TRANSACTIONS, t =>
    t.transaction_date >= fromDate && t.transaction_date <= toDate
  );

  const totalProfit = transactions.reduce((sum, t) => sum + parseNumber(t.fee_amount), 0);
  const totalTransactions = transactions.length;
  const totalVcAmount = transactions.reduce((sum, t) => sum + parseNumber(t.vc_amount), 0);

  // Daily profit breakdown
  const dailyProfit = {};
  transactions.forEach(t => {
    const date = t.transaction_date;
    dailyProfit[date] = (dailyProfit[date] || 0) + parseNumber(t.fee_amount);
  });

  // Weekly profit breakdown
  const weeklyProfit = {};
  transactions.forEach(t => {
    const weekKey = formatDateYMD(getWeekStart(new Date(t.transaction_date)));
    weeklyProfit[weekKey] = (weeklyProfit[weekKey] || 0) + parseNumber(t.fee_amount);
  });

  // Monthly profit breakdown
  const monthlyProfit = {};
  transactions.forEach(t => {
    const monthKey = t.transaction_date.substring(0, 7); // yyyy-MM
    monthlyProfit[monthKey] = (monthlyProfit[monthKey] || 0) + parseNumber(t.fee_amount);
  });

  return jsonResponse({
    success: true,
    data: {
      fromDate,
      toDate,
      totalProfit,
      totalTransactions,
      totalVcAmount,
      dailyProfit,
      weeklyProfit,
      monthlyProfit
    }
  });
}

/**
 * Get debt aging report
 */
function handleGetDebtAging() {
  const transactions = getAllRows(SHEETS.TRANSACTIONS);
  const result = calculateDebtAgingReport(transactions);

  return jsonResponse({
    success: true,
    data: result
  });
}

/**
 * Get top clients by volume
 */
function handleGetTopClients(params) {
  const limit = parseInt(params.limit) || 10;
  const transactions = getAllRows(SHEETS.TRANSACTIONS);
  const clients = getAllRows(SHEETS.CLIENTS);

  // Group by client
  const clientVolumes = {};
  transactions.forEach(t => {
    if (t.client_id) {
      if (!clientVolumes[t.client_id]) {
        clientVolumes[t.client_id] = {
          clientId: t.client_id,
          totalVolume: 0,
          totalFees: 0,
          transactionCount: 0
        };
      }
      clientVolumes[t.client_id].totalVolume += parseNumber(t.vc_amount);
      clientVolumes[t.client_id].totalFees += parseNumber(t.fee_amount);
      clientVolumes[t.client_id].transactionCount++;
    }
  });

  // Convert to array and add client names
  const result = Object.values(clientVolumes)
    .map(cv => {
      const client = clients.find(c => c.client_id === cv.clientId);
      return {
        ...cv,
        clientName: client ? client.client_name : 'Unknown',
        totalDebt: client ? parseNumber(client.total_debt) : 0
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, limit);

  return jsonResponse({
    success: true,
    data: result
  });
}

/**
 * Calculate debt aging buckets summary
 */
function calculateDebtAgingBuckets(transactions) {
  const today = new Date();
  const buckets = {
    '0-7': 0,
    '8-30': 0,
    '31-60': 0,
    '60+': 0
  };

  transactions
    .filter(t =>
      t.transaction_type === 'TRANSFER_OUT' &&
      (t.payment_status === 'debt' || t.payment_status === 'partial')
    )
    .forEach(t => {
      const txDate = new Date(t.transaction_date);
      const daysOld = daysDifference(txDate, today);
      const amountDue = parseNumber(t.amount_due);

      if (daysOld <= 7) {
        buckets['0-7'] += amountDue;
      } else if (daysOld <= 30) {
        buckets['8-30'] += amountDue;
      } else if (daysOld <= 60) {
        buckets['31-60'] += amountDue;
      } else {
        buckets['60+'] += amountDue;
      }
    });

  return buckets;
}

/**
 * Calculate full debt aging report with transactions
 */
function calculateDebtAgingReport(transactions) {
  const today = new Date();
  const buckets = {
    '0-7': { transactions: [], total: 0 },
    '8-30': { transactions: [], total: 0 },
    '31-60': { transactions: [], total: 0 },
    '60+': { transactions: [], total: 0 }
  };

  const clients = getAllRows(SHEETS.CLIENTS);
  let totalDebt = 0;
  let transactionCount = 0;

  transactions
    .filter(t =>
      t.transaction_type === 'TRANSFER_OUT' &&
      (t.payment_status === 'debt' || t.payment_status === 'partial')
    )
    .forEach(t => {
      const txDate = new Date(t.transaction_date);
      const daysOld = daysDifference(txDate, today);
      const amountDue = parseNumber(t.amount_due);
      const client = clients.find(c => c.client_id === t.client_id);

      const txData = {
        ...t,
        vc_amount: parseNumber(t.vc_amount),
        cash_amount: parseNumber(t.cash_amount),
        fee_amount: parseNumber(t.fee_amount),
        amount_paid: parseNumber(t.amount_paid),
        amount_due: amountDue,
        client_name: client ? client.client_name : null,
        days_old: daysOld
      };

      let bucket;
      if (daysOld <= 7) {
        bucket = '0-7';
      } else if (daysOld <= 30) {
        bucket = '8-30';
      } else if (daysOld <= 60) {
        bucket = '31-60';
      } else {
        bucket = '60+';
      }

      buckets[bucket].transactions.push(txData);
      buckets[bucket].total += amountDue;
      totalDebt += amountDue;
      transactionCount++;
    });

  return {
    buckets,
    totalDebt,
    transactionCount
  };
}
