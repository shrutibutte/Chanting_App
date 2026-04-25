const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'spiritual_secret_108';

const admin = require('firebase-admin');

// Ensure you place your downloaded Firebase JSON file as 'serviceAccountKey.json' in this backend folder
try {
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('[FIREBASE] Admin initialized with serviceAccountKey.json');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('[FIREBASE] Admin initialized with FIREBASE_SERVICE_ACCOUNT ENV');
  } else {
    // Falls back to Google Application Default Credentials
    admin.initializeApp();
  }
} catch (error) {
  console.log('[FIREBASE] Admin init warning:', error.message);
}

app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Chanting App Backend is running!' });
});

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Auth token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- OTP Auth Routes ---
app.post('/auth/verify-otp', async (req, res) => {
  const { firebaseToken } = req.body;
  if (!firebaseToken) return res.status(400).json({ error: 'Firebase Token required' });

  try {
    // Decrypt token from Google
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'No phone number attached to this verified token.' });
    }

    // Upsert User in PostgreSQL
    let user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      user = await prisma.user.create({ data: { phoneNumber } });
    }

    const token = jwt.sign({ id: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (error) {
    console.error('[Firebase Verify Error]:', error.message);
    res.status(401).json({ error: 'Invalid or expired Firebase token', details: error.message });
  }
});

// --- Jaap APIs ---

// Batch Sync Taps
app.post('/sync-taps', authenticateToken, async (req, res) => {
  const { count, date } = req.body; // count is the total taps since last sync
  const userId = req.user.id;

  if (count <= 0) return res.status(400).json({ error: 'Count must be positive' });

  try {
    const recordDate = date || new Date().toISOString().split('T')[0];

    // Find if a record already exists for this user on this date
    const existingRecord = await prisma.chantRecord.findFirst({
      where: {
        userId: userId,
        date: recordDate
      }
    });

    let record;
    if (existingRecord) {
      // Update by adding newly counted taps to today's row
      record = await prisma.chantRecord.update({
        where: { id: existingRecord.id },
        data: {
          count: existingRecord.count + count
        }
      });
    } else {
      // First batch sync of the day -> create the row
      record = await prisma.chantRecord.create({
        data: {
          userId,
          count,
          date: recordDate,
        }
      });
    }

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// Get Today's Stats
app.get('/stats/today', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  const result = await prisma.chantRecord.aggregate({
    _sum: { count: true },
    where: { userId, date: today }
  });

  res.json({ totalCount: result._sum.count || 0 });
});

// Get Aggregate Stats (Daily/Monthly/Yearly)
app.get('/stats/summary', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  const records = await prisma.chantRecord.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' }
  });

  // Basic aggregation - can be expanded as per user preference
  res.json({ totalEntries: records.length, records });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
