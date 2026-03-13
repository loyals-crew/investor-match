import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import sql from '../db/index.js';
import { computeMatchesForRound } from '../matching/compute.js';

const router = Router();

// Guard: companies only
function companyOnly(req, res, next) {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can manage fundraise rounds' });
  }
  next();
}

// GET /api/raises — list all rounds for the authenticated company
router.get('/', authenticate, companyOnly, async (req, res) => {
  try {
    const rounds = await sql`
      SELECT * FROM fundraise_rounds
      WHERE company_id = ${req.user.id}
      ORDER BY created_at DESC
    `;
    return res.json({ rounds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch fundraise rounds' });
  }
});

// GET /api/raises/:id — get a single round (must belong to this company)
router.get('/:id', authenticate, companyOnly, async (req, res) => {
  try {
    const [round] = await sql`
      SELECT * FROM fundraise_rounds
      WHERE id = ${req.params.id} AND company_id = ${req.user.id}
    `;
    if (!round) return res.status(404).json({ error: 'Round not found' });
    return res.json({ round });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch round' });
  }
});

// POST /api/raises — create a new fundraise round
router.post('/', authenticate, companyOnly, async (req, res) => {
  const {
    round_name, status,
    raise_amount, investment_types, equity_offered,
    pre_money_valuation, min_ticket,
    use_of_funds, closing_date,
  } = req.body;

  if (!round_name?.trim()) {
    return res.status(400).json({ error: 'Round name is required' });
  }

  try {
    const [round] = await sql`
      INSERT INTO fundraise_rounds (
        company_id, round_name, status,
        raise_amount, investment_types, equity_offered,
        pre_money_valuation, min_ticket,
        use_of_funds, closing_date
      ) VALUES (
        ${req.user.id}, ${round_name.trim()}, ${status || 'open'},
        ${raise_amount || null}, ${investment_types || []}, ${equity_offered || null},
        ${pre_money_valuation || null}, ${min_ticket || null},
        ${use_of_funds || null}, ${closing_date || null}
      )
      RETURNING *
    `;
    // Fire-and-forget: compute matches in background
    computeMatchesForRound(round.id).catch(() => {});
    return res.status(201).json({ round });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create fundraise round' });
  }
});

// PUT /api/raises/:id — update a round
router.put('/:id', authenticate, companyOnly, async (req, res) => {
  const {
    round_name, status,
    raise_amount, investment_types, equity_offered,
    pre_money_valuation, min_ticket,
    use_of_funds, closing_date,
  } = req.body;

  try {
    const [existing] = await sql`
      SELECT id FROM fundraise_rounds WHERE id = ${req.params.id} AND company_id = ${req.user.id}
    `;
    if (!existing) return res.status(404).json({ error: 'Round not found' });

    const [round] = await sql`
      UPDATE fundraise_rounds SET
        round_name          = ${round_name?.trim()},
        status              = ${status || 'open'},
        raise_amount        = ${raise_amount || null},
        investment_types    = ${investment_types || []},
        equity_offered      = ${equity_offered || null},
        pre_money_valuation = ${pre_money_valuation || null},
        min_ticket          = ${min_ticket || null},
        use_of_funds        = ${use_of_funds || null},
        closing_date        = ${closing_date || null},
        updated_at          = NOW()
      WHERE id = ${req.params.id} AND company_id = ${req.user.id}
      RETURNING *
    `;
    // Fire-and-forget: recompute matches after update
    computeMatchesForRound(round.id).catch(() => {});
    return res.json({ round });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update round' });
  }
});

// DELETE /api/raises/:id — close a round (soft delete)
router.delete('/:id', authenticate, companyOnly, async (req, res) => {
  try {
    const [existing] = await sql`
      SELECT id FROM fundraise_rounds WHERE id = ${req.params.id} AND company_id = ${req.user.id}
    `;
    if (!existing) return res.status(404).json({ error: 'Round not found' });

    await sql`
      UPDATE fundraise_rounds SET status = 'closed', updated_at = NOW()
      WHERE id = ${req.params.id} AND company_id = ${req.user.id}
    `;
    return res.json({ message: 'Round closed successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to close round' });
  }
});

export default router;
