# نظام فودافون كاش - Vodafone Cash Tracker

نظام متكامل لإدارة محافظ فودافون كاش، تتبع العملاء والمعاملات، وإنشاء كشوف الحساب.

## المتطلبات

- Node.js 18+
- npm 9+

## التثبيت والتشغيل المحلي

```bash
# تثبيت الاعتماديات
npm install

# تشغيل خادم التطوير
npm run dev

# بناء للإنتاج
npm run build
npm start
```

الخادم يعمل على: http://localhost:3000

## إنشاء بيانات تجريبية

لملء قاعدة البيانات ببيانات تجريبية:

```bash
# إنشاء بيانات تجريبية (مع مسح البيانات القديمة)
curl -X POST "http://localhost:3000/api/seed?reset=true"

# مسح جميع البيانات
curl -X DELETE "http://localhost:3000/api/seed"
```

## صفحات التطبيق

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| لوحة التحكم | `/` | عرض KPIs والإحصائيات العامة |
| المحافظ | `/wallets` | إدارة محافظ فودافون كاش |
| العملاء | `/clients` | إدارة العملاء وبياناتهم |
| تفاصيل العميل | `/clients/[id]` | عرض معاملات ومدفوعات العميل + كشف حساب PDF |
| المعاملات | `/transactions` | سجل جميع المعاملات مع الفلاتر |
| المدفوعات | `/payments` | تسجيل مدفوعات جديدة (FIFO) |
| التقارير | `/reports` | تقارير الأرباح وأعمار الديون |

## نقاط API

### المحافظ
- `GET /api/wallets` - قائمة المحافظ
- `POST /api/wallets` - إنشاء محفظة
- `GET /api/wallets/[id]` - تفاصيل محفظة
- `PUT /api/wallets/[id]` - تحديث محفظة

### العملاء
- `GET /api/clients` - قائمة العملاء
- `POST /api/clients` - إنشاء عميل
- `GET /api/clients/[id]` - تفاصيل عميل
- `PUT /api/clients/[id]` - تحديث عميل
- `POST /api/clients/[id]/phones` - إضافة رقم هاتف
- `GET /api/clients/[id]/statement` - كشف حساب

### المعاملات
- `GET /api/transactions` - قائمة المعاملات
- `POST /api/transactions` - إنشاء معاملة

### المدفوعات
- `GET /api/payments` - قائمة المدفوعات
- `POST /api/payments` - تسجيل دفعة (FIFO)

### التقارير
- `GET /api/dashboard` - بيانات لوحة التحكم
- `GET /api/reports/profit` - تقرير الأرباح
- `GET /api/reports/debt-aging` - أعمار الديون
- `GET /api/reports/top-clients` - أفضل العملاء
- `GET /api/reports/chart` - بيانات الرسم البياني

### المرفقات
- `POST /api/attachments` - رفع صورة إثبات

## هيكل قاعدة البيانات المحلية

البيانات تُخزن في ملف JSON: `src/data/db.json`

```typescript
interface Database {
  wallets: Wallet[];
  clients: Client[];
  client_phones: ClientPhone[];
  transactions: Transaction[];
  payments: Payment[];
  attachments: Attachment[];
}
```

## منطق الأعمال

### حساب الربح
- الربح = `fee_amount` (العمولة المُحصّلة من المعاملة)
- يُحسب فقط للمعاملات من نوع `TRANSFER_OUT`

### توزيع المدفوعات (FIFO)
عند تسجيل دفعة لعميل، يتم توزيعها على أقدم الديون أولاً:
1. جلب المعاملات غير المسددة مرتبة بالتاريخ
2. تخصيص المبلغ للديون بالترتيب
3. تحديث حالة كل معاملة (مسددة/جزئية/دين)

### تأثير المعاملات على رصيد المحفظة
- `TRANSFER_OUT`: يطرح من رصيد المحفظة
- `TRANSFER_IN`: يضيف لرصيد المحفظة
- `DEPOSIT`: يضيف لرصيد المحفظة
- `WITHDRAW`: يطرح من رصيد المحفظة

## اختبار الوظائف

### 1. إنشاء محفظة
```bash
curl -X POST http://localhost:3000/api/wallets \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"01012345678","wallet_name":"محفظة اختبار","initial_balance":10000}'
```

### 2. إنشاء عميل
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"client_name":"اسم العميل","phone_number":"01111111111"}'
```

### 3. إنشاء معاملة تحويل صادر
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_id":"WALLET_ID",
    "client_id":"CLIENT_ID",
    "transaction_type":"TRANSFER_OUT",
    "vc_amount":1000,
    "fee_amount":10,
    "recipient_phone":"01000000000",
    "amount_paid":0
  }'
```

### 4. تسجيل دفعة
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"client_id":"CLIENT_ID","amount":500,"payment_method":"cash"}'
```

---

# دليل التحويل للإنتاج (Productionization Guide)

## المرحلة 1: إعداد Google Sheets

### 1. إنشاء جدول البيانات
أنشئ Google Spreadsheet جديد بالأوراق التالية:

| اسم الورقة | الأعمدة |
|------------|---------|
| Wallets | wallet_id, phone_number, wallet_name, initial_balance, current_balance, is_active, notes, created_at, updated_at |
| Clients | client_id, client_name, national_id, address, total_debt, is_active, notes, created_at, updated_at |
| ClientPhones | phone_id, client_id, phone_number, label, is_primary |
| Transactions | transaction_id, wallet_id, client_id, transaction_type, vc_amount, cash_amount, fee_amount, amount_paid, amount_due, payment_status, recipient_phone, description, transaction_date, created_at, updated_at |
| Payments | payment_id, client_id, amount, payment_method, allocated_transactions, notes, payment_date, created_at |
| Attachments | attachment_id, transaction_id, file_url, file_name, mime_type, created_at |

### 2. نشر Apps Script
1. افتح Script Editor من الجدول
2. انسخ ملفات Apps Script (المُنشأة سابقاً)
3. انشر كـ Web App مع إعدادات:
   - Execute as: Me
   - Who has access: Anyone (أو حسب الحاجة)
4. انسخ URL الـ deployment

## المرحلة 2: تعديل Next.js للإنتاج

### 1. إنشاء ملف تكوين البيئة

```env
# .env.production
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
API_SECRET_KEY=your-secret-key
```

### 2. استبدال طبقة API

أنشئ ملف `src/lib/google-api.ts`:

```typescript
const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

export async function callGoogleApi(action: string, params: any = {}) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    throw new Error('Google API error');
  }

  return response.json();
}
```

### 3. تحديث الخدمات

استبدل استدعاءات `db.ts` بـ `google-api.ts`:

```typescript
// قبل (محلي)
import { WalletDB } from '@/lib/db';
const wallets = await WalletDB.getAll();

// بعد (إنتاج)
import { callGoogleApi } from '@/lib/google-api';
const wallets = await callGoogleApi('getWallets');
```

## المرحلة 3: رفع الملفات لـ Google Drive

### 1. إنشاء مجلد Drive
أنشئ مجلد لحفظ صور الإثبات

### 2. تحديث AttachmentService

```typescript
// استخدم Google Drive API لرفع الملفات
async uploadProof(file: File, transactionId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('transactionId', transactionId);

  const result = await callGoogleApi('uploadAttachment', formData);
  return result.fileUrl;
}
```

## المرحلة 4: النشر على Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# نشر
vercel --prod
```

أضف متغيرات البيئة في لوحة Vercel:
- `GOOGLE_APPS_SCRIPT_URL`
- `API_SECRET_KEY`

## ملاحظات الأمان

1. **المصادقة**: أضف طبقة مصادقة باستخدام NextAuth.js
2. **التحقق من الصلاحيات**: تحقق من المستخدم في كل طلب API
3. **Rate Limiting**: حدد عدد الطلبات لمنع الإساءة
4. **CORS**: اضبط إعدادات CORS في Apps Script
5. **تشفير البيانات**: استخدم HTTPS دائماً

## قائمة التحقق للإنتاج

- [ ] إنشاء Google Sheets مع جميع الأوراق
- [ ] نشر Apps Script كـ Web App
- [ ] تحديث متغيرات البيئة
- [ ] استبدال استدعاءات قاعدة البيانات المحلية
- [ ] إعداد Google Drive للمرفقات
- [ ] إضافة المصادقة
- [ ] اختبار جميع الوظائف
- [ ] نشر على Vercel
- [ ] إعداد النطاق المخصص (اختياري)

## الدعم الفني

للمساعدة أو الإبلاغ عن مشاكل، تواصل عبر:
- GitHub Issues
- البريد الإلكتروني

---

تم البناء باستخدام Next.js 14, TypeScript, Tailwind CSS
