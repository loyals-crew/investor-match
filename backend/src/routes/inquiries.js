import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import sql from '../db/index.js';

const router = Router();

const VALID_INVESTOR_TYPES = ['meeting', 'pitch_deck', 'financials', 'question'];
const VALID_COMPANY_TYPES  = ['pitch_meeting', 'share_deck', 'share_traction', 'intro'];

// ── POST /api/inquiries — either role creates an inquiry ───────────────────

router.post('/', authenticate, async (req, res) => {
  const { raise_round_id, match_id, request_type, message } = req.body;

  if (!raise_round_id) {
    return res.status(400).json({ error: 'raise_round_id is required' });
  }

  const role = req.user.role;

  if (role === 'investor') {
    // ── Investor-initiated ──────────────────────────────────────────────────
    if (!VALID_INVESTOR_TYPES.includes(request_type)) {
      return res.status(400).json({ error: 'Invalid request_type for investor' });
    }

    try {
      const [round] = await sql`
        SELECT id, company_id, status FROM fundraise_rounds WHERE id = ${raise_round_id}
      `;
      if (!round) return res.status(404).json({ error: 'Round not found' });
      if (round.status === 'closed') {
        return res.status(400).json({ error: 'Cannot inquire about a closed round' });
      }

      const [existing] = await sql`
        SELECT id FROM inquiries
        WHERE investor_id   = ${req.user.id}
          AND raise_round_id = ${raise_round_id}
          AND request_type   = ${request_type}
          AND initiated_by   = 'investor'
          AND status        != 'passed'
      `;
      if (existing) {
        return res.status(409).json({
          error: 'You already have an open inquiry of this type for this round',
        });
      }

      const [inquiry] = await sql`
        INSERT INTO inquiries (
          match_id, raise_round_id, company_id, investor_id,
          request_type, message, initiated_by
        ) VALUES (
          ${match_id || null}, ${raise_round_id}, ${round.company_id},
          ${req.user.id}, ${request_type}, ${message?.trim() || null},
          'investor'
        )
        RETURNING *
      `;

      if (message?.trim()) {
        await sql`
          INSERT INTO inquiry_messages (inquiry_id, sender_id, body)
          VALUES (${inquiry.id}, ${req.user.id}, ${message.trim()})
        `;
      }

      return res.status(201).json({ inquiry });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create inquiry' });
    }

  } else if (role === 'company') {
    // ── Company-initiated ───────────────────────────────────────────────────
    const { investor_id } = req.body;
    if (!investor_id) {
      return res.status(400).json({ error: 'investor_id is required for company outreach' });
    }
    if (!VALID_COMPANY_TYPES.includes(request_type)) {
      return res.status(400).json({ error: 'Invalid request_type for company' });
    }

    try {
      // Verify the round belongs to this company
      const [round] = await sql`
        SELECT id, company_id, status FROM fundraise_rounds
        WHERE id = ${raise_round_id} AND company_id = ${req.user.id}
      `;
      if (!round) return res.status(404).json({ error: 'Round not found or access denied' });
      if (round.status === 'closed') {
        return res.status(400).json({ error: 'Cannot reach out for a closed round' });
      }

      const [existing] = await sql`
        SELECT id FROM inquiries
        WHERE company_id   = ${req.user.id}
          AND investor_id   = ${investor_id}
          AND raise_round_id = ${raise_round_id}
          AND request_type   = ${request_type}
          AND initiated_by   = 'company'
          AND status        != 'passed'
      `;
      if (existing) {
        return res.status(409).json({
          error: 'You already have an open outreach of this type for this investor',
        });
      }

      const [inquiry] = await sql`
        INSERT INTO inquiries (
          match_id, raise_round_id, company_id, investor_id,
          request_type, message, initiated_by
        ) VALUES (
          ${match_id || null}, ${raise_round_id}, ${req.user.id},
          ${investor_id}, ${request_type}, ${message?.trim() || null},
          'company'
        )
        RETURNING *
      `;

      if (message?.trim()) {
        await sql`
          INSERT INTO inquiry_messages (inquiry_id, sender_id, body)
          VALUES (${inquiry.id}, ${req.user.id}, ${message.trim()})
        `;
      }

      return res.status(201).json({ inquiry });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create outreach' });
    }

  } else {
    return res.status(403).json({ error: 'Access denied' });
  }
});

// ── GET /api/inquiries — role-aware list ────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'investor') {
      // Returns both inquiries this investor sent AND outreach companies sent to them
      const inquiries = await sql`
        SELECT
          i.*,
          r.round_name,
          cp.company_name,
          ip.firm_name    AS investor_firm,
          ip.contact_name AS investor_contact
        FROM inquiries i
        JOIN fundraise_rounds r  ON r.id = i.raise_round_id
        JOIN company_profiles cp ON cp.user_id = i.company_id
        JOIN investor_profiles ip ON ip.user_id = i.investor_id
        WHERE i.investor_id = ${req.user.id}
        ORDER BY i.created_at DESC
      `;
      return res.json({ inquiries });

    } else if (req.user.role === 'company') {
      // Returns both inquiries companies received AND outreach companies sent
      const inquiries = await sql`
        SELECT
          i.*,
          r.round_name,
          cp.company_name,
          ip.firm_name    AS investor_firm,
          ip.contact_name AS investor_contact
        FROM inquiries i
        JOIN fundraise_rounds r  ON r.id = i.raise_round_id
        JOIN company_profiles cp ON cp.user_id = i.company_id
        JOIN investor_profiles ip ON ip.user_id = i.investor_id
        WHERE i.company_id = ${req.user.id}
        ORDER BY i.created_at DESC
      `;
      return res.json({ inquiries });

    } else {
      return res.status(403).json({ error: 'Access denied' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// ── GET /api/inquiries/:id — single inquiry with message thread ─────────────

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [inquiry] = await sql`
      SELECT
        i.*,
        r.round_name,
        cp.company_name,
        ip.firm_name    AS investor_firm,
        ip.contact_name AS investor_contact
      FROM inquiries i
      JOIN fundraise_rounds r  ON r.id = i.raise_round_id
      JOIN company_profiles cp ON cp.user_id = i.company_id
      JOIN investor_profiles ip ON ip.user_id = i.investor_id
      WHERE i.id = ${req.params.id}
        AND (i.company_id = ${req.user.id} OR i.investor_id = ${req.user.id})
    `;
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });

    const messages = await sql`
      SELECT m.*, u.email AS sender_email
      FROM inquiry_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.inquiry_id = ${inquiry.id}
      ORDER BY m.created_at ASC
    `;

    return res.json({ inquiry, messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch inquiry' });
  }
});

// ── POST /api/inquiries/:id/messages — add a reply ─────────────────────────

router.post('/:id/messages', authenticate, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) {
    return res.status(400).json({ error: 'Message body is required' });
  }

  try {
    const [inquiry] = await sql`
      SELECT id, company_id, investor_id, status, initiated_by FROM inquiries
      WHERE id = ${req.params.id}
        AND (company_id = ${req.user.id} OR investor_id = ${req.user.id})
    `;
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.status === 'passed') {
      return res.status(400).json({ error: 'Cannot reply to a passed inquiry' });
    }

    const [msg] = await sql`
      INSERT INTO inquiry_messages (inquiry_id, sender_id, body)
      VALUES (${inquiry.id}, ${req.user.id}, ${body.trim()})
      RETURNING *
    `;

    // Auto-advance pending → responded when the RECIPIENT first replies
    // For investor-initiated: recipient is company
    // For company-initiated:  recipient is investor
    const recipientId =
      inquiry.initiated_by === 'company' ? inquiry.investor_id : inquiry.company_id;

    if (req.user.id === recipientId && inquiry.status === 'pending') {
      await sql`
        UPDATE inquiries SET status = 'responded', updated_at = NOW()
        WHERE id = ${inquiry.id}
      `;
    }

    return res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── PATCH /api/inquiries/:id/status — update status ───────────────────────

router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  if (!['responded', 'passed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "responded" or "passed".' });
  }

  try {
    const [inquiry] = await sql`
      SELECT id FROM inquiries
      WHERE id = ${req.params.id}
        AND (company_id = ${req.user.id} OR investor_id = ${req.user.id})
    `;
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });

    const [updated] = await sql`
      UPDATE inquiries SET status = ${status}, updated_at = NOW()
      WHERE id = ${inquiry.id}
      RETURNING *
    `;
    return res.json({ inquiry: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update inquiry status' });
  }
});

export default router;
