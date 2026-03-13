/**
 * Matching Compute — DB orchestration layer.
 *
 * Two public entry points:
 *   computeMatchesForRound(roundId)    — called after a raise round is saved
 *   computeMatchesForInvestor(investorId) — called after a fund is saved/closed
 *
 * Strategy (Option C — event-driven, DB-cached):
 *   • Delete stale matches for the affected entity (preserving deals)
 *   • Recompute and upsert fresh matches
 *   • Errors are caught and logged; never propagate to the caller's response
 *
 * Bug #1:  DELETE + INSERT now wrapped in sql.transaction() for atomicity
 * Bug #13: Investor mandates preloaded in bulk (no N+1 queries)
 */

import sql from '../db/index.js';
import { scoreMatch } from './engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preload all investor funds and profiles in bulk, then return a function
 * that can retrieve mandates for any investor synchronously.
 */
async function buildMandateLookup() {
  // Bug #13: Single bulk queries instead of per-investor queries
  const allFunds = await sql`
    SELECT investor_id, id, sectors, stages, geography, deal_types, deal_size_min, deal_size_max
    FROM funds
    WHERE status != 'closed'
    ORDER BY created_at DESC
  `;

  const allProfiles = await sql`
    SELECT user_id, sectors, stages, geography, deal_types, ticket_min, ticket_max
    FROM investor_profiles
  `;

  // Build lookup maps
  const fundsByInvestor = {};
  for (const f of allFunds) {
    (fundsByInvestor[f.investor_id] ??= []).push(f);
  }
  const profilesByUser = {};
  for (const p of allProfiles) {
    profilesByUser[p.user_id] = p;
  }

  return function getMandates(investorId) {
    const funds = fundsByInvestor[investorId];
    if (funds?.length > 0) {
      return funds.map(f => ({
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
    const profile = profilesByUser[investorId];
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
  };
}

/**
 * Build a list of mandate objects for a single investor (used by computeMatchesForInvestor
 * where we only need one investor's mandates and can skip bulk loading).
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
    // Load the round + status in a single query
    const [round] = await sql`
      SELECT
        r.id, r.company_id, r.raise_amount, r.investment_types, r.min_ticket, r.status,
        cp.sector, cp.stage, cp.country
      FROM fundraise_rounds r
      JOIN company_profiles cp ON cp.user_id = r.company_id
      WHERE r.id = ${roundId}
    `;
    if (!round) return;

    // Abort early if round is closed (no matching needed)
    if (round.status === 'closed') {
      // Only remove matches without deals (preserve completed/declined)
      await sql`DELETE FROM matches WHERE raise_round_id = ${roundId} AND deal_status IS NULL`;
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

    // Bug #13: Build mandate lookup in bulk
    const getMandates = await buildMandateLookup();

    // Compute new matches
    const toInsert = [];
    for (const investor of investors) {
      const mandates = getMandates(investor.id);
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

    // Bug #1: Atomic DELETE + INSERT using transaction (preserves deals)
    const queries = [
      sql`DELETE FROM matches WHERE raise_round_id = ${roundId} AND deal_status IS NULL`,
    ];
    for (const m of toInsert) {
      queries.push(sql`
        INSERT INTO matches (raise_round_id, fund_id, company_id, investor_id, score, match_reasons, match_type)
        VALUES (
          ${m.raise_round_id}, ${m.fund_id}, ${m.company_id}, ${m.investor_id},
          ${m.score}, ${m.match_reasons}, ${m.match_type}
        )
      `);
    }

    if (queries.length === 1 && toInsert.length === 0) {
      // Only the DELETE — just run it directly
      await queries[0];
    } else {
      await sql.transaction(queries);
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
    // Get this investor's current mandates
    const mandates = await getInvestorMandates(investorId);

    if (mandates.length === 0) {
      // No mandates, delete non-deal matches only
      await sql`DELETE FROM matches WHERE investor_id = ${investorId} AND deal_status IS NULL`;
      return;
    }

    // Load all active rounds + company profiles
    const activeRounds = await getActiveRoundsWithCompanies();

    if (activeRounds.length === 0) {
      await sql`DELETE FROM matches WHERE investor_id = ${investorId} AND deal_status IS NULL`;
      return;
    }

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

    // Bug #1: Atomic DELETE + INSERT using transaction (preserves deals)
    const queries = [
      sql`DELETE FROM matches WHERE investor_id = ${investorId} AND deal_status IS NULL`,
    ];
    for (const m of toInsert) {
      queries.push(sql`
        INSERT INTO matches (raise_round_id, fund_id, company_id, investor_id, score, match_reasons, match_type)
        VALUES (
          ${m.raise_round_id}, ${m.fund_id}, ${m.company_id}, ${m.investor_id},
          ${m.score}, ${m.match_reasons}, ${m.match_type}
        )
      `);
    }

    if (queries.length === 1 && toInsert.length === 0) {
      await queries[0];
    } else {
      await sql.transaction(queries);
    }

    console.log(`[matching] Investor ${investorId}: ${toInsert.length} match(es) computed`);
  } catch (err) {
    console.error('[matching] computeMatchesForInvestor error:', err.message);
  }
}
