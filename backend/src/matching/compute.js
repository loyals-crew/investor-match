/**
 * Matching Compute — DB orchestration layer.
 *
 * Two public entry points:
 *   computeMatchesForRound(roundId)    — called after a raise round is saved
 *   computeMatchesForInvestor(investorId) — called after a fund is saved/closed
 *
 * Strategy (Option C — event-driven, DB-cached):
 *   • Delete stale matches for the affected entity
 *   • Recompute and upsert fresh matches
 *   • Errors are caught and logged; never propagate to the caller's response
 */

import sql from '../db/index.js';
import { scoreMatch } from './engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a list of mandate objects for an investor.
 * If the investor has active funds → one mandate per fund.
 * If no active funds → fall back to their general investor_profile.
 */
async function getInvestorMandates(investorId) {
  const activeFunds = await sql`
    SELECT id, sectors, stages, geography, deal_types, deal_size_min, deal_size_max
    FROM funds
    WHERE investor_id = ${investorId}
      AND status != 'closed'
    ORDER BY created_at DESC
  `;

  if (activeFunds.length > 0) {
    return activeFunds.map(f => ({
      fund_id:    f.id,
      sectors:    f.sectors    ?? [],
      stages:     f.stages     ?? [],
      geography:  f.geography  ?? [],
      deal_types: f.deal_types ?? [],
      size_min:   f.deal_size_min,
      size_max:   f.deal_size_max,
    }));
  }

  // Fall back to general investor profile
  const [profile] = await sql`
    SELECT sectors, stages, geography, deal_types, ticket_min, ticket_max
    FROM investor_profiles
    WHERE user_id = ${investorId}
  `;
  if (!profile) return [];

  return [{
    fund_id:    null,
    sectors:    profile.sectors    ?? [],
    stages:     profile.stages     ?? [],
    geography:  profile.geography  ?? [],
    deal_types: profile.deal_types ?? [],
    size_min:   profile.ticket_min,
    size_max:   profile.ticket_max,
  }];
}

/**
 * Load all active fundraise rounds together with their company's profile.
 */
async function getActiveRoundsWithCompanies() {
  return await sql`
    SELECT
      r.id            AS round_id,
      r.raise_amount,
      r.investment_types,
      r.min_ticket,
      r.company_id,
      cp.sector,
      cp.stage,
      cp.country
    FROM fundraise_rounds r
    JOIN company_profiles cp ON cp.user_id = r.company_id
    WHERE r.status IN ('open', 'closing')
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recompute all matches for a single fundraise round.
 * Called after POST /api/raises or PUT /api/raises/:id.
 */
export async function computeMatchesForRound(roundId) {
  try {
    // Load the round
    const [round] = await sql`
      SELECT
        r.id, r.company_id, r.raise_amount, r.investment_types, r.min_ticket,
        cp.sector, cp.stage, cp.country
      FROM fundraise_rounds r
      JOIN company_profiles cp ON cp.user_id = r.company_id
      WHERE r.id = ${roundId}
    `;
    if (!round) return;

    // Abort early if round is closed (no matching needed)
    const [roundStatus] = await sql`SELECT status FROM fundraise_rounds WHERE id = ${roundId}`;
    if (roundStatus?.status === 'closed') {
      await sql`DELETE FROM matches WHERE raise_round_id = ${roundId}`;
      return;
    }

    const company = { sector: round.sector, stage: round.stage, country: round.country };
    const roundData = {
      raise_amount:     round.raise_amount,
      investment_types: round.investment_types ?? [],
      min_ticket:       round.min_ticket,
    };

    // Load all investors
    const investors = await sql`SELECT id FROM users WHERE role = 'investor'`;

    // Delete stale matches for this round
    await sql`DELETE FROM matches WHERE raise_round_id = ${roundId}`;

    // Compute and collect new matches
    const toInsert = [];
    for (const investor of investors) {
      const mandates = await getInvestorMandates(investor.id);
      for (const mandate of mandates) {
        const result = scoreMatch({ company, round: roundData, mandate });
        if (result) {
          toInsert.push({
            raise_round_id: roundId,
            fund_id:        mandate.fund_id,
            company_id:     round.company_id,
            investor_id:    investor.id,
            score:          result.score,
            match_reasons:  result.match_reasons,
            match_type:     result.match_type,
          });
        }
      }
    }

    // Batch insert
    if (toInsert.length > 0) {
      for (const m of toInsert) {
        await sql`
          INSERT INTO matches (raise_round_id, fund_id, company_id, investor_id, score, match_reasons, match_type)
          VALUES (
            ${m.raise_round_id}, ${m.fund_id}, ${m.company_id}, ${m.investor_id},
            ${m.score}, ${m.match_reasons}, ${m.match_type}
          )
        `;
      }
    }

    console.log(`[matching] Round ${roundId}: ${toInsert.length} match(es) computed`);
  } catch (err) {
    console.error('[matching] computeMatchesForRound error:', err.message);
  }
}

/**
 * Recompute all matches for all rounds for a given investor.
 * Called after POST/PUT/DELETE /api/funds.
 */
export async function computeMatchesForInvestor(investorId) {
  try {
    // Delete all existing matches for this investor
    await sql`DELETE FROM matches WHERE investor_id = ${investorId}`;

    // Get this investor's current mandates
    const mandates = await getInvestorMandates(investorId);
    if (mandates.length === 0) return; // no profile or funds → nothing to match

    // Load all active rounds + company profiles
    const activeRounds = await getActiveRoundsWithCompanies();
    if (activeRounds.length === 0) return;

    const toInsert = [];
    for (const row of activeRounds) {
      const company  = { sector: row.sector,  stage: row.stage,  country: row.country };
      const roundData = {
        raise_amount:     row.raise_amount,
        investment_types: row.investment_types ?? [],
        min_ticket:       row.min_ticket,
      };

      for (const mandate of mandates) {
        const result = scoreMatch({ company, round: roundData, mandate });
        if (result) {
          toInsert.push({
            raise_round_id: row.round_id,
            fund_id:        mandate.fund_id,
            company_id:     row.company_id,
            investor_id:    investorId,
            score:          result.score,
            match_reasons:  result.match_reasons,
            match_type:     result.match_type,
          });
        }
      }
    }

    if (toInsert.length > 0) {
      for (const m of toInsert) {
        await sql`
          INSERT INTO matches (raise_round_id, fund_id, company_id, investor_id, score, match_reasons, match_type)
          VALUES (
            ${m.raise_round_id}, ${m.fund_id}, ${m.company_id}, ${m.investor_id},
            ${m.score}, ${m.match_reasons}, ${m.match_type}
          )
        `;
      }
    }

    console.log(`[matching] Investor ${investorId}: ${toInsert.length} match(es) computed`);
  } catch (err) {
    console.error('[matching] computeMatchesForInvestor error:', err.message);
  }
}
