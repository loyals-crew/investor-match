import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Basic Info', 'Investment Mandate', 'Ticket Size', 'Deal Preferences', 'Review'];
const TOTAL = STEPS.length;

const SECTOR_OPTIONS = ['Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'SaaS', 'DeepTech', 'Agritech', 'Cleantech', 'Logistics', 'Media & Entertainment', 'Real Estate', 'Consumer', 'Other'];
const STAGE_OPTIONS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Pre-IPO'];
const GEO_OPTIONS = ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Southeast Asia (all)', 'South Asia', 'Global'];
const DEAL_OPTIONS = ['Equity', 'Convertible Note', 'SAFE', 'Debt / Revenue-based', 'Grant Co-investment'];

function MultiSelect({ options, selected, onChange, color = '#7c3aed' }) {
  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: 999,
            border: selected.includes(opt) ? `2px solid ${color}` : '2px solid #e5e7eb',
            background: selected.includes(opt) ? `${color}15` : '#f9fafb',
            color: selected.includes(opt) ? color : '#6b7280',
            fontWeight: 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function InvestorOnboarding() {
  const { token, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function next() {
    setError('');
    if (step === 0 && !form.firm_name.trim()) return setError('Firm name is required');
    if (step === 0 && !form.contact_name.trim()) return setError('Contact name is required');
    if (step === 1 && form.sectors.length === 0) return setError('Select at least one sector');
    if (step === 1 && form.stages.length === 0) return setError('Select at least one stage');
    if (step === 1 && form.geography.length === 0) return setError('Select at least one geography');
    if (step === 2 && (!form.ticket_min || !form.ticket_max)) return setError('Please enter your ticket size range');
    if (step === 3 && form.deal_types.length === 0) return setError('Select at least one deal type');
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        ticket_min: Number(form.ticket_min) * 1000,
        ticket_max: Number(form.ticket_max) * 1000,
      };
      const res = await fetch('/api/investors/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to save profile');

      setUser(u => ({ ...u, onboarding_completed: true }));
      navigate('/dashboard/investor');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const progress = ((step) / (TOTAL - 1)) * 100;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.logo}>InvestorMatch</span>
          <span style={styles.stepLabel}>Step {step + 1} of {TOTAL}</span>
        </div>

        {/* Progress bar */}
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>

        {/* Step indicators */}
        <div style={styles.stepRow}>
          {STEPS.map((s, i) => (
            <div key={s} style={styles.stepItem}>
              <div style={{
                ...styles.stepDot,
                background: i < step ? '#7c3aed' : i === step ? '#7c3aed' : '#e5e7eb',
                color: i <= step ? '#fff' : '#9ca3af',
                border: i === step ? '2px solid #7c3aed' : 'none',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ ...styles.stepName, color: i === step ? '#7c3aed' : '#9ca3af' }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={styles.content}>
          {step === 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Basic Information</h2>
              <p style={styles.sectionSub}>Tell us about yourself and your firm.</p>
              <Field label="Firm / Fund Name *">
                <input style={styles.input} value={form.firm_name} onChange={e => update('firm_name', e.target.value)} placeholder="e.g. Acme Ventures" />
              </Field>
              <Field label="Your Name *">
                <input style={styles.input} value={form.contact_name} onChange={e => update('contact_name', e.target.value)} placeholder="e.g. Jane Doe" />
              </Field>
              <Field label="Website">
                <input style={styles.input} value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://yourfirm.com" />
              </Field>
              <Field label="Short Bio">
                <textarea style={{ ...styles.input, minHeight: 90, resize: 'vertical' }} value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Briefly describe your fund's focus and background..." />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Investment Mandate</h2>
              <p style={styles.sectionSub}>Define what you're looking for. This powers your matching.</p>
              <Field label="Sectors of Interest *">
                <MultiSelect options={SECTOR_OPTIONS} selected={form.sectors} onChange={v => update('sectors', v)} />
              </Field>
              <Field label="Investment Stages *">
                <MultiSelect options={STAGE_OPTIONS} selected={form.stages} onChange={v => update('stages', v)} />
              </Field>
              <Field label="Target Geography *">
                <MultiSelect options={GEO_OPTIONS} selected={form.geography} onChange={v => update('geography', v)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Ticket Size</h2>
              <p style={styles.sectionSub}>What's your typical investment range? (in USD thousands)</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <Field label="Minimum (USD k) *" style={{ flex: 1 }}>
                  <input type="number" min="0" style={styles.input} value={form.ticket_min} onChange={e => update('ticket_min', e.target.value)} placeholder="e.g. 100" />
                </Field>
                <Field label="Maximum (USD k) *" style={{ flex: 1 }}>
                  <input type="number" min="0" style={styles.input} value={form.ticket_max} onChange={e => update('ticket_max', e.target.value)} placeholder="e.g. 2000" />
                </Field>
              </div>
              {form.ticket_min && form.ticket_max && (
                <div style={styles.ticketPreview}>
                  Ticket range: <strong>${Number(form.ticket_min).toLocaleString()}k – ${Number(form.ticket_max).toLocaleString()}k</strong>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Deal Preferences</h2>
              <p style={styles.sectionSub}>What types of instruments do you invest through?</p>
              <Field label="Deal Types *">
                <MultiSelect options={DEAL_OPTIONS} selected={form.deal_types} onChange={v => update('deal_types', v)} />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Review Your Profile</h2>
              <p style={styles.sectionSub}>Confirm your details before submitting.</p>
              <ReviewRow label="Firm" value={form.firm_name} />
              <ReviewRow label="Contact" value={form.contact_name} />
              {form.website && <ReviewRow label="Website" value={form.website} />}
              <ReviewRow label="Sectors" value={form.sectors.join(', ')} />
              <ReviewRow label="Stages" value={form.stages.join(', ')} />
              <ReviewRow label="Geography" value={form.geography.join(', ')} />
              <ReviewRow label="Ticket Size" value={`$${Number(form.ticket_min).toLocaleString()}k – $${Number(form.ticket_max).toLocaleString()}k`} />
              <ReviewRow label="Deal Types" value={form.deal_types.join(', ')} />
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
        </div>

        {/* Footer nav */}
        <div style={styles.navRow}>
          {step > 0 ? (
            <button type="button" style={styles.btnBack} onClick={() => { setError(''); setStep(s => s - 1); }}>
              ← Back
            </button>
          ) : <span />}

          {step < TOTAL - 1 ? (
            <button type="button" style={styles.btnNext} onClick={next}>
              Continue →
            </button>
          ) : (
            <button type="button" style={styles.btnNext} onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Submit Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: '1.25rem', ...style }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '0.75rem 0', gap: '1rem' }}>
      <span style={{ width: 120, fontSize: '0.85rem', color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: '#1a1a2e', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f3f4f8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' },
  card: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '1px solid #f3f4f6' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#7c3aed' },
  stepLabel: { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 },
  progressTrack: { height: 3, background: '#f3f4f6' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', transition: 'width 0.4s ease' },
  stepRow: { display: 'flex', justifyContent: 'space-between', padding: '1.25rem 2rem', borderBottom: '1px solid #f3f4f6', overflowX: 'auto', gap: '0.5rem' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minWidth: 60 },
  stepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' },
  stepName: { fontSize: '0.7rem', fontWeight: 500, whiteSpace: 'nowrap' },
  content: { padding: '2rem' },
  section: {},
  sectionTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.35rem' },
  sectionSub: { fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.75rem' },
  input: { width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', color: '#1a1a2e', outline: 'none' },
  ticketPreview: { marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#f5f3ff', borderRadius: 8, fontSize: '0.875rem', color: '#5b21b6' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem', marginTop: '1rem' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderTop: '1px solid #f3f4f6' },
  btnBack: { padding: '0.65rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.9rem' },
  btnNext: { padding: '0.65rem 1.5rem', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: '0.9rem' },
};
