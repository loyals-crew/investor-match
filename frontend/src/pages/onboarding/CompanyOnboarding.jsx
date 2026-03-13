import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ─── Options ─── */
const SECTOR_OPTIONS   = ['Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'SaaS', 'DeepTech', 'Agritech', 'Cleantech', 'Logistics', 'Media & Entertainment', 'Real Estate', 'Consumer', 'Other'];
const STAGE_OPTIONS    = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'Pre-IPO'];
const COUNTRY_OPTIONS  = ['Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'India', 'Australia', 'United States', 'United Kingdom', 'Other'];
const BIZ_MODEL_OPTIONS = ['B2B SaaS', 'B2C', 'B2B2C', 'Marketplace', 'D2C', 'Enterprise', 'Hardware', 'Other'];
const ROLE_OPTIONS     = ['Founder / CEO', 'Co-Founder', 'CTO', 'CFO', 'COO', 'Head of BD', 'Other'];
const LEGAL_OPTIONS    = ['Sole Proprietor', 'Sdn. Bhd.', 'Pte. Ltd.', 'Corp. / Inc.', 'LLC', 'Partnership', 'Other'];
const TEAM_OPTIONS     = ['1 – 10', '11 – 50', '51 – 200', '201 – 500', '500+'];

const STEPS = ['Company Identity', 'Business Profile', 'Traction & Financials', 'Review'];
const TOTAL = STEPS.length;

const EMPTY = {
  company_name: '', contact_name: '', contact_role: '', country: '',
  legal_type: '', registration_date: '', website: '',
  sector: '', stage: '', business_model: '', team_size: '',
  one_liner: '', description: '',
  revenue_status: '', annual_revenue: '', mrr: '',
  is_profitable: null, has_previous_funding: null, previous_funding: '',
  target_market: '',
};

export default function CompanyOnboarding() {
  const { token, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({ ...EMPTY });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function validate() {
    if (step === 0) {
      if (!form.company_name.trim()) return 'Company name is required';
      if (!form.contact_name.trim()) return 'Contact name is required';
      if (!form.country)             return 'Please select your country';
    }
    if (step === 1) {
      if (!form.sector)           return 'Please select a sector';
      if (!form.stage)            return 'Please select your current stage';
      if (!form.business_model)   return 'Please select a business model';
      if (!form.team_size)        return 'Please select your team size';
      if (!form.description.trim()) return 'Please provide a company description';
    }
    if (step === 2) {
      if (!form.revenue_status)       return 'Please select your revenue status';
      if (form.is_profitable === null) return 'Please indicate if the company is profitable';
      if (form.has_previous_funding === null) return 'Please indicate if you have raised before';
    }
    return null;
  }

  function next() {
    setError('');
    const err = validate();
    if (err) return setError(err);
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        annual_revenue:   form.annual_revenue   ? Math.round(Number(form.annual_revenue) * 1000)   : null,
        mrr:              form.mrr              ? Math.round(Number(form.mrr) * 1000)              : null,
        previous_funding: form.previous_funding ? Math.round(Number(form.previous_funding) * 1000) : null,
      };
      const res = await fetch('/api/companies/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to save profile');
      setUser(u => ({ ...u, onboarding_completed: true }));
      navigate('/dashboard/company');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const progress = (step / (TOTAL - 1)) * 100;

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <span style={S.logo}>InvestorMatch</span>
          <span style={S.stepLabel}>Step {step + 1} of {TOTAL}</span>
        </div>

        {/* Progress */}
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${progress}%` }} />
        </div>

        {/* Step tabs */}
        <div style={S.stepRow}>
          {STEPS.map((name, i) => (
            <div key={name} style={S.stepItem}>
              <div style={{ ...S.stepDot, background: i <= step ? '#059669' : '#e5e7eb', color: i <= step ? '#fff' : '#9ca3af' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ ...S.stepName, color: i === step ? '#059669' : '#9ca3af' }}>{name}</span>
            </div>
          ))}
        </div>

        <div style={S.body}>
          {/* ── Step 0: Company Identity ── */}
          {step === 0 && (
            <Section title="Company Identity" sub="Tell us who you are and where you're based.">
              <Row2>
                <Field label="Company Name *">
                  <input style={S.input} value={form.company_name} onChange={e => update('company_name', e.target.value)} placeholder="e.g. Acme Technologies Sdn. Bhd." />
                </Field>
                <Field label="Country *">
                  <Dropdown options={COUNTRY_OPTIONS} value={form.country} onChange={v => update('country', v)} placeholder="Select country..." />
                </Field>
              </Row2>

              <Row2>
                <Field label="Your Name *">
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
            </Section>
          )}

          {/* ── Step 1: Business Profile ── */}
          {step === 1 && (
            <Section title="Business Profile" sub="Help investors understand your business.">
              <Row2>
                <Field label="Sector *">
                  <Dropdown options={SECTOR_OPTIONS} value={form.sector} onChange={v => update('sector', v)} placeholder="Select sector..." />
                </Field>
                <Field label="Current Stage *">
                  <Dropdown options={STAGE_OPTIONS} value={form.stage} onChange={v => update('stage', v)} placeholder="Select stage..." />
                </Field>
              </Row2>

              <Row2>
                <Field label="Business Model *">
                  <Dropdown options={BIZ_MODEL_OPTIONS} value={form.business_model} onChange={v => update('business_model', v)} placeholder="Select model..." />
                </Field>
                <Field label="Team Size *">
                  <PillSelect options={TEAM_OPTIONS} value={form.team_size} onChange={v => update('team_size', v)} />
                </Field>
              </Row2>

              <Field label="One-Line Pitch">
                <div style={{ position: 'relative' }}>
                  <input
                    style={S.input} maxLength={140}
                    value={form.one_liner}
                    onChange={e => update('one_liner', e.target.value)}
                    placeholder="In one sentence, what does your company do?"
                  />
                  <span style={S.charCount}>{form.one_liner.length}/140</span>
                </div>
              </Field>

              <Field label="Company Description *">
                <textarea
                  style={{ ...S.input, minHeight: 120, resize: 'vertical' }}
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  placeholder="Describe what your company does, the problem you solve, your target market, and any key traction or milestones..."
                />
              </Field>
            </Section>
          )}

          {/* ── Step 2: Traction & Financials ── */}
          {step === 2 && (
            <Section title="Traction & Financials" sub="Help investors gauge where you are financially.">
              <Field label="Revenue Status *">
                <div style={S.pillRow}>
                  {[
                    { value: 'pre_revenue', label: '🌱 Pre-Revenue', desc: 'Not yet generating revenue' },
                    { value: 'generating',  label: '📈 Revenue Generating', desc: 'Earning from customers' },
                  ].map(opt => (
                    <button
                      key={opt.value} type="button"
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
                <Field label="Is the company profitable? *">
                  <BoolToggle value={form.is_profitable} onChange={v => update('is_profitable', v)} />
                </Field>
                <Field label="Have you raised funding before? *">
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
                  {form.previous_funding && <div style={S.hint}>= ${(Number(form.previous_funding) * 1000).toLocaleString()} USD total raised</div>}
                </Field>
              )}

              <Field label="Target Market">
                <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
                  value={form.target_market}
                  onChange={e => update('target_market', e.target.value)}
                  placeholder="Who are your customers? e.g. SMEs in Southeast Asia, B2B SaaS companies with >50 employees..."
                />
              </Field>
            </Section>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <Section title="Review Your Profile" sub="Confirm everything looks right before submitting.">
              <ReviewGroup title="Company Identity">
                <ReviewRow label="Company"     value={form.company_name} />
                <ReviewRow label="Contact"     value={`${form.contact_name}${form.contact_role ? ` — ${form.contact_role}` : ''}`} />
                {form.country        && <ReviewRow label="Country"      value={form.country} />}
                {form.legal_type     && <ReviewRow label="Legal Type"   value={form.legal_type} />}
                {form.registration_date && <ReviewRow label="Registered" value={new Date(form.registration_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />}
                {form.website        && <ReviewRow label="Website"      value={form.website} />}
              </ReviewGroup>

              <ReviewGroup title="Business">
                <ReviewRow label="Sector"       value={form.sector} />
                <ReviewRow label="Stage"        value={form.stage} />
                <ReviewRow label="Model"        value={form.business_model} />
                <ReviewRow label="Team"         value={form.team_size} />
                {form.one_liner && <ReviewRow label="Pitch"   value={form.one_liner} />}
              </ReviewGroup>

              <ReviewGroup title="Traction">
                <ReviewRow label="Revenue"      value={form.revenue_status === 'generating' ? 'Revenue Generating' : 'Pre-Revenue'} />
                {form.annual_revenue && <ReviewRow label="Annual Rev"  value={`$${(Number(form.annual_revenue)).toLocaleString()}k`} />}
                {form.mrr            && <ReviewRow label="MRR"         value={`$${(Number(form.mrr)).toLocaleString()}k`} />}
                <ReviewRow label="Profitable"   value={form.is_profitable === true ? 'Yes' : 'No'} />
                <ReviewRow label="Prev. Raised" value={form.has_previous_funding === true ? (form.previous_funding ? `$${Number(form.previous_funding).toLocaleString()}k` : 'Yes') : 'No'} />
              </ReviewGroup>
            </Section>
          )}

          {error && <div style={S.error}>{error}</div>}
        </div>

        {/* Nav */}
        <div style={S.navRow}>
          {step > 0
            ? <button type="button" style={S.btnBack} onClick={() => { setError(''); setStep(s => s - 1); }}>← Back</button>
            : <span />
          }
          {step < TOTAL - 1
            ? <button type="button" style={S.btnNext} onClick={next}>Continue →</button>
            : <button type="button" style={S.btnNext} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : 'Complete Profile'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function Section({ title, sub, children }) {
  return (
    <div>
      <h2 style={S.sectionTitle}>{title}</h2>
      <p style={S.sectionSub}>{sub}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...S.input, color: value ? '#1a1a2e' : '#9ca3af' }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {options.map(opt => (
        <button
          key={opt} type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: '0.4rem 0.8rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
            border: value === opt ? '2px solid #059669' : '2px solid #e5e7eb',
            background: value === opt ? '#f0fdf4' : '#f9fafb',
            color: value === opt ? '#065f46' : '#6b7280',
          }}
        >
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
        <button
          key={label} type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1, padding: '0.6rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            border: value === v ? '2px solid #059669' : '2px solid #e5e7eb',
            background: value === v ? '#f0fdf4' : '#f9fafb',
            color: value === v ? '#065f46' : '#6b7280',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ReviewGroup({ title, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={S.reviewGroupTitle}>{title}</div>
      <div style={S.reviewGroupBox}>{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={S.reviewRow}>
      <span style={S.reviewLabel}>{label}</span>
      <span style={S.reviewValue}>{value}</span>
    </div>
  );
}

/* ─── Styles ─── */
const S = {
  page: { minHeight: '100vh', background: '#f3f4f8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' },
  card: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '1px solid #f3f4f6' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#059669' },
  stepLabel: { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 },
  progressTrack: { height: 3, background: '#f3f4f6' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #059669, #34d399)', transition: 'width 0.4s ease' },
  stepRow: { display: 'flex', justifyContent: 'space-between', padding: '1.1rem 2rem', borderBottom: '1px solid #f3f4f6', gap: '0.5rem', overflowX: 'auto' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minWidth: 70 },
  stepDot: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s', flexShrink: 0 },
  stepName: { fontSize: '0.68rem', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 },
  body: { padding: '2rem' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.3rem' },
  sectionSub: { fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' },
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
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem', marginTop: '1rem' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderTop: '1px solid #f3f4f6' },
  btnBack: { padding: '0.65rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' },
  btnNext: { padding: '0.65rem 1.5rem', border: 'none', borderRadius: 8, background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  reviewGroupTitle: { fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' },
  reviewGroupBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' },
  reviewRow: { display: 'flex', gap: '1rem', padding: '0.6rem 1rem', borderBottom: '1px solid #f3f4f6' },
  reviewLabel: { width: 110, fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0 },
  reviewValue: { fontSize: '0.875rem', color: '#1a1a2e', fontWeight: 500 },
};
