const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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

// --- Email OTP Service ---
const otps = new Map(); // Global memory (or Redis) for storing temporary OTPs

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address required' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(email, otp);
  
  console.log(`[AUTH] Generating OTP for ${email}`);
  
  try {
    await transporter.sendMail({
      from: `"Naam Jaap App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Login Code - Naam Jaap',
      html: `<h2>Welcome to Naam Jaap</h2>
             <p>Your 6-digit login code is: <strong>${otp}</strong></p>
             <p>This code will expire in 10 minutes.</p>`
    });
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('[Email Send Error]:', error);
    res.status(500).json({ error: 'Failed to send OTP email', details: error.message });
  }
});

app.post('/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  const storedOtp = otps.get(email);
  if (storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Cleanup OTP
  otps.delete(email);

  try {
    // Get or Create User
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
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
