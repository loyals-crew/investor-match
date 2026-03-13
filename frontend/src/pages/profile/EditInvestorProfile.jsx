import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SECTOR_OPTIONS = ['Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'SaaS', 'DeepTech', 'Agritech', 'Cleantech', 'Logistics', 'Media & Entertainment', 'Real Estate', 'Consumer', 'Other'];
const STAGE_OPTIONS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Pre-IPO'];
const GEO_OPTIONS = ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Southeast Asia (all)', 'South Asia', 'Global'];
const DEAL_OPTIONS = ['Equity', 'Convertible Note', 'SAFE', 'Debt / Revenue-based', 'Grant Co-investment'];

function MultiSelect({ options, selected, onChange }) {
  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)} style={{
            padding: '0.45rem 0.9rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            border: active ? '2px solid #7c3aed' : '2px solid #e5e7eb',
            background: active ? '#f5f3ff' : '#f9fafb',
            color: active ? '#7c3aed' : '#6b7280',
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function EditInvestorProfile() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firm_name: '',
    contact_name: '',
    website: '',
    bio: '',
    sectors: [],
    stages: [],
    geography: [],
    ticket_min: '',
    ticket_max: '',
    deal_types: [],
  });

  useEffect(() => {
    fetch('/api/investors/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const p = data.profile;
          setForm({
            firm_name: p.firm_name || '',
            contact_name: p.contact_name || '',
            website: p.website || '',
            bio: p.bio || '',
            sectors: p.sectors || [],
            stages: p.stages || [],
            geography: p.geography || [],
            ticket_min: p.ticket_min ? String(p.ticket_min / 1000) : '',
            ticket_max: p.ticket_max ? String(p.ticket_max / 1000) : '',
            deal_types: p.deal_types || [],
          });
        }
      })
      .catch(() => setLoadError('Failed to load profile'))
      .finally(() => setFetching(false));
  }, [token]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setSaveSuccess(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);

    if (!form.firm_name.trim()) return setSaveError('Firm name is required');
    if (!form.contact_name.trim()) return setSaveError('Contact name is required');
    if (form.sectors.length === 0) return setSaveError('Select at least one sector');
    if (form.stages.length === 0) return setSaveError('Select at least one investment stage');
    if (form.geography.length === 0) return setSaveError('Select at least one geography');
    if (!form.ticket_min || !form.ticket_max) return setSaveError('Ticket size range is required');
    if (Number(form.ticket_min) >= Number(form.ticket_max)) return setSaveError('Minimum ticket must be less than maximum');
    if (form.deal_types.length === 0) return setSaveError('Select at least one deal type');

    setSaving(true);
    try {
      const res = await fetch('/api/investors/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          ticket_min: Number(form.ticket_min) * 1000,
          ticket_max: Number(form.ticket_max) * 1000,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setSaveError(data.error || 'Failed to save');
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (fetching) return <div style={styles.loadingPage}>Loading profile...</div>;

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>InvestorMatch</span>
        <Link to="/dashboard/investor" style={styles.backLink}>← Back to Dashboard</Link>
      </nav>

      <main style={styles.main}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Edit Investor Profile</h1>
          <p style={styles.sub}>Update your mandate and preferences. Changes take effect immediately for matching.</p>
        </div>

        {loadError && <div style={styles.errorBanner}>{loadError}</div>}

        {saveSuccess && (
          <div style={styles.successBanner}>
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Section: Basic Info */}
          <Section title="Basic Information" desc="Your firm and contact details.">
            <div style={styles.twoCol}>
              <Field label="Firm / Fund Name *">
                <input style={styles.input} value={form.firm_name} onChange={e => update('firm_name', e.target.value)} placeholder="e.g. Acme Ventures" />
              </Field>
              <Field label="Your Name *">
                <input style={styles.input} value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="e.g. Jane Doe" />
              </Field>
            </div>
            <Field label="Website">
              <input style={styles.input} value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://yourfirm.com" />
            </Field>
            <Field label="Bio">
              <textarea style={{ ...styles.input, minHeight: 90, resize: 'vertical' }} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Brief description of your fund's focus..." />
            </Field>
          </Section>

          {/* Section: Mandate */}
          <Section title="Investment Mandate" desc="Define the types of companies you invest in. This drives your matches.">
            <Field label="Sectors of Interest *">
              <MultiSelect options={SECTOR_OPTIONS} selected={form.sectors} onChange={v => update('sectors', v)} />
            </Field>
            <Field label="Investment Stages *">
              <MultiSelect options={STAGE_OPTIONS} selected={form.stages} onChange={v => update('stages', v)} />
            </Field>
            <Field label="Target Geography *">
              <MultiSelect options={GEO_OPTIONS} selected={form.geography} onChange={v => update('geography', v)} />
            </Field>
          </Section>

          {/* Section: Ticket Size */}
          <Section title="Ticket Size" desc="Your typical investment range in USD thousands.">
            <div style={styles.twoCol}>
              <Field label="Minimum (USD k) *">
                <input type="number" min="0" style={styles.input} value={form.ticket_min} onChange={e => update('ticket_min', e.target.value)} placeholder="e.g. 100" />
              </Field>
              <Field label="Maximum (USD k) *">
                <input type="number" min="0" style={styles.input} value={form.ticket_max} onChange={e => update('ticket_max', e.target.value)} placeholder="e.g. 2000" />
              </Field>
            </div>
            {form.ticket_min && form.ticket_max && Number(form.ticket_min) < Number(form.ticket_max) && (
              <div style={styles.rangePreview}>
                Range: <strong>${Number(form.ticket_min).toLocaleString()}k – ${Number(form.ticket_max).toLocaleString()}k USD</strong>
              </div>
            )}
          </Section>

          {/* Section: Deal Types */}
          <Section title="Deal Preferences" desc="Investment instruments you work with.">
            <Field label="Deal Types *">
              <MultiSelect options={DEAL_OPTIONS} selected={form.deal_types} onChange={v => update('deal_types', v)} />
            </Field>
          </Section>

          {saveError && <div style={styles.errorBanner}>{saveError}</div>}

          <div style={styles.footer}>
            <Link to="/dashboard/investor" style={styles.cancelBtn}>Cancel</Link>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Section({ title, desc, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.sectionDesc}>{desc}</p>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  loadingPage: { padding: '4rem', textAlign: 'center', color: '#6b7280' },
  page: { minHeight: '100vh', background: '#f8f9fb' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#7c3aed' },
  backLink: { fontSize: '0.875rem', color: '#7c3aed', fontWeight: 500 },
  main: { maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' },
  pageHeader: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.35rem' },
  sub: { fontSize: '0.9rem', color: '#6b7280' },
  section: { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', marginBottom: '1.25rem', overflow: 'hidden' },
  sectionHeader: { padding: '1.25rem 1.75rem', borderBottom: '1px solid #f3f4f6', background: '#fafafa' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '0.2rem' },
  sectionDesc: { fontSize: '0.82rem', color: '#9ca3af' },
  sectionBody: { padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  field: {},
  fieldLabel: { display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' },
  input: { width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', color: '#1a1a2e', outline: 'none', background: '#fff' },
  rangePreview: { padding: '0.65rem 1rem', background: '#f5f3ff', borderRadius: 8, fontSize: '0.875rem', color: '#5b21b6' },
  errorBanner: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1.25rem' },
  successBanner: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1.25rem' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' },
  cancelBtn: { padding: '0.65rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, color: '#374151', fontWeight: 500, fontSize: '0.9rem', display: 'inline-block' },
  saveBtn: { padding: '0.65rem 1.5rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem' },
};
