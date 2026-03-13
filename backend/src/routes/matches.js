/**
 * GET /api/matches
 *
 * Returns cached match results from the `matches` table.
 * The perspective (company vs investor) is determined by req.user.role.
 *
 * Company  → sees investors/funds matched to their active rounds
 * Investor → sees company rounds matched to their active funds / profile
 *
 * Bug #20: Completed deals are always visible, even if the round is closed.
 * Bug #14: Fund ownership is verified when marking a deal.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import sql from '../db/index.js';

const router = Router();

// GET /api/matches — authenticated; returns role-appropriate matches
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'company') {
      // ── Company perspective ──────────────────────────────────────────────
      const rows = await sql`
        SELECT
          m.id,
          m.score,
          m.match_type,
          m.match_reasons,
          m.computed_at,
          m.raise_round_id,
          r.round_name,
          r.status       AS round_status,
          m.investor_id,
          ip.firm_name   AS investor_firm,
          ip.contact_name AS investor_contact,
          ip.sectors     AS investor_sectors,
          ip.stages      AS investor_stages,
          ip.geography   AS investor_geography,
          ip.ticket_min,
          ip.ticket_max,
          m.fund_id,
          f.name         AS fund_name,
          f.deal_size_min,
          f.deal_size_max
        FROM matches m
        JOIN fundraise_rounds r  ON r.id = m.raise_round_id
        JOIN investor_profiles ip ON ip.user_id = m.investor_id
        LEFT JOIN funds f         ON f.id = m.fund_id
        WHERE m.company_id = ${req.user.id}
          AND (r.status IN ('open', 'closing') OR m.deal_status IS NOT NULL)
        ORDER BY m.score DESC, m.computed_at DESC
      `;
      return res.json({ matches: rows });

    } else if (req.user.role === 'investor') {
      // ── Investor perspective ─────────────────────────────────────────────
      const rows = await sql`
        SELECT
          m.id,
          m.score,
          m.match_type,
          m.match_reasons,
          m.computed_at,
          m.raise_round_id,
          r.round_name,
          r.raise_amount,
          r.investment_types,
          r.equity_offered,
          r.min_ticket,
          r.closing_date,
          r.status        AS round_status,
          m.company_id,
          cp.company_name,
          cp.sector,
          cp.stage,
          cp.country,
          cp.one_liner,
          cp.website,
          m.fund_id,
          f.name          AS fund_name,
          m.deal_status,
          m.deal_amount,
          m.deal_fund_id
        FROM matches m
        JOIN fundraise_rounds r   ON r.id = m.raise_round_id
        JOIN company_profiles cp  ON cp.user_id = m.company_id
        LEFT JOIN funds f          ON f.id = m.fund_id
        WHERE m.investor_id = ${req.user.id}
          AND (r.status IN ('open', 'closing') OR m.deal_status IS NOT NULL)
        ORDER BY m.score DESC, m.computed_at DESC
      `;
      return res.json({ matches: rows });

    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ── PATCH /api/matches/:id/deal — investor marks a deal outcome ─────────────

router.patch('/:id/deal', authenticate, async (req, res) => {
  if (req.user.role !== 'investor') {
    return res.status(403).json({ error: 'Only investors can mark deal outcomes' });
  }

  const { deal_status, deal_amount, deal_fund_id } = req.body;

  if (!['completed', 'declined'].includes(deal_status)) {
    return res.status(400).json({ error: 'deal_status must be "completed" or "declined"' });
  }

  try {
    // Verify the match belongs to this investor
    const [match] = await sql`
      SELECT id, fund_id FROM matches
      WHERE id = ${req.params.id} AND investor_id = ${req.user.id}
    `;
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // For completed deals, default fund to match's own fund_id if not specified
    const resolvedFundId =
      deal_status === 'completed'
        ? (deal_fund_id || match.fund_id)
        : null;

    // Bug #14: Verify the investor actually owns the target fund
    if (resolvedFundId) {
      const [fund] = await sql`
        SELECT id FROM funds WHERE id = ${resolvedFundId} AND investor_id = ${req.user.id}
      `;
      if (!fund) {
        return res.status(400).json({ error: 'Fund not found or does not belong to you' });
      }
    }

    const [updated] = await sql`
      UPDATE matches SET
        deal_status  = ${deal_status},
        deal_amount  = ${deal_status === 'completed' ? (deal_amount || null) : null},
        deal_fund_id = ${resolvedFundId}
      WHERE id = ${match.id}
      RETURNING *
    `;

    return res.json({ match: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update deal status' });
  }
});

export default router;
