# Vodafone Cash Tracker - Database Schema

## Google Sheets Structure

All data is stored in a single Google Spreadsheet with multiple sheets (tabs).

---

## Sheet 1: المحافظ (Wallets)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف المحفظة | wallet_id | UUID | Primary key |
| B | رقم الهاتف | phone_number | String | 11 digits (01XXXXXXXXX) |
| C | اسم المحفظة | wallet_name | String | Display name |
| D | الرصيد الافتتاحي | initial_balance | Number | Starting balance |
| E | الرصيد الحالي | current_balance | Number | Current balance (auto-calculated) |
| F | نشط | is_active | Boolean | TRUE/FALSE |
| G | ملاحظات | notes | String | Optional notes |
| H | تاريخ الإنشاء | created_at | ISO DateTime | Record creation time |
| I | تاريخ التحديث | updated_at | ISO DateTime | Last update time |

**Data Validation:**
- Column F (is_active): Dropdown [TRUE, FALSE]
- Columns D, E: Number format #,##0.00

---

## Sheet 2: العملاء (Clients)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف العميل | client_id | UUID | Primary key |
| B | اسم العميل | client_name | String | Full name |
| C | الرقم القومي | national_id | String | National ID (optional) |
| D | العنوان | address | String | Address (optional) |
| E | ملاحظات | notes | String | Optional notes |
| F | إجمالي الدين | total_debt | Number | Total outstanding debt |
| G | نشط | is_active | Boolean | TRUE/FALSE |
| H | تاريخ الإنشاء | created_at | ISO DateTime | Record creation time |
| I | تاريخ التحديث | updated_at | ISO DateTime | Last update time |

**Data Validation:**
- Column G (is_active): Dropdown [TRUE, FALSE]
- Column F: Number format #,##0.00

---

## Sheet 3: أرقام العملاء (Client Phones)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف الهاتف | phone_id | UUID | Primary key |
| B | معرف العميل | client_id | UUID | Foreign key → العملاء |
| C | رقم الهاتف | phone_number | String | 11 digits (01XXXXXXXXX) |
| D | رئيسي | is_primary | Boolean | Primary phone flag |
| E | تصنيف | phone_label | String | Label (شخصي, عمل, etc.) |
| F | تاريخ الإنشاء | created_at | ISO DateTime | Record creation time |

**Data Validation:**
- Column D (is_primary): Dropdown [TRUE, FALSE]

---

## Sheet 4: المعاملات (Transactions)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف المعاملة | transaction_id | UUID | Primary key |
| B | معرف المحفظة | wallet_id | UUID | Foreign key → المحافظ |
| C | معرف العميل | client_id | UUID | Foreign key → العملاء (optional) |
| D | نوع المعاملة | transaction_type | Enum | TRANSFER_OUT, TRANSFER_IN, DEPOSIT, WITHDRAW |
| E | مبلغ ف.ك | vc_amount | Number | Vodafone Cash amount |
| F | المبلغ النقدي | cash_amount | Number | Cash amount |
| G | العمولة | fee_amount | Number | Fee/profit amount |
| H | حالة الدفع | payment_status | Enum | paid, partial, debt |
| I | المدفوع | amount_paid | Number | Amount paid so far |
| J | المتبقي | amount_due | Number | Remaining amount due |
| K | رقم المستلم | recipient_phone | String | Recipient phone (for transfers) |
| L | الوصف | description | String | Transaction description |
| M | معرف المرفق | attachment_id | UUID | Foreign key → المرفقات |
| N | تاريخ المعاملة | transaction_date | Date | Transaction date (yyyy-MM-dd) |
| O | تاريخ الإنشاء | created_at | ISO DateTime | Record creation time |
| P | تاريخ التحديث | updated_at | ISO DateTime | Last update time |

**Data Validation:**
- Column D (transaction_type): Dropdown [TRANSFER_OUT, TRANSFER_IN, DEPOSIT, WITHDRAW]
- Column H (payment_status): Dropdown [paid, partial, debt]
- Columns E, F, G, I, J: Number format #,##0.00

**Business Logic:**
- TRANSFER_OUT: Customer sends money → cash_amount = vc_amount + fee_amount
- TRANSFER_IN: Customer receives money → cash_amount = vc_amount - fee_amount
- DEPOSIT/WITHDRAW: Internal → cash_amount = vc_amount, fee_amount = 0

---

## Sheet 5: المدفوعات (Payments)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف الدفعة | payment_id | UUID | Primary key |
| B | معرف العميل | client_id | UUID | Foreign key → العملاء |
| C | معرف المعاملة | transaction_id | UUID | Foreign key → المعاملات |
| D | المبلغ | amount | Number | Payment amount |
| E | طريقة الدفع | payment_method | Enum | cash, vc_transfer, bank |
| F | ملاحظات | notes | String | Optional notes |
| G | تاريخ الدفع | payment_date | Date | Payment date (yyyy-MM-dd) |
| H | تاريخ الإنشاء | created_at | ISO DateTime | Record creation time |

**Data Validation:**
- Column E (payment_method): Dropdown [cash, vc_transfer, bank]
- Column D: Number format #,##0.00

**Business Logic:**
- FIFO allocation: Payments allocated to oldest unpaid transactions first
- Multiple Payment records created if payment covers multiple transactions

---

## Sheet 6: المرفقات (Attachments)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف المرفق | attachment_id | UUID | Primary key |
| B | معرف المعاملة | transaction_id | UUID | Foreign key → المعاملات |
| C | اسم الملف | file_name | String | Original filename |
| D | معرف الملف | file_id | String | Google Drive file ID |
| E | رابط الملف | file_url | String | Google Drive URL |
| F | نوع الملف | mime_type | String | MIME type |
| G | حجم الملف | file_size | Number | File size in bytes |
| H | تاريخ الإنشاء | created_at | ISO DateTime | Record creation time |

---

## Sheet 7: الجلسات (Sessions)

| Column | Arabic Header | English Field | Type | Description |
|--------|--------------|---------------|------|-------------|
| A | معرف الجلسة | session_id | UUID | Primary key |
| B | توكن الجلسة | token_hash | String | SHA-256 hash of session token |
| C | تاريخ الإنشاء | created_at | ISO DateTime | Session creation time |
| D | تاريخ الانتهاء | expires_at | ISO DateTime | Session expiration time |

---

## Entity Relationships

```
┌─────────────┐       ┌─────────────────┐
│   Wallets   │       │     Clients     │
│  (المحافظ)  │       │    (العملاء)    │
└──────┬──────┘       └────────┬────────┘
       │                       │
       │                       │ 1:N
       │                       ▼
       │              ┌─────────────────┐
       │              │  Client Phones  │
       │              │ (أرقام العملاء) │
       │              └─────────────────┘
       │                       │
       │ 1:N                   │ 1:N
       ▼                       ▼
┌──────────────────────────────────────┐
│            Transactions              │
│             (المعاملات)              │
└──────────────────┬───────────────────┘
                   │
          ┌────────┴────────┐
          │ 1:N             │ 1:1
          ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│    Payments     │ │   Attachments   │
│  (المدفوعات)   │ │   (المرفقات)    │
└─────────────────┘ └─────────────────┘
```

---

## Data Validation Rules

### Egyptian Phone Number
- Format: `01XXXXXXXXX` (11 digits)
- Regex: `^01[0125][0-9]{8}$`
- Valid prefixes: 010, 011, 012, 015

### UUID Format
- Standard UUID v4: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

### Date Formats
- Date fields: `yyyy-MM-dd` (e.g., 2024-01-15)
- DateTime fields: ISO 8601 (e.g., 2024-01-15T10:30:00.000Z)

### Number Precision
- All currency amounts: 2 decimal places
- Stored as numbers, not strings

---

## Sample Data

### Wallet Example
```
wallet_id: 550e8400-e29b-41d4-a716-446655440000
phone_number: 01012345678
wallet_name: محفظة فرع أسيوط
initial_balance: 10000.00
current_balance: 8500.00
is_active: TRUE
notes: المحفظة الرئيسية
created_at: 2024-01-01T10:00:00.000Z
updated_at: 2024-01-15T14:30:00.000Z
```

### Transaction Example (TRANSFER_OUT)
```
transaction_id: 6ba7b810-9dad-11d1-80b4-00c04fd430c8
wallet_id: 550e8400-e29b-41d4-a716-446655440000
client_id: 6ba7b811-9dad-11d1-80b4-00c04fd430c8
transaction_type: TRANSFER_OUT
vc_amount: 500.00
cash_amount: 515.00
fee_amount: 15.00
payment_status: debt
amount_paid: 0.00
amount_due: 515.00
recipient_phone: 01198765432
description: تحويل لصديق
attachment_id:
transaction_date: 2024-01-15
created_at: 2024-01-15T11:00:00.000Z
updated_at: 2024-01-15T11:00:00.000Z
```

---

## Calculated Fields

### Wallet Balance
```
current_balance = initial_balance
  + SUM(TRANSFER_IN.vc_amount)
  + SUM(DEPOSIT.vc_amount)
  - SUM(TRANSFER_OUT.vc_amount)
  - SUM(WITHDRAW.vc_amount)
```

### Client Total Debt
```
total_debt = SUM(amount_due)
  WHERE client_id = X
  AND transaction_type = 'TRANSFER_OUT'
  AND payment_status IN ('debt', 'partial')
```

### Transaction Payment Status
```
IF amount_due = 0 THEN 'paid'
ELSE IF amount_paid > 0 THEN 'partial'
ELSE 'debt'
```
