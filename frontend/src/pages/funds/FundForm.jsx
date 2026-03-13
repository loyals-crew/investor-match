/**
 * FundForm — multi-step form for creating or editing a fund.
 * Props:
 *   initialData  — pre-filled values (for edit mode)
 *   onSubmit(data) — called with final form data
 *   saving       — bool, disables submit button
 *   error        — string, shown on last step
 *   mode         — 'create' | 'edit'
 */

const SECTOR_OPTIONS = ['Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'SaaS', 'DeepTech', 'Agritech', 'Cleantech', 'Logistics', 'Media & Entertainment', 'Real Estate', 'Consumer', 'Other'];
const STAGE_OPTIONS  = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Pre-IPO'];
const GEO_OPTIONS    = ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Southeast Asia (all)', 'South Asia', 'Global'];
const DEAL_OPTIONS   = ['Equity', 'Convertible Note', 'SAFE', 'Debt / Revenue-based', 'Grant Co-investment'];
const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active',    desc: 'Currently investing from this fund' },
  { value: 'deploying', label: 'Deploying', desc: 'Capital committed, closing positions' },
  { value: 'closed',    label: 'Closed',    desc: 'No new investments from this fund' },
];
const STEPS = ['Fund Identity', 'Capital & Deal Size', 'Investment Mandate', 'Thesis'];

const EMPTY = {
  name: '', vintage_year: '', status: 'active', redemption_date: '',
  fund_size: '', deal_size_min: '', deal_size_max: '',
  sectors: [], stages: [], geography: [], deal_types: [],
  company_focus: '', thesis: '',
};

import { useState } from 'react';

export function useFundForm(initialData) {
  const merged = initialData
    ? {
        ...EMPTY,
        ...initialData,
        fund_size:     initialData.fund_size     ? String(initialData.fund_size / 1_000_000)     : '',
        deal_size_min: initialData.deal_size_min ? String(initialData.deal_size_min / 1000) : '',
        deal_size_max: initialData.deal_size_max ? String(initialData.deal_size_max / 1000) : '',
        redemption_date: initialData.redemption_date
          ? initialData.redemption_date.split('T')[0]
          : '',
      }
    : { ...EMPTY };

  const [form, setForm] = useState(merged);
  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function serialize() {
    return {
      name:           form.name.trim(),
      vintage_year:   form.vintage_year ? Number(form.vintage_year) : null,
      status:         form.status,
      redemption_date: form.redemption_date || null,
      fund_size:       form.fund_size ? Math.round(Number(form.fund_size) * 1_000_000) : null,
      deal_size_min:   form.deal_size_min ? Math.round(Number(form.deal_size_min) * 1000) : null,
      deal_size_max:   form.deal_size_max ? Math.round(Number(form.deal_size_max) * 1000) : null,
      sectors:         form.sectors,
      stages:          form.stages,
      geography:       form.geography,
      deal_types:      form.deal_types,
      company_focus:   form.company_focus || null,
      thesis:          form.thesis || null,
    };
  }

  return { form, update, serialize };
}

export default function FundForm({ form, update, onSubmit, saving, error, mode = 'create' }) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const TOTAL = STEPS.length;

  function validateStep() {
    setStepError('');
    if (step === 0) {
      if (!form.name.trim()) return setStepError('Fund name is required');
    }
    if (step === 1) {
      if (form.deal_size_min && form.deal_size_max &&
          Number(form.deal_size_min) >= Number(form.deal_size_max)) {
        return setStepError('Min deal size must be less than max');
      }
    }
    if (step === 2) {
      if (form.sectors.length === 0)  return setStepError('Select at least one sector');
      if (form.stages.length === 0)   return setStepError('Select at least one stage');
      if (form.geography.length === 0) return setStepError('Select at least one geography');
    }
    return true;
  }

  function next() {
    if (validateStep() !== true) return;
    setStep(s => s + 1);
  }

  const progress = (step / (TOTAL - 1)) * 100;

  return (
    <div style={s.card}>
      {/* Progress bar */}
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      {/* Step tabs */}
      <div style={s.stepRow}>
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            style={{ ...s.stepTab, ...(i === step ? s.stepTabActive : i < step ? s.stepTabDone : {}) }}
            onClick={() => { if (i < step) { setStepError(''); setStep(i); } }}
          >
            <span style={{ ...s.stepNum, ...(i <= step ? s.stepNumActive : {}) }}>
              {i < step ? '✓' : i + 1}
            </span>
            <span style={s.stepLabel}>{label}</span>
          </button>
        ))}
      </div>

      <div style={s.body}>
        {/* ── Step 0: Fund Identity ── */}
        {step === 0 && (
          <Section title="Fund Identity" desc="Name and lifecycle details of this fund.">
            <Field label="Fund Name *">
              <input style={s.input} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Acme Growth Fund II" />
            </Field>

            <div style={s.twoCol}>
              <Field label="Vintage Year">
                <input type="number" style={s.input} value={form.vintage_year} onChange={e => update('vintage_year', e.target.value)} placeholder={String(new Date().getFullYear())} min="2000" max="2099" />
              </Field>
              <Field label="Redemption / Maturity Date">
                <input type="date" style={s.input} value={form.redemption_date} onChange={e => update('redemption_date', e.target.value)} />
              </Field>
            </div>

            <Field label="Fund Status">
              <div style={s.statusRow}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('status', opt.value)}
                    style={{ ...s.statusBtn, ...(form.status === opt.value ? s.statusActive : {}) }}
                  >
                    <span style={s.statusLabel}>{opt.label}</span>
                    <span style={s.statusDesc}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
          </Section>
        )}

        {/* ── Step 1: Capital & Deal Size ── */}
        {step === 1 && (
          <Section title="Capital & Deal Size" desc="Fund size and per-investment ticket range.">
            <Field label="Total Fund Size (USD million)">
              <div style={s.inputWrap}>
                <span style={s.inputPrefix}>$</span>
                <input
                  type="number" min="0" step="0.1"
                  style={{ ...s.input, paddingLeft: '2rem' }}
                  value={form.fund_size}
                  onChange={e => update('fund_size', e.target.value)}
                  placeholder="e.g. 50"
                />
                <span style={s.inputSuffix}>M</span>
              </div>
              {form.fund_size && (
                <div style={s.hint}>= ${(Number(form.fund_size) * 1_000_000).toLocaleString()} USD</div>
              )}
            </Field>

            <div style={s.twoCol}>
              <Field label="Min Deal Size (USD k)">
                <div style={s.inputWrap}>
                  <span style={s.inputPrefix}>$</span>
                  <input
                    type="number" min="0"
                    style={{ ...s.input, paddingLeft: '2rem' }}
                    value={form.deal_size_min}
                    onChange={e => update('deal_size_min', e.target.value)}
                    placeholder="e.g. 100"
                  />
                  <span style={s.inputSuffix}>k</span>
                </div>
              </Field>
              <Field label="Max Deal Size (USD k)">
                <div style={s.inputWrap}>
                  <span style={s.inputPrefix}>$</span>
                  <input
                    type="number" min="0"
                    style={{ ...s.input, paddingLeft: '2rem' }}
                    value={form.deal_size_max}
                    onChange={e => update('deal_size_max', e.target.value)}
                    placeholder="e.g. 2000"
                  />
                  <span style={s.inputSuffix}>k</span>
                </div>
              </Field>
            </div>

            {form.deal_size_min && form.deal_size_max && Number(form.deal_size_min) < Number(form.deal_size_max) && (
              <div style={s.preview}>
                Deal range: <strong>${Number(form.deal_size_min).toLocaleString()}k – ${Number(form.deal_size_max).toLocaleString()}k</strong> per investment
              </div>
            )}
          </Section>
        )}

        {/* ── Step 2: Investment Mandate ── */}
        {step === 2 && (
          <Section title="Investment Mandate" desc="What this fund specifically targets. Overrides your general investor profile for matching.">
            <Field label="Target Sectors *">
              <MultiSelect options={SECTOR_OPTIONS} selected={form.sectors} onChange={v => update('sectors', v)} />
            </Field>
            <Field label="Investment Stages *">
              <MultiSelect options={STAGE_OPTIONS} selected={form.stages} onChange={v => update('stages', v)} />
            </Field>
            <Field label="Target Geography *">
              <MultiSelect options={GEO_OPTIONS} selected={form.geography} onChange={v => update('geography', v)} />
            </Field>
            <Field label="Deal Types">
              <MultiSelect options={DEAL_OPTIONS} selected={form.deal_types} onChange={v => update('deal_types', v)} />
            </Field>
          </Section>
        )}

        {/* ── Step 3: Thesis ── */}
        {step === 3 && (
          <Section title="Investment Thesis" desc="Help companies understand what makes this fund tick.">
            <Field label="Company Focus">
              <input
                style={s.input}
                value={form.company_focus}
                onChange={e => update('company_focus', e.target.value)}
                placeholder="e.g. B2B SaaS with >$500k ARR in Southeast Asia"
              />
            </Field>
            <Field label="Fund Thesis">
              <textarea
                style={{ ...s.input, minHeight: 130, resize: 'vertical' }}
                value={form.thesis}
                onChange={e => update('thesis', e.target.value)}
                placeholder="Describe the investment philosophy, what problems you focus on, and what makes a great fit for this fund..."
              />
            </Field>

            {/* Review summary */}
            <div style={s.reviewBox}>
              <div style={s.reviewTitle}>Summary</div>
              <ReviewRow label="Fund" value={form.name} />
              {form.vintage_year && <ReviewRow label="Vintage" value={form.vintage_year} />}
              {form.redemption_date && <ReviewRow label="Closes" value={form.redemption_date} />}
              <ReviewRow label="Status" value={form.status.charAt(0).toUpperCase() + form.status.slice(1)} />
              {form.fund_size && <ReviewRow label="Fund Size" value={`$${form.fund_size}M`} />}
              {form.deal_size_min && form.deal_size_max && (
                <ReviewRow label="Deal Range" value={`$${Number(form.deal_size_min).toLocaleString()}k – $${Number(form.deal_size_max).toLocaleString()}k`} />
              )}
              {form.sectors.length > 0 && <ReviewRow label="Sectors" value={form.sectors.join(', ')} />}
              {form.stages.length > 0 && <ReviewRow label="Stages" value={form.stages.join(', ')} />}
              {form.geography.length > 0 && <ReviewRow label="Geography" value={form.geography.join(', ')} />}
            </div>
          </Section>
        )}

        {(stepError || (step === TOTAL - 1 && error)) && (
          <div style={s.error}>{stepError || error}</div>
        )}
      </div>

      {/* Nav footer */}
      <div style={s.footer}>
        {step > 0
          ? <button type="button" style={s.btnBack} onClick={() => { setStepError(''); setStep(p => p - 1); }}>← Back</button>
          : <span />
        }
        {step < TOTAL - 1
          ? <button type="button" style={s.btnNext} onClick={next}>Continue →</button>
          : <button type="button" style={s.btnNext} onClick={onSubmit} disabled={saving}>
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Fund'}
            </button>
        }
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function Section({ title, desc, children }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{title}</h2>
      <p style={s.sectionDesc}>{desc}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function MultiSelect({ options, selected, onChange }) {
  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)} style={{
            padding: '0.4rem 0.85rem', borderRadius: 999, fontSize: '0.83rem', fontWeight: 500, cursor: 'pointer',
            border: on ? '2px solid #7c3aed' : '2px solid #e5e7eb',
            background: on ? '#f5f3ff' : '#f9fafb',
            color: on ? '#7c3aed' : '#6b7280',
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ width: 90, fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const s = {
  card: { background: '#fff', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', overflow: 'hidden' },
  progressTrack: { height: 3, background: '#f3f4f6' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', transition: 'width 0.4s ease' },
  stepRow: { display: 'flex', borderBottom: '1px solid #f3f4f6', overflowX: 'auto' },
  stepTab: { flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1rem', background: 'none', border: 'none', cursor: 'default', whiteSpace: 'nowrap', borderBottom: '2px solid transparent' },
  stepTabActive: { borderBottom: '2px solid #7c3aed', background: '#faf5ff' },
  stepTabDone: { cursor: 'pointer' },
  stepNum: { width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumActive: { background: '#7c3aed', color: '#fff' },
  stepLabel: { fontSize: '0.8rem', fontWeight: 500, color: '#6b7280' },
  body: { padding: '2rem' },
  sectionTitle: { fontSize: '1.15rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.3rem' },
  sectionDesc: { fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.5rem' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  fieldLabel: { display: 'block', fontSize: '0.82rem', fontWeight: 500, color: '#374151', marginBottom: '0.45rem' },
  input: { width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', color: '#1a1a2e', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  inputWrap: { position: 'relative' },
  inputPrefix: { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.9rem', pointerEvents: 'none' },
  inputSuffix: { position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.85rem', fontWeight: 500, pointerEvents: 'none' },
  hint: { marginTop: '0.35rem', fontSize: '0.8rem', color: '#9ca3af' },
  preview: { padding: '0.65rem 1rem', background: '#f5f3ff', borderRadius: 8, fontSize: '0.875rem', color: '#5b21b6' },
  statusRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  statusBtn: { flex: 1, minWidth: 140, padding: '0.85rem 1rem', border: '2px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  statusActive: { border: '2px solid #7c3aed', background: '#faf5ff' },
  statusLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' },
  statusDesc: { fontSize: '0.78rem', color: '#6b7280' },
  reviewBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', marginTop: '0.5rem' },
  reviewTitle: { fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem', marginTop: '1rem' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderTop: '1px solid #f3f4f6' },
  btnBack: { padding: '0.65rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' },
  btnNext: { padding: '0.65rem 1.5rem', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
};
