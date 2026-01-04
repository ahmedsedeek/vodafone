// ============================================
// ATTACHMENT HANDLERS
// Google Drive Integration
// ============================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

/**
 * Handle attachment upload
 */
function handleUploadAttachment(body) {
  const { transaction_id, file_data, file_name, mime_type } = body;

  // Validation
  if (!transaction_id) {
    return jsonResponse({ success: false, message: 'معرف المعاملة مطلوب' }, 400);
  }

  if (!file_data) {
    return jsonResponse({ success: false, message: 'بيانات الملف مطلوبة' }, 400);
  }

  if (!file_name) {
    return jsonResponse({ success: false, message: 'اسم الملف مطلوب' }, 400);
  }

  // Verify transaction exists
  const transaction = getRowById(SHEETS.TRANSACTIONS, 'transaction_id', transaction_id);
  if (!transaction) {
    return jsonResponse({ success: false, message: 'المعاملة غير موجودة' }, 404);
  }

  // Validate mime type
  const mimeType = mime_type || 'image/jpeg';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return jsonResponse({
      success: false,
      message: 'نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, GIF, WebP'
    }, 400);
  }

  try {
    // Decode base64 file data
    const decodedData = Utilities.base64Decode(file_data);
    const blob = Utilities.newBlob(decodedData, mimeType, file_name);

    // Check file size
    if (blob.getBytes().length > MAX_FILE_SIZE) {
      return jsonResponse({
        success: false,
        message: 'حجم الملف يتجاوز الحد المسموح (5 ميجابايت)'
      }, 400);
    }

    // Get Drive folder
    const folder = getDriveFolder();

    // Generate unique filename
    const attachmentId = generateUUID();
    const extension = file_name.split('.').pop() || 'jpg';
    const uniqueFileName = attachmentId + '.' + extension;

    // Create file in Drive
    const file = folder.createFile(blob.setName(uniqueFileName));

    // Make file publicly readable (for viewing in app)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = file.getUrl();
    const fileId = file.getId();
    const fileSize = file.getSize();

    // Store attachment record
    const attachment = {
      attachment_id: attachmentId,
      transaction_id,
      file_name,
      file_id: fileId,
      file_url: fileUrl,
      mime_type: mimeType,
      file_size: fileSize,
      created_at: nowISO()
    };

    insertRow(SHEETS.ATTACHMENTS, attachment);

    // Update transaction with attachment ID
    updateRow(SHEETS.TRANSACTIONS, 'transaction_id', transaction_id, {
      attachment_id: attachmentId,
      updated_at: nowISO()
    });

    return jsonResponse({
      success: true,
      message: 'تم رفع الملف بنجاح',
      data: attachment
    });

  } catch (error) {
    Logger.log('Attachment upload error: ' + error.toString());
    return jsonResponse({
      success: false,
      message: 'فشل في رفع الملف: ' + error.message
    }, 500);
  }
}

/**
 * Get attachment by ID
 */
function getAttachmentById(attachmentId) {
  return getRowById(SHEETS.ATTACHMENTS, 'attachment_id', attachmentId);
}

/**
 * Get attachment by transaction ID
 */
function getAttachmentByTransactionId(transactionId) {
  const attachments = filterRows(SHEETS.ATTACHMENTS, a => a.transaction_id === transactionId);
  return attachments.length > 0 ? attachments[0] : null;
}

/**
 * Delete attachment
 */
function deleteAttachment(attachmentId) {
  const attachment = getAttachmentById(attachmentId);
  if (!attachment) return false;

  try {
    // Delete file from Drive
    if (attachment.file_id) {
      const file = DriveApp.getFileById(attachment.file_id);
      file.setTrashed(true);
    }

    // Delete record
    deleteRow(SHEETS.ATTACHMENTS, 'attachment_id', attachmentId);

    return true;
  } catch (error) {
    Logger.log('Error deleting attachment: ' + error.toString());
    return false;
  }
}

/**
 * Get direct download URL for attachment
 */
function getAttachmentDownloadUrl(attachmentId) {
  const attachment = getAttachmentById(attachmentId);
  if (!attachment || !attachment.file_id) return null;

  // Google Drive direct download URL format
  return 'https://drive.google.com/uc?export=download&id=' + attachment.file_id;
}

/**
 * Get thumbnail URL for attachment
 */
function getAttachmentThumbnailUrl(attachmentId) {
  const attachment = getAttachmentById(attachmentId);
  if (!attachment || !attachment.file_id) return null;

  // Google Drive thumbnail URL format
  return 'https://drive.google.com/thumbnail?id=' + attachment.file_id + '&sz=w400';
}
