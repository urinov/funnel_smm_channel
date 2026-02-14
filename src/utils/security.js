/**
 * Security utilities - Input sanitization and audit logging
 */

// ============ INPUT SANITIZATION ============

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitize HTML - escape dangerous characters
 */
export function escapeHtml(input) {
  if (typeof input !== 'string') return '';

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return input.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

/**
 * Sanitize for Telegram HTML parse mode
 */
export function sanitizeTelegramHtml(input) {
  if (typeof input !== 'string') return '';

  // Only escape the characters that break Telegram HTML
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';

  // Keep only digits and + at the start
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Validate format
  if (!/^\+?\d{9,15}$/.test(cleaned)) {
    return '';
  }

  return cleaned;
}

/**
 * Validate and sanitize Telegram ID
 */
export function sanitizeTelegramId(id) {
  const num = parseInt(id, 10);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return num;
}

/**
 * Sanitize object - apply sanitization to all string fields
 */
export function sanitizeObject(obj, options = {}) {
  const { maxStringLength = 1000, allowedFields = null } = options;

  if (!obj || typeof obj !== 'object') return {};

  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if field is allowed (if whitelist provided)
    if (allowedFields && !allowedFields.includes(key)) {
      continue;
    }

    if (typeof value === 'string') {
      result[key] = sanitizeString(value, maxStringLength);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
    } else if (typeof value === 'boolean') {
      result[key] = value;
    } else if (value === null) {
      result[key] = null;
    }
    // Skip other types (arrays, nested objects, functions, etc.)
  }

  return result;
}

// ============ AUDIT LOGGING ============

const auditLogBuffer = [];
const MAX_BUFFER_SIZE = 100;
let flushTimeout = null;

/**
 * Log an audit event
 */
export function logAudit(event) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    ...event
  };

  // Add to buffer
  auditLogBuffer.push(auditEntry);

  // Console log for immediate visibility
  console.log(`[AUDIT] ${auditEntry.action}:`, JSON.stringify({
    user: auditEntry.user,
    target: auditEntry.target,
    details: auditEntry.details
  }));

  // Schedule flush if buffer is getting full
  if (auditLogBuffer.length >= MAX_BUFFER_SIZE && !flushTimeout) {
    flushTimeout = setTimeout(flushAuditLog, 1000);
  }
}

/**
 * Flush audit log to database (call this from database.js)
 */
export async function flushAuditLog(saveToDb) {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (auditLogBuffer.length === 0) return;

  const entries = auditLogBuffer.splice(0, auditLogBuffer.length);

  if (typeof saveToDb === 'function') {
    try {
      await saveToDb(entries);
    } catch (e) {
      console.error('Failed to save audit log:', e.message);
      // Re-add entries on failure
      auditLogBuffer.unshift(...entries);
    }
  }
}

/**
 * Pre-built audit event creators
 */
export const AuditEvents = {
  // Authentication events
  loginSuccess: (userId, source) => ({
    action: 'AUTH_LOGIN_SUCCESS',
    user: userId,
    details: { source }
  }),

  loginFailed: (ip, reason) => ({
    action: 'AUTH_LOGIN_FAILED',
    user: ip,
    details: { reason }
  }),

  // User events
  userCreated: (telegramId, source) => ({
    action: 'USER_CREATED',
    target: telegramId,
    details: { source }
  }),

  userUpdated: (telegramId, fields, adminUser) => ({
    action: 'USER_UPDATED',
    target: telegramId,
    user: adminUser,
    details: { fields: Object.keys(fields) }
  }),

  userDeleted: (telegramId, adminUser) => ({
    action: 'USER_DELETED',
    target: telegramId,
    user: adminUser
  }),

  // Payment events
  paymentCreated: (telegramId, orderId, amount) => ({
    action: 'PAYMENT_CREATED',
    target: telegramId,
    details: { orderId, amount }
  }),

  paymentCompleted: (telegramId, orderId, amount, method) => ({
    action: 'PAYMENT_COMPLETED',
    target: telegramId,
    details: { orderId, amount, method }
  }),

  paymentFailed: (telegramId, orderId, reason) => ({
    action: 'PAYMENT_FAILED',
    target: telegramId,
    details: { orderId, reason }
  }),

  // Subscription events
  subscriptionCreated: (telegramId, planId, endDate) => ({
    action: 'SUBSCRIPTION_CREATED',
    target: telegramId,
    details: { planId, endDate }
  }),

  subscriptionExpired: (telegramId, subscriptionId) => ({
    action: 'SUBSCRIPTION_EXPIRED',
    target: telegramId,
    details: { subscriptionId }
  }),

  // Referral events
  referralCreated: (referrerId, referredId) => ({
    action: 'REFERRAL_CREATED',
    target: referredId,
    details: { referrerId }
  }),

  referralDiscountUsed: (telegramId, discountPercent) => ({
    action: 'REFERRAL_DISCOUNT_USED',
    target: telegramId,
    details: { discountPercent }
  }),

  // Security events
  suspiciousActivity: (ip, reason, details) => ({
    action: 'SECURITY_SUSPICIOUS',
    user: ip,
    details: { reason, ...details }
  }),

  rateLimitExceeded: (ip, endpoint) => ({
    action: 'SECURITY_RATE_LIMIT',
    user: ip,
    details: { endpoint }
  }),

  // Admin events
  settingsChanged: (adminUser, setting, oldValue, newValue) => ({
    action: 'SETTINGS_CHANGED',
    user: adminUser,
    details: { setting, oldValue: String(oldValue).slice(0, 50), newValue: String(newValue).slice(0, 50) }
  }),

  broadcastSent: (adminUser, recipientCount) => ({
    action: 'BROADCAST_SENT',
    user: adminUser,
    details: { recipientCount }
  })
};

export default {
  sanitizeString,
  escapeHtml,
  sanitizeTelegramHtml,
  sanitizePhone,
  sanitizeTelegramId,
  sanitizeObject,
  logAudit,
  flushAuditLog,
  AuditEvents
};
