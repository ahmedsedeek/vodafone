// ============================================
// AUTHENTICATION HANDLERS
// Login, Logout, Session Management
// ============================================

const SESSION_DURATION_DAYS = 7;

/**
 * Handle login request
 */
function handleLogin(body) {
  const { password } = body;

  if (!password) {
    return jsonResponse({ success: false, message: 'كلمة المرور مطلوبة' }, 400);
  }

  const adminPassword = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.ADMIN_PASSWORD_PROPERTY);

  if (!adminPassword) {
    Logger.log('ADMIN_PASSWORD not set in script properties');
    return jsonResponse({ success: false, message: 'خطأ في تكوين الخادم' }, 500);
  }

  if (password !== adminPassword) {
    return jsonResponse({ success: false, message: 'كلمة المرور غير صحيحة' }, 401);
  }

  // Create session
  const sessionId = generateUUID();
  const tokenHash = hashToken(sessionId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Store session
  insertRow(SHEETS.SESSIONS, {
    session_id: sessionId,
    token_hash: tokenHash,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  });

  // Clean up expired sessions
  cleanExpiredSessions();

  return jsonResponse({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    data: {
      sessionToken: tokenHash,
      expiresAt: expiresAt.toISOString()
    }
  });
}

/**
 * Handle logout request
 */
function handleLogout(body) {
  const { sessionToken } = body;

  if (sessionToken) {
    // Delete session from sheet
    const sessions = filterRows(SHEETS.SESSIONS, s => s.token_hash === sessionToken);
    sessions.forEach(s => {
      deleteRow(SHEETS.SESSIONS, 'session_id', s.session_id);
    });
  }

  return jsonResponse({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
}

/**
 * Handle auth check request
 */
function handleAuthCheck(params) {
  const { sessionToken } = params;

  if (!sessionToken) {
    return jsonResponse({ authenticated: false });
  }

  const session = filterRows(SHEETS.SESSIONS, s => s.token_hash === sessionToken)[0];

  if (!session) {
    return jsonResponse({ authenticated: false });
  }

  // Check expiration
  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    // Session expired, delete it
    deleteRow(SHEETS.SESSIONS, 'session_id', session.session_id);
    return jsonResponse({ authenticated: false });
  }

  return jsonResponse({ authenticated: true });
}

/**
 * Validate session token
 */
function validateSession(sessionToken) {
  if (!sessionToken) return false;

  const session = filterRows(SHEETS.SESSIONS, s => s.token_hash === sessionToken)[0];
  if (!session) return false;

  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    deleteRow(SHEETS.SESSIONS, 'session_id', session.session_id);
    return false;
  }

  return true;
}

/**
 * Hash token using SHA-256
 */
function hashToken(token) {
  const secret = PropertiesService.getScriptProperties()
    .getProperty(CONFIG.SESSION_SECRET_PROPERTY) || 'default-secret';

  const input = token + secret;
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);

  return rawHash.map(byte => {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Clean up expired sessions
 */
function cleanExpiredSessions() {
  const now = new Date();
  const sessions = getAllRows(SHEETS.SESSIONS);

  sessions.forEach(session => {
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < now) {
      deleteRow(SHEETS.SESSIONS, 'session_id', session.session_id);
    }
  });
}
