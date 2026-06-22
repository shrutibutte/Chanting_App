const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3030';
const TEST_EMAIL_1 = 'qa_test_user1@example.com';
const TEST_EMAIL_2 = 'qa_test_user2@example.com';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

function logPass(message) {
  console.log(`${colors.green}✔ PASS:${colors.reset} ${message}`);
}

function logFail(message, error) {
  console.error(`${colors.red}✖ FAIL:${colors.reset} ${message}`);
  if (error) console.error(error);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.magenta}=== ${title} ===${colors.reset}`);
}

// Global test variables
let token1 = null;
let token2 = null;

// --- Load and Sandboxed Mocking of Frontend Code ---
let translationsModule = {};
let storeModule = {};

try {
  const translationsPath = path.join(__dirname, '../../frontend/src/utils/translations.js');
  const translationsCode = fs.readFileSync(translationsPath, 'utf8');
  const cleanTranslationsCode = translationsCode.replace(/export /g, '');
  const translationsContext = vm.createContext({ console, translationsModule });
  vm.runInContext(
    cleanTranslationsCode + '\ntranslationsModule.translations = translations;\ntranslationsModule.getTranslation = getTranslation;',
    translationsContext
  );

  const useStorePath = path.join(__dirname, '../../frontend/src/store/useStore.js');
  const useStoreCode = fs.readFileSync(useStorePath, 'utf8');
  const startIdx = useStoreCode.indexOf('export const JOURNEY_LEVELS =');
  const endIdx = useStoreCode.indexOf('export const useStore =');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not find JOURNEY_LEVELS or useStore boundaries in useStore.js');
  }
  const storeSnippet = useStoreCode.substring(startIdx, endIdx).replace(/export /g, '');
  const storeContext = vm.createContext({ console, storeModule });
  vm.runInContext(
    storeSnippet + '\nstoreModule.JOURNEY_LEVELS = JOURNEY_LEVELS;\nstoreModule.getLevelInfo = getLevelInfo;',
    storeContext
  );
} catch (e) {
  logFail('Failed to load/sandbox frontend modules', e);
  process.exit(1);
}

// --- Test Suites ---

async function runUnitTests() {
  logSection('UNIT TESTS (FRONTEND STATE LOGIC)');

  // 1. Translation Tests
  try {
    const { getTranslation } = translationsModule;
    assert.strictEqual(getTranslation('en', 'home'), 'Home');
    assert.strictEqual(getTranslation('hi', 'home'), 'होम');
    assert.strictEqual(getTranslation('mr', 'home'), 'होम');

    // Parameter substitution test
    const testTime = '06:00';
    const translatedMsg = getTranslation('en', 'reminderSetTo', { time: testTime });
    assert.strictEqual(translatedMsg, `Daily Reminder set to ${testTime}.`);
    logPass('Frontend localization resolutions and parameter interpolation matches dictionaries.');
  } catch (err) {
    logFail('Translation resolution failed', err);
    throw err;
  }

  // 2. Level up engine logic tests
  try {
    const { getLevelInfo } = storeModule;
    
    // Level 0 boundary
    const lvl0 = getLevelInfo(0);
    assert.strictEqual(lvl0.name, 'Devotion Seeker');
    assert.strictEqual(lvl0.nextLevelName, 'Dedicated Devotee');
    assert.strictEqual(lvl0.remainingCount, 1000);
    assert.strictEqual(lvl0.progressPercentage, 0);

    // Mid level check
    const lvlHalf = getLevelInfo(500);
    assert.strictEqual(lvlHalf.progressPercentage, 50);
    assert.strictEqual(lvlHalf.remainingCount, 500);

    // Level-up threshold boundary
    const lvl1 = getLevelInfo(1000);
    assert.strictEqual(lvl1.name, 'Dedicated Devotee');
    assert.strictEqual(lvl1.nextLevelName, 'Bhakti Warrior');
    assert.strictEqual(lvl1.remainingCount, 1500);

    // Overflow level check (above Ananda Master 500,000)
    const lvlAnanda = getLevelInfo(600000);
    assert.strictEqual(lvlAnanda.name, 'Ananda Master Lvl 2');
    assert.strictEqual(lvlAnanda.nextLevelName, 'Ananda Master Lvl 3');
    assert.strictEqual(lvlAnanda.remainingCount, 100000);
    assert.strictEqual(lvlAnanda.progressPercentage, 0);

    logPass('Level-Up engine calculates levels, thresholds, and infinite sub-levels correctly.');
  } catch (err) {
    logFail('Level engine validation failed', err);
    throw err;
  }
}

async function runIntegrationTests() {
  logSection('INTEGRATION TESTS (BACKEND REST API)');

  // 1. Health Check
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    logPass('Health Check endpoint runs and responds.');
  } catch (err) {
    logFail('Health Check endpoint failed', err);
    throw err;
  }

  // 2. JWT Security Isolation
  try {
    const res = await fetch(`${BASE_URL}/custom-naams`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, 'Auth token missing');

    const resBad = await fetch(`${BASE_URL}/custom-naams`, {
      headers: { 'Authorization': 'Bearer bad_token' }
    });
    assert.strictEqual(resBad.status, 403);
    const bodyBad = await resBad.json();
    assert.strictEqual(bodyBad.error, 'Invalid token');
    logPass('JWT security boundaries block unauthorized and invalid requests.');
  } catch (err) {
    logFail('JWT Security Validation failed', err);
    throw err;
  }

  // 3. OTP Limit Validation (Attempt Limits & Expiry bounds)
  try {
    // Trigger OTP for user
    const sendRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL_1 })
    });
    assert.strictEqual(sendRes.status, 200);

    // Retrieve active OTP via debug helper
    const debugRes = await fetch(`${BASE_URL}/auth/debug-otp?email=${TEST_EMAIL_1}`);
    assert.strictEqual(debugRes.status, 200);
    const { otp } = await debugRes.json();

    // Verify OTP with wrong code 5 times to trigger lock limits
    for (let i = 1; i <= 5; i++) {
      const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL_1, otp: '000000' })
      });
      assert.strictEqual(verifyRes.status, 400);
      const verifyBody = await verifyRes.json();
      if (i < 5) {
        assert.ok(verifyBody.error.includes('Invalid OTP'));
      } else {
        assert.strictEqual(verifyBody.error, 'Too many incorrect attempts. OTP invalidated.');
      }
    }

    // Try a 6th verification with the original CORRECT code (must be invalidated now)
    const verifyResCorrect = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL_1, otp })
    });
    assert.strictEqual(verifyResCorrect.status, 400);
    const verifyBodyCorrect = await verifyResCorrect.json();
    assert.strictEqual(verifyBodyCorrect.error, 'No active OTP request found');

    logPass('OTP limits invalidate the code after 5 failures and lock verification.');
  } catch (err) {
    logFail('OTP limits validation failed', err);
    throw err;
  }

  // 4. Successful User Login and Auth token retrieval
  try {
    // Generate new OTP for User 1
    await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL_1 })
    });
    const debugRes = await fetch(`${BASE_URL}/auth/debug-otp?email=${TEST_EMAIL_1}`);
    const { otp } = await debugRes.json();

    // Login successfully
    const loginRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL_1, otp })
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    token1 = loginData.token;

    // Login User 2
    await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL_2 })
    });
    const debugRes2 = await fetch(`${BASE_URL}/auth/debug-otp?email=${TEST_EMAIL_2}`);
    const otp2 = (await debugRes2.json()).otp;

    const loginRes2 = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL_2, otp: otp2 })
    });
    assert.strictEqual(loginRes2.status, 200);
    token2 = (await loginRes2.json()).token;

    logPass('Valid OTP logs in user successfully and returns access token.');
  } catch (err) {
    logFail('User login test failed', err);
    throw err;
  }

  // 5. Tap Synchronization and Statistics API Checks
  try {
    const syncCount = 108;
    const syncDate = new Date().toISOString().split('T')[0];

    // Sync taps
    const syncRes = await fetch(`${BASE_URL}/sync-taps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count: syncCount, date: syncDate })
    });
    assert.strictEqual(syncRes.status, 200);
    const syncBody = await syncRes.json();
    assert.strictEqual(syncBody.success, true);

    // Verify today's stats
    const statsRes = await fetch(`${BASE_URL}/stats/today`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(statsRes.status, 200);
    const statsBody = await statsRes.json();
    assert.ok(statsBody.totalCount >= syncCount);

    // Verify summary stats
    const summaryRes = await fetch(`${BASE_URL}/stats/summary`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(summaryRes.status, 200);
    const summaryBody = await summaryRes.json();
    assert.ok(summaryBody.records.length > 0);

    // Verify validation constraints (non-positive count)
    const syncResBad = await fetch(`${BASE_URL}/sync-taps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ count: -5, date: syncDate })
    });
    assert.strictEqual(syncResBad.status, 400);

    logPass('Taps synchronisation, boundary check (-ve counts), and stats aggregation are correct.');
  } catch (err) {
    logFail('Counter Synchronization validation failed', err);
    throw err;
  }

  // 6. Custom Naam CRUD, Deduplication, and Isolation
  try {
    // Add custom name
    const addRes = await fetch(`${BASE_URL}/custom-naams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Radha' })
    });
    assert.ok(addRes.status === 200 || addRes.status === 400); // 400 if Radha already exists in DB

    // Attempt case-insensitive duplicates (RADHA, radha, Radha)
    const duplicateList = ['RADHA', 'radha', 'Radha '];
    for (const dup of duplicateList) {
      const dupRes = await fetch(`${BASE_URL}/custom-naams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token1}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: dup })
      });
      assert.strictEqual(dupRes.status, 400);
      const dupBody = await dupRes.json();
      assert.strictEqual(dupBody.error, 'This custom name already exists');
    }

    // Verify empty name check
    const emptyRes = await fetch(`${BASE_URL}/custom-naams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: '' })
    });
    assert.strictEqual(emptyRes.status, 400);

    // Verify lists
    const listRes = await fetch(`${BASE_URL}/custom-naams`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.naams.some(n => n.name.toLowerCase() === 'radha'));

    // Database user isolation: verify User 2 cannot see User 1's custom names
    const listRes2 = await fetch(`${BASE_URL}/custom-naams`, {
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert.strictEqual(listRes2.status, 200);
    const listBody2 = await listRes2.json();
    assert.ok(!listBody2.naams.some(n => n.name.toLowerCase() === 'radha'));

    logPass('Custom Naam CRUD, duplicate verification (case-insensitive), and database isolation work.');
  } catch (err) {
    logFail('Custom Naam integration checks failed', err);
    throw err;
  }

  // 7. Safety Robustness: Parser and Payload Crash Protection
  try {
    // Sending malformed JSON body
    const crashRes = await fetch(`${BASE_URL}/custom-naams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      },
      body: '{"name": "Krishna"' // Malformed JSON (missing closing brace)
    });
    assert.strictEqual(crashRes.status, 400);
    const crashBody = await crashRes.json();
    assert.strictEqual(crashBody.error, 'Malformed JSON payload');

    // Send empty payload with Content-Type application/json header on GET route
    const getRes = await fetch(`${BASE_URL}/custom-naams`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token1}`,
        'Content-Type': 'application/json'
      }
      // No body
    });
    assert.strictEqual(getRes.status, 200);

    logPass('Malformed JSON body & empty body on GET request do not crash the Express server.');
  } catch (err) {
    logFail('Safety robustness parser testing failed', err);
    throw err;
  }
}

async function run() {
  console.log(`${colors.bright}${colors.cyan}--- Starting QA Automated Testing ---${colors.reset}`);
  try {
    await runUnitTests();
    await runIntegrationTests();
    console.log(`\n${colors.bright}${colors.green}🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉${colors.reset}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.bright}${colors.red}❌ QA TESTS FAILED! ❌${colors.reset}\n`);
    process.exit(1);
  }
}

run();
