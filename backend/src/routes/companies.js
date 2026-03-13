import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import sql from '../db/index.js';

const router = Router();

// POST /api/companies/profile — upsert company profile
router.post('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can access this route' });
  }

  const {
    // Identity
    company_name, contact_name, contact_role, country, legal_type, registration_date, website,
    // Business
    sector, stage, business_model, team_size, one_liner, description,
    // Traction
    revenue_status, annual_revenue, mrr, is_profitable,
    has_previous_funding, previous_funding, target_market,
  } = req.body;

  if (!company_name?.trim()) return res.status(400).json({ error: 'Company name is required' });

  try {
    const existing = await sql`SELECT id FROM company_profiles WHERE user_id = ${req.user.id}`;

    let profile;
    if (existing.length > 0) {
      [profile] = await sql`
        UPDATE company_profiles SET
          company_name        = ${company_name?.trim()},
          contact_name        = ${contact_name?.trim()},
          contact_role        = ${contact_role || null},
          country             = ${country || null},
          legal_type          = ${legal_type || null},
          registration_date   = ${registration_date || null},
          website             = ${website || null},
          sector              = ${sector || null},
          stage               = ${stage || null},
          business_model      = ${business_model || null},
          team_size           = ${team_size || null},
          one_liner           = ${one_liner || null},
          description         = ${description || null},
          revenue_status      = ${revenue_status || null},
          annual_revenue      = ${annual_revenue || null},
          mrr                 = ${mrr || null},
          is_profitable       = ${is_profitable ?? null},
          has_previous_funding = ${has_previous_funding ?? null},
          previous_funding    = ${previous_funding || null},
          target_market       = ${target_market || null},
          updated_at          = NOW()
        WHERE user_id = ${req.user.id}
        RETURNING *
      `;
    } else {
      [profile] = await sql`
        INSERT INTO company_profiles (
          user_id, company_name, contact_name, contact_role,
          country, legal_type, registration_date, website,
          sector, stage, business_model, team_size, one_liner, description,
          revenue_status, annual_revenue, mrr, is_profitable,
          has_previous_funding, previous_funding, target_market
        ) VALUES (
          ${req.user.id}, ${company_name?.trim()}, ${contact_name?.trim()}, ${contact_role || null},
          ${country || null}, ${legal_type || null}, ${registration_date || null}, ${website || null},
          ${sector || null}, ${stage || null}, ${business_model || null}, ${team_size || null},
          ${one_liner || null}, ${description || null},
          ${revenue_status || null}, ${annual_revenue || null}, ${mrr || null}, ${is_profitable ?? null},
          ${has_previous_funding ?? null}, ${previous_funding || null}, ${target_market || null}
        )
        RETURNING *
      `;
    }

    await sql`UPDATE users SET onboarding_completed = true WHERE id = ${req.user.id}`;

    return res.json({ profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save company profile' });
  }
});

// GET /api/companies/profile
router.get('/profile', authenticate, async (req, res) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [profile] = await sql`SELECT * FROM company_profiles WHERE user_id = ${req.user.id}`;
    return res.json({ profile: profile || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
