// ============================================
// Seed Data API Route
// ============================================

import { NextRequest } from 'next/server';
import { writeDatabase } from '@/lib/db';
import { WalletService, ClientService, TransactionService, PaymentService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { generateUUID, nowISO, formatDate } from '@/lib/utils';
import { Database } from '@/types';

// POST /api/seed - Seed sample data
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get('reset') === 'true';

    if (reset) {
      // Reset database first
      const emptyDb: Database = {
        wallets: [],
        clients: [],
        client_phones: [],
        transactions: [],
        payments: [],
        attachments: [],
      };
      await writeDatabase(emptyDb);
    }

    // Create wallets
    const wallet1 = await WalletService.create({
      phone_number: '01012345678',
      wallet_name: 'المحفظة الرئيسية',
      initial_balance: 50000,
      notes: 'محفظة العمل الأساسية',
    });

    const wallet2 = await WalletService.create({
      phone_number: '01098765432',
      wallet_name: 'المحفظة الثانوية',
      initial_balance: 25000,
      notes: 'محفظة احتياطية',
    });

    // Create clients
    const client1 = await ClientService.create({
      client_name: 'أحمد محمد علي',
      phone_number: '01111111111',
      national_id: '29001011234567',
      address: 'شارع النيل، المنصورة',
      notes: 'عميل منتظم',
    });

    const client2 = await ClientService.create({
      client_name: 'محمود حسن إبراهيم',
      phone_number: '01222222222',
      address: 'شارع الجمهورية، طنطا',
      notes: 'عميل جديد',
    });

    const client3 = await ClientService.create({
      client_name: 'سارة أحمد محمد',
      phone_number: '01555555555',
      notes: 'عميلة VIP',
    });

    const client4 = await ClientService.create({
      client_name: 'محمد عبدالله',
      phone_number: '01066666666',
      address: 'المعادي، القاهرة',
    });

    const client5 = await ClientService.create({
      client_name: 'فاطمة السيد',
      phone_number: '01277777777',
      notes: 'عميلة قديمة',
    });

    const clients = [client1, client2, client3, client4, client5];
    const wallets = [wallet1, wallet2];

    // Create transactions over the last 60 days
    const today = new Date();
    const transactionAmounts = [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000];
    const feePercentages = [0.005, 0.01, 0.015, 0.02]; // 0.5% to 2%

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const txDate = new Date(today);
      txDate.setDate(txDate.getDate() - daysAgo);
      const dateStr = formatDate(txDate);

      const randomClient = clients[Math.floor(Math.random() * clients.length)];
      const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
      const vcAmount = transactionAmounts[Math.floor(Math.random() * transactionAmounts.length)];
      const feePercent = feePercentages[Math.floor(Math.random() * feePercentages.length)];
      const feeAmount = Math.round(vcAmount * feePercent);
      const cashAmount = vcAmount + feeAmount;

      // Random payment status distribution: 50% paid, 25% partial, 25% debt
      const paymentRoll = Math.random();
      let amountPaid = 0;
      if (paymentRoll < 0.5) {
        amountPaid = cashAmount; // Fully paid
      } else if (paymentRoll < 0.75) {
        amountPaid = Math.round(cashAmount * (0.3 + Math.random() * 0.4)); // 30-70% paid
      }
      // else amountPaid = 0 (debt)

      const recipientPhones = ['01000000001', '01000000002', '01000000003', '01000000004', '01000000005'];

      try {
        await TransactionService.create({
          wallet_id: randomWallet.wallet_id,
          client_id: randomClient.client_id,
          transaction_type: 'TRANSFER_OUT',
          vc_amount: vcAmount,
          cash_amount: cashAmount,
          fee_amount: feeAmount,
          amount_paid: amountPaid,
          recipient_phone: recipientPhones[Math.floor(Math.random() * recipientPhones.length)],
          description: `تحويل رقم ${i + 1}`,
          transaction_date: dateStr,
        });
      } catch (e) {
        console.log('Error creating transaction:', e);
      }
    }

    // Add some deposits and withdrawals
    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const txDate = new Date(today);
      txDate.setDate(txDate.getDate() - daysAgo);
      const dateStr = formatDate(txDate);

      const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
      const amount = [5000, 10000, 15000, 20000][Math.floor(Math.random() * 4)];

      try {
        await TransactionService.create({
          wallet_id: randomWallet.wallet_id,
          transaction_type: Math.random() > 0.5 ? 'DEPOSIT' : 'WITHDRAW',
          vc_amount: amount,
          description: 'عملية رصيد',
          transaction_date: dateStr,
        });
      } catch (e) {
        console.log('Error creating deposit/withdraw:', e);
      }
    }

    // Add some payments for partial debts
    for (const client of clients) {
      try {
        const clientData = await ClientService.getById(client.client_id);
        if (clientData && clientData.total_debt > 0) {
          // Make a partial payment
          const paymentAmount = Math.round(clientData.total_debt * (0.2 + Math.random() * 0.3));
          if (paymentAmount > 100) {
            await PaymentService.create({
              client_id: client.client_id,
              amount: paymentAmount,
              payment_method: Math.random() > 0.5 ? 'cash' : 'vc_transfer',
              notes: 'دفعة جزئية',
            });
          }
        }
      } catch (e) {
        console.log('Error creating payment:', e);
      }
    }

    return successResponse(
      {
        wallets: 2,
        clients: 5,
        transactionsGenerated: 60,
      },
      'تم إنشاء البيانات التجريبية بنجاح'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/seed - Reset database
export async function DELETE() {
  try {
    const emptyDb: Database = {
      wallets: [],
      clients: [],
      client_phones: [],
      transactions: [],
      payments: [],
      attachments: [],
    };
    await writeDatabase(emptyDb);
    return successResponse(null, 'تم مسح جميع البيانات');
  } catch (error) {
    return handleApiError(error);
  }
}
