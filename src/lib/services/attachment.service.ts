// ============================================
// Attachment Service
// Uses Google Apps Script API in production
// ============================================

import { attachmentsApi } from '@/lib/api-production';
import { Attachment } from '@/types';

export class AttachmentService {
  /**
   * Upload attachment from base64 data
   */
  static async uploadBase64(
    transactionId: string,
    base64Data: string,
    fileName: string,
    mimeType: string
  ): Promise<Attachment> {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');

    // Create a mock File object for the API
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    return attachmentsApi.upload(transactionId, file);
  }
}
