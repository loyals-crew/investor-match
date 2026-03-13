import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import sql from '../db/index.js';

const router = Router();

// POST /api/investors/profile  — save onboarding data
router.post('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'investor') {
    return res.status(403).json({ error: 'Only investors can access this route' });
  }

  const {
    firm_name,
    contact_name,
    sectors,
    stages,
    geography,
    ticket_min,
    ticket_max,
    deal_types,
    bio,
    website,
  } = req.body;

  try {
    const existing = await sql`SELECT id FROM investor_profiles WHERE user_id = ${req.user.id}`;

    let profile;
    if (existing.length > 0) {
      [profile] = await sql`
        UPDATE investor_profiles SET
          firm_name = ${firm_name},
          contact_name = ${contact_name},
          sectors = ${sectors},
          stages = ${stages},
          geography = ${geography},
          ticket_min = ${ticket_min},
          ticket_max = ${ticket_max},
          deal_types = ${deal_types},
          bio = ${bio},
          website = ${website},
          updated_at = NOW()
        WHERE user_id = ${req.user.id}
        RETURNING *
      `;
    } else {
      [profile] = await sql`
        INSERT INTO investor_profiles
          (user_id, firm_name, contact_name, sectors, stages, geography, ticket_min, ticket_max, deal_types, bio, website)
        VALUES
          (${req.user.id}, ${firm_name}, ${contact_name}, ${sectors}, ${stages}, ${geography}, ${ticket_min}, ${ticket_max}, ${deal_types}, ${bio}, ${website})
        RETURNING *
      `;
    }

    // Mark onboarding complete
    await sql`UPDATE users SET onboarding_completed = true WHERE id = ${req.user.id}`;

    return res.json({ profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save investor profile' });
  }
});

// GET /api/investors/profile  — get own profile
router.get('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'investor') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [profile] = await sql`SELECT * FROM investor_profiles WHERE user_id = ${req.user.id}`;
    return res.json({ profile: profile || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
