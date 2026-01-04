// ============================================
// VERIFICATION FUNCTIONS
// Run these to verify setup is complete
// ============================================

/**
 * Verify all sheets exist and have correct headers
 * Run this after initialSetup()
 */
function verifySheetSetup() {
  Logger.log('='.repeat(50));
  Logger.log('VERIFYING SHEET SETUP');
  Logger.log('='.repeat(50));

  const spreadsheet = getSpreadsheet();
  const results = [];

  // Expected sheets and their first header
  const expectedSheets = {
    'المحافظ': 'معرف المحفظة',
    'العملاء': 'معرف العميل',
    'أرقام العملاء': 'معرف الهاتف',
    'المعاملات': 'معرف المعاملة',
    'المدفوعات': 'معرف الدفعة',
    'المرفقات': 'معرف المرفق',
    'الجلسات': 'معرف الجلسة'
  };

  let allPassed = true;

  for (const [sheetName, expectedHeader] of Object.entries(expectedSheets)) {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      results.push(`❌ Sheet "${sheetName}" NOT FOUND`);
      allPassed = false;
      continue;
    }

    const firstHeader = sheet.getRange(1, 1).getValue();

    if (firstHeader === expectedHeader) {
      results.push(`✅ Sheet "${sheetName}" OK`);
    } else {
      results.push(`❌ Sheet "${sheetName}" header mismatch. Expected "${expectedHeader}", got "${firstHeader}"`);
      allPassed = false;
    }
  }

  results.forEach(r => Logger.log(r));

  Logger.log('');
  Logger.log(allPassed ? '✅ ALL SHEETS VERIFIED' : '❌ SOME SHEETS FAILED');
  Logger.log('='.repeat(50));

  return allPassed;
}

/**
 * Verify Drive folder exists
 */
function verifyDriveFolder() {
  Logger.log('='.repeat(50));
  Logger.log('VERIFYING DRIVE FOLDER');
  Logger.log('='.repeat(50));

  try {
    const folder = getDriveFolder();
    Logger.log('✅ Drive folder exists');
    Logger.log('   Name: ' + folder.getName());
    Logger.log('   ID: ' + folder.getId());
    Logger.log('   URL: ' + folder.getUrl());
    return true;
  } catch (e) {
    Logger.log('❌ Drive folder NOT FOUND');
    Logger.log('   Error: ' + e.message);
    Logger.log('   Run initialSetup() to create folder');
    return false;
  }
}

/**
 * Verify Script Properties are set
 */
function verifyScriptProperties() {
  Logger.log('='.repeat(50));
  Logger.log('VERIFYING SCRIPT PROPERTIES');
  Logger.log('='.repeat(50));

  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();

  const required = [
    'SPREADSHEET_ID',
    'DRIVE_FOLDER_ID',
    'API_KEY',
    'SESSION_SECRET',
    'ADMIN_PASSWORD'
  ];

  let allPassed = true;

  required.forEach(key => {
    const value = allProps[key];
    if (value && value !== 'CHANGE_THIS_PASSWORD') {
      const masked = key === 'API_KEY' ? value.substring(0, 8) + '...' : '****';
      Logger.log(`✅ ${key} = ${masked}`);
    } else if (value === 'CHANGE_THIS_PASSWORD') {
      Logger.log(`⚠️ ${key} = DEFAULT VALUE (please change)`);
      allPassed = false;
    } else {
      Logger.log(`❌ ${key} = NOT SET`);
      allPassed = false;
    }
  });

  Logger.log('');
  Logger.log(allPassed ? '✅ ALL PROPERTIES SET' : '❌ SOME PROPERTIES MISSING');
  Logger.log('='.repeat(50));

  return allPassed;
}

/**
 * Test API endpoint
 */
function testApiEndpoint() {
  Logger.log('='.repeat(50));
  Logger.log('TESTING API ENDPOINTS');
  Logger.log('='.repeat(50));

  // Test dashboard endpoint
  Logger.log('Testing dashboard endpoint...');
  const dashResult = handleGetDashboard();
  const dashData = JSON.parse(dashResult.getContent());

  if (dashData.success) {
    Logger.log('✅ Dashboard endpoint works');
    Logger.log('   Today Profit: ' + dashData.data.todayProfit);
    Logger.log('   Total Wallets: ' + dashData.data.totalWallets);
    Logger.log('   Total Clients: ' + dashData.data.totalClients);
  } else {
    Logger.log('❌ Dashboard endpoint failed: ' + dashData.message);
  }

  // Test wallets endpoint
  Logger.log('');
  Logger.log('Testing wallets endpoint...');
  const walletsResult = handleGetWallets();
  const walletsData = JSON.parse(walletsResult.getContent());

  if (walletsData.success) {
    Logger.log('✅ Wallets endpoint works');
    Logger.log('   Wallet count: ' + walletsData.data.length);
  } else {
    Logger.log('❌ Wallets endpoint failed: ' + walletsData.message);
  }

  Logger.log('='.repeat(50));
}

/**
 * Run all verifications
 */
function runAllVerifications() {
  Logger.log('');
  Logger.log('╔════════════════════════════════════════════════╗');
  Logger.log('║     VODAFONE CASH TRACKER - VERIFICATION       ║');
  Logger.log('╚════════════════════════════════════════════════╝');
  Logger.log('');

  const sheetsOk = verifySheetSetup();
  Logger.log('');

  const driveOk = verifyDriveFolder();
  Logger.log('');

  const propsOk = verifyScriptProperties();
  Logger.log('');

  testApiEndpoint();

  Logger.log('');
  Logger.log('╔════════════════════════════════════════════════╗');
  Logger.log('║                  SUMMARY                       ║');
  Logger.log('╚════════════════════════════════════════════════╝');
  Logger.log('');

  if (sheetsOk && driveOk && propsOk) {
    Logger.log('✅ ALL VERIFICATIONS PASSED');
    Logger.log('');
    Logger.log('Your backend is ready for deployment!');
    Logger.log('');
    Logger.log('Next steps:');
    Logger.log('1. Deploy as Web App (Deploy > New deployment)');
    Logger.log('2. Copy the Web App URL');
    Logger.log('3. Set environment variables in Vercel');
    Logger.log('4. Deploy frontend');
  } else {
    Logger.log('❌ SOME VERIFICATIONS FAILED');
    Logger.log('');
    Logger.log('Please fix the issues above before deploying.');
    Logger.log('');
    Logger.log('Common fixes:');
    Logger.log('- Run initialSetup() if sheets/folder missing');
    Logger.log('- Set ADMIN_PASSWORD in Script Properties');
  }

  Logger.log('');
}

/**
 * Create sample data for testing
 */
function createSampleData() {
  Logger.log('Creating sample data...');

  // Create a test wallet
  const walletResult = handleCreateWallet({
    phone_number: '01012345678',
    wallet_name: 'محفظة اختبار',
    initial_balance: 10000,
    notes: 'محفظة تجريبية للاختبار'
  });
  const wallet = JSON.parse(walletResult.getContent());
  Logger.log('Created wallet: ' + (wallet.success ? wallet.data.wallet_id : 'FAILED'));

  // Create a test client
  const clientResult = handleCreateClient({
    client_name: 'عميل اختبار',
    phone_number: '01098765432',
    phone_label: 'شخصي',
    address: 'القاهرة'
  });
  const client = JSON.parse(clientResult.getContent());
  Logger.log('Created client: ' + (client.success ? client.data.client_id : 'FAILED'));

  if (wallet.success && client.success) {
    // Create a test transaction
    const txResult = handleCreateTransaction({
      wallet_id: wallet.data.wallet_id,
      client_id: client.data.client_id,
      transaction_type: 'TRANSFER_OUT',
      vc_amount: 500,
      cash_amount: 515,
      description: 'معاملة اختبار'
    });
    const tx = JSON.parse(txResult.getContent());
    Logger.log('Created transaction: ' + (tx.success ? tx.data.transaction_id : 'FAILED'));
  }

  Logger.log('Sample data creation complete.');
  Logger.log('Check dashboard to verify.');
}

/**
 * Clear all sample/test data
 */
function clearAllData() {
  Logger.log('⚠️ CLEARING ALL DATA...');

  const spreadsheet = getSpreadsheet();

  // Clear each sheet (keep headers)
  Object.values(SHEETS).forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
      Logger.log('Cleared: ' + sheetName);
    }
  });

  Logger.log('✅ All data cleared (headers preserved)');
}
