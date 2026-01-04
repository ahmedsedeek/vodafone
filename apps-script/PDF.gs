// ============================================
// PDF GENERATION
// Client Statement PDF
// ============================================

/**
 * Handle PDF statement generation
 */
function handleGenerateStatementPdf(clientId, params) {
  // Get statement data
  const statementResponse = handleGetClientStatement(clientId, params);
  const responseObj = JSON.parse(statementResponse.getContent());

  if (!responseObj.success) {
    return jsonResponse({ success: false, message: responseObj.message }, 404);
  }

  const statement = responseObj.data;

  try {
    // Generate PDF
    const pdfBlob = generateStatementPdf(statement);

    // Return base64 encoded PDF
    const base64Pdf = Utilities.base64Encode(pdfBlob.getBytes());

    return jsonResponse({
      success: true,
      data: {
        pdf: base64Pdf,
        filename: pdfBlob.getName(),
        mimeType: 'application/pdf'
      }
    });

  } catch (error) {
    Logger.log('PDF generation error: ' + error.toString());
    return jsonResponse({
      success: false,
      message: 'فشل في إنشاء كشف الحساب: ' + error.message
    }, 500);
  }
}

/**
 * Generate statement PDF using HTML template
 */
function generateStatementPdf(statement) {
  const { client, fromDate, toDate, openingBalance, transactions, payments, periodDebits, periodCredits, closingBalance } = statement;

  // Build timeline entries (transactions + payments combined and sorted)
  const timeline = [];

  // Add transactions
  transactions.forEach(t => {
    timeline.push({
      date: t.transaction_date,
      type: 'transaction',
      description: t.description || 'تحويل فودافون كاش',
      debit: t.amount_due,
      credit: 0,
      reference: t.transaction_id.substring(0, 8)
    });
  });

  // Add payments
  payments.forEach(p => {
    timeline.push({
      date: p.payment_date,
      type: 'payment',
      description: p.notes || 'دفعة نقدية',
      debit: 0,
      credit: p.amount,
      reference: p.payment_id.substring(0, 8)
    });
  });

  // Sort by date
  timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate running balance
  let runningBalance = openingBalance;
  timeline.forEach(entry => {
    runningBalance = runningBalance + entry.debit - entry.credit;
    entry.balance = runningBalance;
  });

  // Get primary phone
  const primaryPhone = client.phones && client.phones.length > 0
    ? client.phones.find(p => p.is_primary)?.phone_number || client.phones[0].phone_number
    : 'N/A';

  // Generate HTML
  const html = generateStatementHtml({
    clientName: client.client_name,
    clientPhone: primaryPhone,
    clientAddress: client.address || '',
    fromDate,
    toDate,
    openingBalance,
    periodDebits,
    periodCredits,
    closingBalance,
    timeline,
    generatedAt: new Date().toISOString()
  });

  // Convert HTML to PDF
  const blob = HtmlService.createHtmlOutput(html)
    .getBlob()
    .setName('Statement_' + primaryPhone + '_' + fromDate + '_to_' + toDate + '.pdf')
    .getAs('application/pdf');

  return blob;
}

/**
 * Generate HTML for statement
 */
function generateStatementHtml(data) {
  const { clientName, clientPhone, clientAddress, fromDate, toDate, openingBalance, periodDebits, periodCredits, closingBalance, timeline, generatedAt } = data;

  // Format numbers
  const formatCurrency = (num) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  // Build timeline rows
  let timelineRows = '';

  // Opening balance row
  timelineRows += `
    <tr style="background-color: #f8f9fa; font-weight: bold;">
      <td>${formatDate(fromDate)}</td>
      <td>Opening Balance</td>
      <td style="text-align: right;">-</td>
      <td style="text-align: right;">-</td>
      <td style="text-align: right;">${formatCurrency(openingBalance)}</td>
    </tr>
  `;

  // Transaction and payment rows
  timeline.forEach((entry, index) => {
    const bgColor = entry.type === 'payment' ? '#d4edda' : (index % 2 === 0 ? '#ffffff' : '#f8f9fa');

    timelineRows += `
      <tr style="background-color: ${bgColor};">
        <td>${formatDate(entry.date)}</td>
        <td>${entry.description}</td>
        <td style="text-align: right;">${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
        <td style="text-align: right;">${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
        <td style="text-align: right;">${formatCurrency(entry.balance)}</td>
      </tr>
    `;
  });

  // Closing balance row
  timelineRows += `
    <tr style="background-color: #2c3e50; color: white; font-weight: bold;">
      <td>${formatDate(toDate)}</td>
      <td>Closing Balance</td>
      <td style="text-align: right;">${formatCurrency(periodDebits)}</td>
      <td style="text-align: right;">${formatCurrency(periodCredits)}</td>
      <td style="text-align: right;">${formatCurrency(closingBalance)}</td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>Client Statement</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    .header {
      background-color: #e60000;
      color: white;
      padding: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    .header p {
      font-size: 10px;
      opacity: 0.9;
    }
    .client-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding: 10px;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
    }
    .client-info div {
      flex: 1;
    }
    .client-info label {
      font-weight: bold;
      color: #666;
      font-size: 9px;
      display: block;
    }
    .client-info span {
      font-size: 11px;
    }
    .period-banner {
      background-color: #ffc107;
      color: #333;
      padding: 8px 15px;
      margin-bottom: 15px;
      font-weight: bold;
      text-align: center;
    }
    .summary-cards {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .summary-card {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      text-align: center;
    }
    .summary-card.opening { border-top: 3px solid #6c757d; }
    .summary-card.debit { border-top: 3px solid #dc3545; }
    .summary-card.credit { border-top: 3px solid #28a745; }
    .summary-card.closing { border-top: 3px solid #007bff; }
    .summary-card label {
      font-size: 9px;
      color: #666;
      display: block;
    }
    .summary-card .amount {
      font-size: 14px;
      font-weight: bold;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #e60000;
      color: white;
      padding: 8px 5px;
      text-align: left;
      font-size: 10px;
    }
    td {
      padding: 6px 5px;
      border-bottom: 1px solid #ddd;
      font-size: 10px;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .signature-box {
      width: 120px;
      height: 60px;
      border: 1px solid #999;
    }
    .signature-label {
      font-size: 9px;
      color: #666;
      text-align: center;
      margin-top: 5px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: #888;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>Vodafone Cash</h1>
    <p>Wallet Management System - Client Statement</p>
  </div>

  <!-- Client Info -->
  <div class="client-info">
    <div>
      <label>Client Name</label>
      <span>${clientName}</span>
    </div>
    <div>
      <label>Phone Number</label>
      <span>${clientPhone}</span>
    </div>
    <div>
      <label>Address</label>
      <span>${clientAddress || 'N/A'}</span>
    </div>
  </div>

  <!-- Period Banner -->
  <div class="period-banner">
    Statement Period: ${formatDate(fromDate)} - ${formatDate(toDate)}
  </div>

  <!-- Summary Cards -->
  <div class="summary-cards">
    <div class="summary-card opening">
      <label>Opening Balance</label>
      <div class="amount">${formatCurrency(openingBalance)} EGP</div>
    </div>
    <div class="summary-card debit">
      <label>Total Debits</label>
      <div class="amount">${formatCurrency(periodDebits)} EGP</div>
    </div>
    <div class="summary-card credit">
      <label>Total Credits</label>
      <div class="amount">${formatCurrency(periodCredits)} EGP</div>
    </div>
    <div class="summary-card closing">
      <label>Closing Balance</label>
      <div class="amount">${formatCurrency(closingBalance)} EGP</div>
    </div>
  </div>

  <!-- Timeline Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Date</th>
        <th>Description</th>
        <th style="width: 80px; text-align: right;">Debit</th>
        <th style="width: 80px; text-align: right;">Credit</th>
        <th style="width: 90px; text-align: right;">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${timelineRows}
    </tbody>
  </table>

  <!-- Signature Section -->
  <div class="signature-section">
    <div>
      <div class="signature-box"></div>
      <div class="signature-label">Client Signature</div>
    </div>
    <div>
      <div class="signature-box"></div>
      <div class="signature-label">Shop Stamp</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated: ${new Date(generatedAt).toLocaleString('en-GB')}</p>
    <p>This is a computer-generated statement</p>
  </div>
</body>
</html>
  `;
}
