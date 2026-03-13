/**
 * Matching Engine — pure scoring logic (no DB access).
 *
 * scoreMatch({ company, round, mandate }) → { score, match_type, match_reasons } | null
 *
 * company  : row from company_profiles  { sector, stage, country }
 * round    : row from fundraise_rounds  { raise_amount, investment_types, min_ticket }
 * mandate  : normalised investor mandate {
 *              fund_id,        // null = from general profile
 *              sectors,        // string[]
 *              stages,         // string[]
 *              geography,      // string[]
 *              deal_types,     // string[]
 *              size_min,       // bigint | null
 *              size_max,       // bigint | null
 *            }
 */

// ── Scoring weights (total = 100) ──────────────────────────────────────────
const W = {
  sector:     25,
  stage:      25,
  geography:  20,
  dealType:   15,
  ticketSize: 15,
};

// Ordered stage ladder (used for adjacency check)
const STAGE_LADDER = [
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'growth',
  'pre-ipo',
];

// Country → array of regions it belongs to (for geography matching)
const COUNTRY_REGIONS = {
  // Southeast Asia
  Malaysia:    ['Malaysia', 'Southeast Asia', 'Asia', 'Global'],
  Singapore:   ['Singapore', 'Southeast Asia', 'Asia', 'Global'],
  Indonesia:   ['Indonesia', 'Southeast Asia', 'Asia', 'Global'],
  Thailand:    ['Thailand', 'Southeast Asia', 'Asia', 'Global'],
  Vietnam:     ['Vietnam', 'Southeast Asia', 'Asia', 'Global'],
  Philippines: ['Philippines', 'Southeast Asia', 'Asia', 'Global'],
  Myanmar:     ['Myanmar', 'Southeast Asia', 'Asia', 'Global'],
  Cambodia:    ['Cambodia', 'Southeast Asia', 'Asia', 'Global'],
  Laos:        ['Laos', 'Southeast Asia', 'Asia', 'Global'],
  Brunei:      ['Brunei', 'Southeast Asia', 'Asia', 'Global'],
  // East Asia
  China:       ['China', 'East Asia', 'Asia', 'Global'],
  Japan:       ['Japan', 'East Asia', 'Asia', 'Global'],
  'South Korea': ['South Korea', 'East Asia', 'Asia', 'Global'],
  Taiwan:      ['Taiwan', 'East Asia', 'Asia', 'Global'],
  'Hong Kong': ['Hong Kong', 'East Asia', 'Asia', 'Global'],
  // South Asia
  India:       ['India', 'South Asia', 'Asia', 'Global'],
  Bangladesh:  ['Bangladesh', 'South Asia', 'Asia', 'Global'],
  Pakistan:    ['Pakistan', 'South Asia', 'Asia', 'Global'],
  'Sri Lanka': ['Sri Lanka', 'South Asia', 'Asia', 'Global'],
  Nepal:       ['Nepal', 'South Asia', 'Asia', 'Global'],
  // North America
  'United States': ['United States', 'USA', 'North America', 'Global'],
  Canada:      ['Canada', 'North America', 'Global'],
  Mexico:      ['Mexico', 'Latin America', 'Global'],
  // Europe
  'United Kingdom': ['United Kingdom', 'UK', 'Europe', 'Global'],
  Germany:     ['Germany', 'Europe', 'Global'],
  France:      ['France', 'Europe', 'Global'],
  Netherlands: ['Netherlands', 'Europe', 'Global'],
  Sweden:      ['Sweden', 'Europe', 'Global'],
  Switzerland: ['Switzerland', 'Europe', 'Global'],
  Spain:       ['Spain', 'Europe', 'Global'],
  Italy:       ['Italy', 'Europe', 'Global'],
  // Oceania
  Australia:   ['Australia', 'Oceania', 'Global'],
  'New Zealand': ['New Zealand', 'Oceania', 'Global'],
  // Middle East
  UAE:         ['UAE', 'Middle East', 'Global'],
  'Saudi Arabia': ['Saudi Arabia', 'Middle East', 'Global'],
  Israel:      ['Israel', 'Middle East', 'Global'],
  // Africa
  Nigeria:     ['Nigeria', 'Africa', 'Sub-Saharan Africa', 'Global'],
  Kenya:       ['Kenya', 'Africa', 'Sub-Saharan Africa', 'Global'],
  'South Africa': ['South Africa', 'Africa', 'Sub-Saharan Africa', 'Global'],
  Egypt:       ['Egypt', 'Africa', 'North Africa', 'Global'],
  // Latin America
  Brazil:      ['Brazil', 'Latin America', 'Global'],
  Argentina:   ['Argentina', 'Latin America', 'Global'],
  Colombia:    ['Colombia', 'Latin America', 'Global'],
  Chile:       ['Chile', 'Latin America', 'Global'],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function normaliseStage(s) {
  if (!s) return null;
  return s.trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace('seriesa', 'series-a')
    .replace('seriesb', 'series-b')
    .replace('seriesc', 'series-c');
}

function geoRegions(country) {
  if (!country) return [];
  const key = country.trim();
  return COUNTRY_REGIONS[key] ?? [key, 'Global'];
}

// ── Main scorer ──────────────────────────────────────────────────────────────

/**
 * Returns a match result or null (if below minimum threshold / anchor check).
 */
export function scoreMatch({ company, round, mandate }) {
  let score = 0;
  const reasons = [];

  // ─ 1. Sector (25 pts) ────────────────────────────────────────────────────
  const companySector = (company.sector || '').toLowerCase().trim();
  const mandateSectors = (mandate.sectors ?? []).map(s => s.toLowerCase().trim());

  if (companySector && mandateSectors.length > 0) {
    if (mandateSectors.includes(companySector)) {
      score += W.sector;
      reasons.push('Sector match');
    }
  }

  // ─ 2. Stage (25 pts full / 15 pts adjacent) ──────────────────────────────
  const companyStage = normaliseStage(company.stage);
  const mandateStages = (mandate.stages ?? []).map(normaliseStage).filter(Boolean);

  if (companyStage && mandateStages.length > 0) {
    if (mandateStages.includes(companyStage)) {
      score += W.stage;
      reasons.push('Stage match');
    } else {
      const ci = STAGE_LADDER.indexOf(companyStage);
      const adjacent = ci >= 0 && mandateStages.some(ms => {
        const mi = STAGE_LADDER.indexOf(ms);
        return mi >= 0 && Math.abs(ci - mi) === 1;
      });
      if (adjacent) {
        score += 15; // partial
        reasons.push('Adjacent stage');
      }
    }
  }

  // ─ Anchor check: must have sector OR stage points ─────────────────────────
  const hasSectorPts = reasons.includes('Sector match');
  const hasStagePts  = reasons.includes('Stage match') || reasons.includes('Adjacent stage');
  if (!hasSectorPts && !hasStagePts) return null;

  // ─ 3. Geography (20 pts) ─────────────────────────────────────────────────
  const companyRegions = geoRegions(company.country);
  const mandateGeo = (mandate.geography ?? []).map(g => g.toLowerCase().trim());

  if (company.country && mandateGeo.length > 0) {
    const geoMatch = companyRegions.some(r => mandateGeo.includes(r.toLowerCase()));
    if (geoMatch) {
      score += W.geography;
      reasons.push('Geography match');
    }
  }

  // ─ 4. Deal type (15 pts) ─────────────────────────────────────────────────
  const roundTypes   = (round.investment_types ?? []).map(t => t.toLowerCase().trim());
  const mandateTypes = (mandate.deal_types ?? []).map(t => t.toLowerCase().trim());

  if (roundTypes.length > 0 && mandateTypes.length > 0) {
    const overlap = roundTypes.some(t => mandateTypes.includes(t));
    if (overlap) {
      score += W.dealType;
      reasons.push('Deal type match');
    }
  }

  // ─ 5. Ticket size (15 pts full / 8 pts within ±10%) ──────────────────────
  // Compare the company's minimum acceptable ticket against the investor's deal range
  const roundTicket = round.min_ticket ?? round.raise_amount;
  const sizeMin = mandate.size_min;
  const sizeMax = mandate.size_max;

  if (roundTicket && (sizeMin != null || sizeMax != null)) {
    const lo = sizeMin ?? 0;
    const hi = sizeMax ?? Infinity;
    if (roundTicket >= lo && roundTicket <= hi) {
      score += W.ticketSize;
      reasons.push('Ticket size match');
    } else if (roundTicket >= lo * 0.9 && roundTicket <= hi * 1.1) {
      score += 8; // partial — within ±10%
      reasons.push('Ticket size near match (±10%)');
    }
  }

  // ─ Minimum score threshold ────────────────────────────────────────────────
  if (score < 30) return null;

  const match_type = score >= 75 ? 'strong' : score >= 50 ? 'good' : 'possible';
  return { score, match_type, match_reasons: reasons };
}
