import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import investorRoutes from './routes/investors.js';
import companyRoutes from './routes/companies.js';
import fundRoutes from './routes/funds.js';
import raiseRoutes from './routes/raises.js';
import matchRoutes from './routes/matches.js';
import inquiryRoutes from './routes/inquiries.js';

// ── Bug #25: Env var validation ─────────────────────────────────────────────
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();

// Bug #10: Security headers
app.use(helmet());

// Bug #4: CORS — restrict to known origins when FRONTEND_URL is set.
// JWT-based auth doesn't rely on cookies so credentials:false is fine.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : null;

app.use(cors({
  origin: allowedOrigins || true,
}));

// Bug #9: Body parser with size limit
app.use(express.json({ limit: '1mb' }));

// Bug #2: Rate limiting on auth endpoints
// Note: In-memory store resets on serverless cold starts.
// For production, swap to a Redis-backed store.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/raises', raiseRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/inquiries', inquiryRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

export default app;
