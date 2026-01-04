// ============================================
// Utility Functions
// ============================================

import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, startOfWeek, startOfMonth, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { EGYPTIAN_PHONE_REGEX } from './constants';

// ==================== ID GENERATION ====================

export function generateUUID(): string {
  return uuidv4();
}

// ==================== DATE FUNCTIONS ====================

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatDateArabic(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMMM yyyy', { locale: ar });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm');
}

export function getWeekStart(date: Date): Date {
  // Egyptian week starts Saturday
  return startOfWeek(date, { weekStartsOn: 6 });
}

export function getMonthStart(date: Date = new Date()): string {
  return format(startOfMonth(date), 'yyyy-MM-dd');
}

export function daysDifference(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return Math.abs(differenceInDays(d1, d2));
}

// ==================== VALIDATION ====================

export function isValidEgyptianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-]/g, '');
  return EGYPTIAN_PHONE_REGEX.test(cleaned);
}

export function isValidUUID(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function isPositiveNumber(val: unknown): val is number {
  return typeof val === 'number' && val >= 0 && !isNaN(val);
}

export function validateRequired<T extends object>(
  obj: T,
  fields: (keyof T)[]
): (keyof T)[] {
  const missing: (keyof T)[] = [];
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  return missing;
}

// ==================== FORMATTING ====================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-EG').format(num);
}

export function formatPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
}

// ==================== CALCULATION ====================

export function calculateFee(
  transactionType: string,
  vcAmount: number,
  cashAmount: number
): number {
  if (transactionType === 'TRANSFER_OUT') {
    // Client pays more cash than VC
    return Math.max(0, cashAmount - vcAmount);
  } else if (transactionType === 'TRANSFER_IN') {
    // You give less cash than VC received
    return Math.max(0, vcAmount - cashAmount);
  }
  return 0;
}

export function calculatePaymentStatus(
  cashAmount: number,
  amountPaid: number
): 'paid' | 'partial' | 'debt' {
  if (amountPaid >= cashAmount) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'debt';
}

// ==================== SAFE PARSING ====================

export function safeParseFloat(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function safeParseInt(val: unknown): number {
  if (typeof val === 'number') return Math.floor(val);
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ==================== OBJECT HELPERS ====================

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

// ==================== DEBOUNCE ====================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ==================== CLASS NAMES ====================

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
