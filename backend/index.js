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

// --- Mock OTP Service ---
// In production, integrate with MSG91, Twilio, or Firebase.
const otps = new Map(); // Global memory (or Redis) for storing temporary OTPs

app.post('/auth/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Mobile number required' });

  const otp = '123456'; // FIXED for testing, or use Math.random()
  otps.set(phoneNumber, otp);
  
  console.log(`[AUTH] OTP for ${phoneNumber}: ${otp}`);
  res.json({ success: true, message: 'OTP sent (Check server logs)' });
});

app.post('/auth/verify-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) return res.status(400).json({ error: 'Number and OTP required' });

  const storedOtp = otps.get(phoneNumber);
  if (storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Cleanup OTP
  otps.delete(phoneNumber);

  try {
    // Get or Create User
    let user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      user = await prisma.user.create({ data: { phoneNumber } });
    }

    const token = jwt.sign({ id: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (error) {
    console.error('[Verify OTP Error]:', error.message);
    res.status(500).json({ error: 'Database error linking your account', details: error.message });
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
