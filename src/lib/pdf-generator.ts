// ============================================
// PDF Statement Generator (Client-side)
// ============================================

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientStatement, Transaction, Payment } from '@/types';
import { formatDate } from './utils';

// Format currency with Western numerals for PDF (jsPDF doesn't support Arabic numerals)
function formatPdfCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function generateStatementPdf(statement: ClientStatement): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header - Red Vodafone banner
  doc.setFillColor(230, 0, 0);
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Vodafone Cash', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Client Account Statement', pageWidth / 2, 20, { align: 'center' });

  // Client Info Section
  let yPos = 35;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Client name - Note: Arabic text may not render correctly in standard jsPDF
  doc.text('Name: ' + statement.client.client_name, margin, yPos);

  if (statement.client.phones && statement.client.phones.length > 0) {
    yPos += 6;
    doc.text('Phone: ' + statement.client.phones[0].phone_number, margin, yPos);
  }

  if (statement.client.address) {
    yPos += 6;
    doc.text('Address: ' + statement.client.address, margin, yPos);
  }

  // Period banner
  yPos += 12;
  doc.setFillColor(255, 243, 205);
  doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, 'F');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(
    'Statement Period: ' + formatDate(statement.fromDate, 'dd/MM/yyyy') + ' - ' + formatDate(statement.toDate, 'dd/MM/yyyy'),
    pageWidth / 2,
    yPos + 2,
    { align: 'center' }
  );

  // Summary Cards
  yPos += 18;
  const cardWidth = (pageWidth - 2 * margin - 15) / 4;
  const summaryData = [
    { label: 'Opening Balance', value: statement.openingBalance, color: [227, 242, 253] },
    { label: 'Total Debits', value: statement.periodDebits, color: [255, 235, 238] },
    { label: 'Total Credits', value: statement.periodCredits, color: [232, 245, 233] },
    { label: 'Closing Balance', value: statement.closingBalance, color: [252, 228, 236] },
  ];

  summaryData.forEach((item, i) => {
    const x = margin + i * (cardWidth + 5);
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.rect(x, yPos, cardWidth, 18, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, x + cardWidth / 2, yPos + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(item.value) + ' EGP', x + cardWidth / 2, yPos + 13, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  });

  // Transactions Table Header
  yPos += 28;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Transactions & Payments', margin, yPos);

  // Build table data
  const tableData: string[][] = [];

  // Opening balance row
  tableData.push([
    '',
    'Opening Balance',
    '',
    '-',
    '-',
    formatPdfCurrency(statement.openingBalance),
  ]);

  // Combine transactions and payments into timeline
  interface TimelineItem {
    date: string;
    type: 'transaction' | 'payment';
    data: Transaction | Payment;
  }

  const timeline: TimelineItem[] = [];

  // Add transactions
  if (statement.transactions && statement.transactions.length > 0) {
    statement.transactions.forEach((tx) => {
      timeline.push({
        date: tx.transaction_date,
        type: 'transaction',
        data: tx,
      });
    });
  }

  // Add payments
  if (statement.payments && statement.payments.length > 0) {
    statement.payments.forEach((p) => {
      timeline.push({
        date: p.payment_date,
        type: 'payment',
        data: p,
      });
    });
  }

  // Sort by date ascending
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build rows with running balance
  let runningBalance = statement.openingBalance;

  timeline.forEach((item) => {
    if (item.type === 'transaction') {
      const tx = item.data as Transaction;
      // For client statement: debit = amount_due (unpaid portion that adds to debt)
      const debitAmount = tx.amount_due || 0;
      runningBalance += debitAmount;

      const typeLabel =
        tx.transaction_type === 'TRANSFER_OUT'
          ? 'Transfer Out'
          : tx.transaction_type === 'TRANSFER_IN'
          ? 'Transfer In'
          : tx.transaction_type === 'DEPOSIT'
          ? 'Deposit'
          : 'Withdraw';

      tableData.push([
        formatDate(tx.transaction_date, 'dd/MM/yyyy'),
        typeLabel,
        'VC: ' + formatPdfCurrency(tx.vc_amount || 0),
        debitAmount > 0 ? formatPdfCurrency(debitAmount) : '-',
        '-',
        formatPdfCurrency(runningBalance),
      ]);
    } else {
      const p = item.data as Payment;
      const creditAmount = p.amount || 0;
      runningBalance -= creditAmount;

      tableData.push([
        formatDate(p.payment_date, 'dd/MM/yyyy'),
        'Payment',
        p.payment_method || '-',
        '-',
        formatPdfCurrency(creditAmount),
        formatPdfCurrency(runningBalance),
      ]);
    }
  });

  // Closing balance row
  tableData.push([
    '',
    'Closing Balance',
    '',
    formatPdfCurrency(statement.periodDebits),
    formatPdfCurrency(statement.periodCredits),
    formatPdfCurrency(statement.closingBalance),
  ]);

  // Generate table using autoTable
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Date', 'Type', 'Description', 'Debit (EGP)', 'Credit (EGP)', 'Balance (EGP)']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [44, 62, 80],
      textColor: 255,
      fontSize: 8,
      halign: 'center',
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    didParseCell: function (data: any) {
      // Style payment rows green
      if (data.section === 'body' && data.row.raw[1] === 'Payment') {
        data.cell.styles.fillColor = [212, 237, 218];
      }
      // Style opening/closing balance rows
      if (
        data.section === 'body' &&
        (data.row.raw[1] === 'Opening Balance' || data.row.raw[1] === 'Closing Balance')
      ) {
        data.cell.styles.fontStyle = 'bold';
        if (data.row.raw[1] === 'Closing Balance') {
          data.cell.styles.fillColor = [44, 62, 80];
          data.cell.styles.textColor = 255;
        }
      }
    },
  });

  // Get final Y position after table
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;

  // Signature boxes (if there's space)
  const boxY = finalY + 15;
  if (boxY < pageHeight - 50) {
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);

    // Client signature box
    doc.rect(margin, boxY, 60, 20);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Client Signature', margin + 30, boxY + 25, { align: 'center' });

    // Shop stamp box
    doc.rect(pageWidth - margin - 60, boxY, 60, 20);
    doc.text('Shop Stamp', pageWidth - margin - 30, boxY + 25, { align: 'center' });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(136, 136, 136);
  doc.text(
    'Generated: ' + formatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm'),
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );
  doc.text(
    'This is a computer-generated statement',
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  // Save the PDF with phone number in filename (Arabic names cause issues)
  const phone = statement.client.phones?.[0]?.phone_number || 'client';
  const fileName = 'Statement_' + phone + '_' + statement.fromDate + '_to_' + statement.toDate + '.pdf';
  doc.save(fileName);
}
