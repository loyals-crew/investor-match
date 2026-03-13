import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import sql from '../db/index.js';
import { computeMatchesForInvestor } from '../matching/compute.js';

const router = Router();

// Guard: investors only
function investorOnly(req, res, next) {
  if (req.user.role !== 'investor') {
    return res.status(403).json({ error: 'Only investors can manage funds' });
  }
  next();
}

// GET /api/funds — list all funds for the authenticated investor
router.get('/', authenticate, investorOnly, async (req, res) => {
  try {
    const funds = await sql`
      SELECT
        f.*,
        COALESCE((
          SELECT SUM(m.deal_amount)
          FROM matches m
          WHERE m.deal_fund_id = f.id AND m.deal_status = 'completed'
        ), 0) AS deployed_amount
      FROM funds f
      WHERE f.investor_id = ${req.user.id}
      ORDER BY f.created_at DESC
    `;
    return res.json({ funds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch funds' });
  }
});

// GET /api/funds/:id/portfolio — portfolio companies invested via this fund
router.get('/:id/portfolio', authenticate, investorOnly, async (req, res) => {
  try {
    const [fund] = await sql`
      SELECT id FROM funds WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
    `;
    if (!fund) return res.status(404).json({ error: 'Fund not found' });

    const portfolio = await sql`
      SELECT
        m.id,
        m.deal_amount,
        m.deal_status,
        m.computed_at,
        cp.company_name,
        cp.sector,
        cp.stage,
        r.round_name
      FROM matches m
      JOIN company_profiles cp ON cp.user_id = m.company_id
      JOIN fundraise_rounds r  ON r.id = m.raise_round_id
      WHERE m.deal_fund_id = ${req.params.id}
        AND m.deal_status = 'completed'
      ORDER BY m.computed_at DESC
    `;

    return res.json({ portfolio });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// GET /api/funds/:id — get a single fund (must belong to this investor)
router.get('/:id', authenticate, investorOnly, async (req, res) => {
  try {
    const [fund] = await sql`
      SELECT * FROM funds
      WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
    `;
    if (!fund) return res.status(404).json({ error: 'Fund not found' });
    return res.json({ fund });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch fund' });
  }
});

// POST /api/funds — create a new fund
router.post('/', authenticate, investorOnly, async (req, res) => {
  const {
    name, vintage_year, status, redemption_date,
    fund_size, deal_size_min, deal_size_max,
    sectors, stages, geography, deal_types,
    company_focus, thesis,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Fund name is required' });
  }

  try {
    const [fund] = await sql`
      INSERT INTO funds (
        investor_id, name, vintage_year, status, redemption_date,
        fund_size, deal_size_min, deal_size_max,
        sectors, stages, geography, deal_types,
        company_focus, thesis
      ) VALUES (
        ${req.user.id}, ${name.trim()}, ${vintage_year || null}, ${status || 'active'},
        ${redemption_date || null},
        ${fund_size || null}, ${deal_size_min || null}, ${deal_size_max || null},
        ${sectors || []}, ${stages || []}, ${geography || []}, ${deal_types || []},
        ${company_focus || null}, ${thesis || null}
      )
      RETURNING *
    `;
    // Fire-and-forget: recompute matches for this investor
    computeMatchesForInvestor(req.user.id).catch(() => {});
    return res.status(201).json({ fund });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create fund' });
  }
});

// PUT /api/funds/:id — update a fund
router.put('/:id', authenticate, investorOnly, async (req, res) => {
  const {
    name, vintage_year, status, redemption_date,
    fund_size, deal_size_min, deal_size_max,
    sectors, stages, geography, deal_types,
    company_focus, thesis,
  } = req.body;

  // Bug #6: Validate required fields on update
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Fund name is required' });
  }

  try {
    const [existing] = await sql`
      SELECT id FROM funds WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
    `;
    if (!existing) return res.status(404).json({ error: 'Fund not found' });

    const [fund] = await sql`
      UPDATE funds SET
        name = ${name.trim()},
        vintage_year = ${vintage_year || null},
        status = ${status || 'active'},
        redemption_date = ${redemption_date || null},
        fund_size = ${fund_size || null},
        deal_size_min = ${deal_size_min || null},
        deal_size_max = ${deal_size_max || null},
        sectors = ${sectors || []},
        stages = ${stages || []},
        geography = ${geography || []},
        deal_types = ${deal_types || []},
        company_focus = ${company_focus || null},
        thesis = ${thesis || null},
        updated_at = NOW()
      WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
      RETURNING *
    `;
    // Fire-and-forget: recompute matches after update
    computeMatchesForInvestor(req.user.id).catch(() => {});
    return res.json({ fund });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update fund' });
  }
});

// DELETE /api/funds/:id — archive (soft-close) a fund
router.delete('/:id', authenticate, investorOnly, async (req, res) => {
  try {
    const [existing] = await sql`
      SELECT id FROM funds WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
    `;
    if (!existing) return res.status(404).json({ error: 'Fund not found' });

    await sql`
      UPDATE funds SET status = 'closed', updated_at = NOW()
      WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
    `;

    // Bug #19: Clean up orphaned matches (non-deal matches referencing this fund)
    await sql`
      DELETE FROM matches
      WHERE fund_id = ${req.params.id} AND deal_status IS NULL
    `;

    // Fire-and-forget: recompute matches (fund no longer active; may fall back to profile)
    computeMatchesForInvestor(req.user.id).catch(() => {});
    return res.json({ message: 'Fund closed successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to close fund' });
  }
});

export default router;
