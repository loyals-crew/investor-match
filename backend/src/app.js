import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import investorRoutes from './routes/investors.js';
import companyRoutes from './routes/companies.js';
import fundRoutes from './routes/funds.js';
import raiseRoutes from './routes/raises.js';
import matchRoutes from './routes/matches.js';
import inquiryRoutes from './routes/inquiries.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/raises', raiseRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/inquiries', inquiryRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

export default app;
