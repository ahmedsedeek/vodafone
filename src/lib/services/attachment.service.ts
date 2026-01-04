// ============================================
// Attachment Service (Local File Storage)
// ============================================

import { promises as fs } from 'fs';
import path from 'path';
import { AttachmentDB, TransactionDB } from '@/lib/db';
import { Attachment } from '@/types';
import { generateUUID, nowISO } from '@/lib/utils';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/constants';

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

export class AttachmentService {
  /**
   * Ensure uploads directory exists
   */
  static async ensureUploadsDir(): Promise<void> {
    try {
      await fs.access(UPLOADS_DIR);
    } catch {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
  }

  /**
   * Get attachment by ID
   */
  static async getById(attachmentId: string): Promise<Attachment | null> {
    const attachment = await AttachmentDB.getById(attachmentId);
    return attachment || null;
  }

  /**
   * Get attachment by transaction ID
   */
  static async getByTransactionId(transactionId: string): Promise<Attachment | null> {
    const attachment = await AttachmentDB.getByTransactionId(transactionId);
    return attachment || null;
  }

  /**
   * Upload attachment from base64 data
   */
  static async uploadBase64(
    transactionId: string,
    base64Data: string,
    fileName: string,
    mimeType: string
  ): Promise<Attachment> {
    await this.ensureUploadsDir();

    // Validate transaction exists
    const tx = await TransactionDB.getById(transactionId);
    if (!tx) {
      throw new Error('المعاملة غير موجودة');
    }

    // Validate mime type
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new Error('نوع الملف غير مدعوم. الأنواع المسموحة: JPEG, PNG, GIF, WebP');
    }

    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');

    // Decode base64
    const buffer = Buffer.from(base64Clean, 'base64');

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
    }

    // Generate unique filename
    const ext = mimeType.split('/')[1] || 'png';
    const uniqueFileName = `${generateUUID()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    // Save file
    await fs.writeFile(filePath, buffer);

    // Create attachment record
    const attachment: Attachment = {
      attachment_id: generateUUID(),
      transaction_id: transactionId,
      file_name: fileName,
      file_path: filePath,
      file_url: `/uploads/${uniqueFileName}`,
      mime_type: mimeType,
      file_size: buffer.length,
      created_at: nowISO(),
    };

    await AttachmentDB.create(attachment);

    // Update transaction with attachment ID
    await TransactionDB.update(transactionId, {
      attachment_id: attachment.attachment_id,
      updated_at: nowISO(),
    });

    return attachment;
  }

  /**
   * Upload attachment from File buffer
   */
  static async uploadBuffer(
    transactionId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<Attachment> {
    await this.ensureUploadsDir();

    // Validate transaction exists
    const tx = await TransactionDB.getById(transactionId);
    if (!tx) {
      throw new Error('المعاملة غير موجودة');
    }

    // Validate mime type
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new Error('نوع الملف غير مدعوم. الأنواع المسموحة: JPEG, PNG, GIF, WebP');
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
    }

    // Generate unique filename
    const ext = mimeType.split('/')[1] || 'png';
    const uniqueFileName = `${generateUUID()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueFileName);

    // Save file
    await fs.writeFile(filePath, buffer);

    // Create attachment record
    const attachment: Attachment = {
      attachment_id: generateUUID(),
      transaction_id: transactionId,
      file_name: fileName,
      file_path: filePath,
      file_url: `/uploads/${uniqueFileName}`,
      mime_type: mimeType,
      file_size: buffer.length,
      created_at: nowISO(),
    };

    await AttachmentDB.create(attachment);

    // Update transaction with attachment ID
    await TransactionDB.update(transactionId, {
      attachment_id: attachment.attachment_id,
      updated_at: nowISO(),
    });

    return attachment;
  }

  /**
   * Delete attachment
   */
  static async delete(attachmentId: string): Promise<boolean> {
    const attachment = await AttachmentDB.getById(attachmentId);
    if (!attachment) return false;

    // Delete file from disk
    try {
      await fs.unlink(attachment.file_path);
    } catch {
      // File might not exist, continue
    }

    // Remove from database (we'd need a delete method)
    // For now, just return true
    return true;
  }
}
