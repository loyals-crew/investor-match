import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ─── Options ─── */
const SECTOR_OPTIONS    = ['Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'SaaS', 'DeepTech', 'Agritech', 'Cleantech', 'Logistics', 'Media & Entertainment', 'Real Estate', 'Consumer', 'Other'];
const STAGE_OPTIONS     = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Pre-IPO'];
const COUNTRY_OPTIONS   = ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'India', 'Australia', 'United States', 'United Kingdom', 'Other'];
const BIZ_MODEL_OPTIONS = ['B2B SaaS', 'B2C', 'B2B2C', 'Marketplace', 'D2C', 'Enterprise', 'Hardware', 'Other'];
const ROLE_OPTIONS      = ['Founder / CEO', 'Co-Founder', 'CTO', 'CFO', 'COO', 'Head of BD', 'Other'];
const LEGAL_OPTIONS     = ['Sole Proprietor', 'Sdn. Bhd.', 'Pte. Ltd.', 'Corp. / Inc.', 'LLC', 'Partnership', 'Other'];
const TEAM_OPTIONS      = ['1 – 10', '11 – 50', '51 – 200', '201 – 500', '500+'];

export default function EditCompanyProfile() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  /* Load existing profile */
  useEffect(() => {
    fetch('/api/companies/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const p = d.profile || {};
        setForm({
          company_name:        p.company_name        || '',
          contact_name:        p.contact_name        || '',
          contact_role:        p.contact_role        || '',
          country:             p.country             || '',
          legal_type:          p.legal_type          || '',
          registration_date:   p.registration_date   ? p.registration_date.split('T')[0] : '',
          website:             p.website             || '',
          sector:              p.sector              || '',
          stage:               p.stage               || '',
          business_model:      p.business_model      || '',
          team_size:           p.team_size           || '',
          one_liner:           p.one_liner           || '',
          description:         p.description         || '',
          revenue_status:      p.revenue_status      || '',
          annual_revenue:      p.annual_revenue      ? String(p.annual_revenue / 1000)   : '',
          mrr:                 p.mrr                 ? String(p.mrr / 1000)              : '',
          is_profitable:       p.is_profitable       ?? null,
          has_previous_funding: p.has_previous_funding ?? null,
          previous_funding:    p.previous_funding    ? String(p.previous_funding / 1000) : '',
          target_market:       p.target_market       || '',
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSave() {
    if (!form.company_name.trim()) return setError('Company name is required');
    if (!form.contact_name.trim()) return setError('Contact name is required');
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const body = {
        ...form,
        annual_revenue:   form.annual_revenue   ? Math.round(Number(form.annual_revenue) * 1000)   : null,
        mrr:              form.mrr              ? Math.round(Number(form.mrr) * 1000)              : null,
        previous_funding: form.previous_funding ? Math.round(Number(form.previous_funding) * 1000) : null,
      };
      const res  = await fetch('/api/companies/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to save');
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!form)   return null;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.logo}>InvestorMatch</span>
        <Link to="/dashboard/company" style={S.back}>← Back to Dashboard</Link>
      </nav>

      <main style={S.main}>
        <div style={S.pageHeader}>
          <h1 style={S.title}>Edit Company Profile</h1>
          <p style={S.sub}>Keep your profile up to date to improve investor matching.</p>
        </div>

        {success && (
          <div style={S.successBanner}>
            ✓ Profile saved successfully!
            <button style={S.successClose} onClick={() => setSuccess(false)}>×</button>
          </div>
        )}
        {error && <div style={S.errorBanner}>{error}</div>}

        {/* ── Section 1: Company Identity ── */}
        <Card title="Company Identity">
          <Row2>
            <Field label="Company Name *">
              <input style={S.input} value={form.company_name} onChange={e => update('company_name', e.target.value)} placeholder="Acme Technologies Sdn. Bhd." />
            </Field>
            <Field label="Country">
              <Dropdown options={COUNTRY_OPTIONS} value={form.country} onChange={v => update('country', v)} placeholder="Select country..." />
            </Field>
          </Row2>

          <Row2>
            <Field label="Contact Name *">
              <input style={S.input} value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="e.g. Ahmad Farid" />
            </Field>
            <Field label="Your Role">
              <Dropdown options={ROLE_OPTIONS} value={form.contact_role} onChange={v => update('contact_role', v)} placeholder="Select role..." />
            </Field>
          </Row2>

          <Row2>
            <Field label="Legal Entity Type">
              <Dropdown options={LEGAL_OPTIONS} value={form.legal_type} onChange={v => update('legal_type', v)} placeholder="Select type..." />
            </Field>
            <Field label="Registration Date">
              <input type="date" style={S.input} value={form.registration_date} onChange={e => update('registration_date', e.target.value)} />
            </Field>
          </Row2>

          <Field label="Website">
            <input style={S.input} value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://yourcompany.com" />
          </Field>
        </Card>

        {/* ── Section 2: Business Profile ── */}
        <Card title="Business Profile">
          <Row2>
            <Field label="Sector">
              <Dropdown options={SECTOR_OPTIONS} value={form.sector} onChange={v => update('sector', v)} placeholder="Select sector..." />
            </Field>
            <Field label="Current Stage">
              <Dropdown options={STAGE_OPTIONS} value={form.stage} onChange={v => update('stage', v)} placeholder="Select stage..." />
            </Field>
          </Row2>

          <Row2>
            <Field label="Business Model">
              <Dropdown options={BIZ_MODEL_OPTIONS} value={form.business_model} onChange={v => update('business_model', v)} placeholder="Select model..." />
            </Field>
            <Field label="Team Size">
              <PillSelect options={TEAM_OPTIONS} value={form.team_size} onChange={v => update('team_size', v)} />
            </Field>
          </Row2>

          <Field label="One-Line Pitch">
            <div style={{ position: 'relative' }}>
              <input style={S.input} maxLength={140} value={form.one_liner}
                onChange={e => update('one_liner', e.target.value)}
                placeholder="In one sentence, what does your company do?" />
              <span style={S.charCount}>{(form.one_liner || '').length}/140</span>
            </div>
          </Field>

          <Field label="Company Description">
            <textarea style={{ ...S.input, minHeight: 120, resize: 'vertical' }}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Describe your company, the problem you solve, your target market, and key traction..." />
          </Field>
        </Card>

        {/* ── Section 3: Traction & Financials ── */}
        <Card title="Traction & Financials">
          <Field label="Revenue Status">
            <div style={S.pillRow}>
              {[
                { value: 'pre_revenue', label: '🌱 Pre-Revenue',         desc: 'Not yet generating revenue' },
                { value: 'generating',  label: '📈 Revenue Generating',  desc: 'Earning from customers' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  style={{ ...S.bigPill, ...(form.revenue_status === opt.value ? S.bigPillActive : {}) }}
                  onClick={() => update('revenue_status', opt.value)}
                >
                  <span style={S.bigPillLabel}>{opt.label}</span>
                  <span style={S.bigPillDesc}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </Field>

          {form.revenue_status === 'generating' && (
            <Row2>
              <Field label="Annual Revenue (USD k)">
                <div style={S.inputWrap}>
                  <span style={S.prefix}>$</span>
                  <input type="number" min="0" style={{ ...S.input, paddingLeft: '1.75rem' }}
                    value={form.annual_revenue} onChange={e => update('annual_revenue', e.target.value)} placeholder="e.g. 500" />
                  <span style={S.suffix}>k</span>
                </div>
                {form.annual_revenue && <div style={S.hint}>= ${(Number(form.annual_revenue) * 1000).toLocaleString()} USD/yr</div>}
              </Field>
              <Field label="Monthly Recurring Revenue (USD k)">
                <div style={S.inputWrap}>
                  <span style={S.prefix}>$</span>
                  <input type="number" min="0" style={{ ...S.input, paddingLeft: '1.75rem' }}
                    value={form.mrr} onChange={e => update('mrr', e.target.value)} placeholder="e.g. 42" />
                  <span style={S.suffix}>k</span>
                </div>
                {form.mrr && <div style={S.hint}>= ${(Number(form.mrr) * 1000).toLocaleString()} USD/mo</div>}
              </Field>
            </Row2>
          )}

          <Row2>
            <Field label="Is the company profitable?">
              <BoolToggle value={form.is_profitable} onChange={v => update('is_profitable', v)} />
            </Field>
            <Field label="Have you raised funding before?">
              <BoolToggle value={form.has_previous_funding} onChange={v => update('has_previous_funding', v)} />
            </Field>
          </Row2>

          {form.has_previous_funding === true && (
            <Field label="Total Previously Raised (USD k)">
              <div style={S.inputWrap}>
                <span style={S.prefix}>$</span>
                <input type="number" min="0" style={{ ...S.input, paddingLeft: '1.75rem' }}
                  value={form.previous_funding} onChange={e => update('previous_funding', e.target.value)} placeholder="e.g. 1000" />
                <span style={S.suffix}>k</span>
              </div>
              {form.previous_funding && <div style={S.hint}>= ${(Number(form.previous_funding) * 1000).toLocaleString()} USD raised total</div>}
            </Field>
          )}

          <Field label="Target Market">
            <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
              value={form.target_market}
              onChange={e => update('target_market', e.target.value)}
              placeholder="Who are your customers? e.g. SMEs in Southeast Asia, B2B SaaS companies with >50 employees..." />
          </Field>
        </Card>

        {/* Actions */}
        <div style={S.actions}>
          <Link to="/dashboard/company" style={S.cancelBtn}>Cancel</Link>
          <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function Card({ title, children }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function Row2({ children }) {
  return <div style={S.twoCol}>{children}</div>;
}

function Dropdown({ options, value, onChange, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...S.input, color: value ? '#1a1a2e' : '#9ca3af' }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)} style={{
          padding: '0.4rem 0.8rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
          border: value === opt ? '2px solid #059669' : '2px solid #e5e7eb',
          background: value === opt ? '#f0fdf4' : '#f9fafb',
          color: value === opt ? '#065f46' : '#6b7280',
        }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function BoolToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
        <button key={label} type="button" onClick={() => onChange(v)} style={{
          flex: 1, padding: '0.6rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
          border: value === v ? '2px solid #059669' : '2px solid #e5e7eb',
          background: value === v ? '#f0fdf4' : '#f9fafb',
          color: value === v ? '#065f46' : '#6b7280',
        }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
      <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Loading profile…</p>
    </div>
  );
}

/* ─── Styles ─── */
const S = {
  page: { minHeight: '100vh', background: '#f8f9fb' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#059669' },
  back: { fontSize: '0.875rem', color: '#059669', fontWeight: 500 },
  main: { maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' },
  pageHeader: { marginBottom: '1.75rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.35rem' },
  sub: { fontSize: '0.9rem', color: '#6b7280' },
  successBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 500, marginBottom: '1.5rem' },
  successClose: { background: 'none', border: 'none', color: '#166534', fontSize: '1.1rem', cursor: 'pointer', padding: 0 },
  errorBanner: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1.5rem' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '1.5rem', marginBottom: '1.25rem' },
  cardTitle: { fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  fieldLabel: { display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' },
  input: { width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', color: '#1a1a2e', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  inputWrap: { position: 'relative' },
  prefix: { position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.85rem', pointerEvents: 'none' },
  suffix: { position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 500, pointerEvents: 'none' },
  hint: { marginTop: '0.3rem', fontSize: '0.78rem', color: '#9ca3af' },
  charCount: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#d1d5db', pointerEvents: 'none' },
  pillRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  bigPill: { flex: 1, minWidth: 180, padding: '0.85rem 1rem', border: '2px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  bigPillActive: { border: '2px solid #059669', background: '#f0fdf4' },
  bigPillLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' },
  bigPillDesc: { fontSize: '0.78rem', color: '#6b7280' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' },
  cancelBtn: { padding: '0.65rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.9rem' },
  saveBtn: { padding: '0.65rem 1.75rem', border: 'none', borderRadius: 8, background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
};
