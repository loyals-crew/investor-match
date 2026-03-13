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

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/raises', raiseRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/inquiries', inquiryRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
