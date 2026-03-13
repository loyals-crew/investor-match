import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'email, password, and role are required' });
  }
  if (!['investor', 'company'].includes(role)) {
    return res.status(400).json({ error: 'role must be investor or company' });
  }

  // Bug #5: Server-side password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Bug #24: Normalize email to lowercase
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${normalizedEmail}, ${password_hash}, ${role})
      RETURNING id, email, role, onboarding_completed
    `;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  // Bug #24: Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Bug #11: Select only needed fields instead of SELECT *
    const [user] = await sql`
      SELECT id, email, role, password_hash, onboarding_completed
      FROM users WHERE email = ${normalizedEmail}
    `;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        onboarding_completed: user.onboarding_completed,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — Bug #12: Use authenticate middleware instead of duplicating JWT logic
router.get('/me', authenticate, async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, email, role, onboarding_completed FROM users WHERE id = ${req.user.id}
    `;
    return res.json({ user: user || null });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
