/**
 * RaiseForm — multi-step form for creating / editing a fundraise round.
 * Props:
 *   initialData  — pre-filled values (for edit mode)
 *   onSubmit()   — called when final step is confirmed
 *   saving       — bool, disables submit button
 *   error        — string, shown on last step
 *   mode         — 'create' | 'edit'
 */

import { useState } from 'react';

/** Format a value in k (thousands) into a readable hint, e.g. 50000 → "$50M ($50,000,000 USD)" */
function fmtKHint(kVal) {
  const n = Number(kVal);
  if (!n) return '';
  const usd = (n * 1000).toLocaleString();
  if (n >= 1000) return `$${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M ($${usd} USD)`;
  return `$${n.toLocaleString()}k ($${usd} USD)`;
}

/** Short display for review rows, e.g. 50000 → "$50M", 500 → "$500k" */
function fmtKShort(kVal) {
  const n = Number(kVal);
  if (!n) return '';
  if (n >= 1000) return `$${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  return `$${n.toLocaleString()}k`;
}

const INVESTMENT_TYPES = ['Equity', 'Convertible Note', 'SAFE', 'Debt / Revenue-based', 'Grant'];
const STATUS_OPTIONS = [
  { value: 'open',    label: 'Open',    desc: 'Actively accepting term sheets' },
  { value: 'closing', label: 'Closing', desc: 'Near full allocation, wrapping up' },
  { value: 'closed',  label: 'Closed',  desc: 'Round is complete' },
];
const STEPS = ['Round Details', 'Financials', 'Use of Funds', 'Review'];

const EMPTY = {
  round_name: '', status: 'open',
  raise_amount: '', investment_types: [],
  equity_offered: '', pre_money_valuation: '', min_ticket: '',
  use_of_funds: '', closing_date: '',
};

export function useRaiseForm(initialData) {
  const merged = initialData
    ? {
        ...EMPTY,
        ...initialData,
        raise_amount:        initialData.raise_amount        ? String(initialData.raise_amount / 1000)        : '',
        pre_money_valuation: initialData.pre_money_valuation ? String(initialData.pre_money_valuation / 1000) : '',
        min_ticket:          initialData.min_ticket          ? String(initialData.min_ticket / 1000)          : '',
        equity_offered:      initialData.equity_offered      ? String(initialData.equity_offered)             : '',
        closing_date:        initialData.closing_date        ? initialData.closing_date.split('T')[0]         : '',
        investment_types:    initialData.investment_types    || [],
      }
    : { ...EMPTY };

  const [form, setForm] = useState(merged);
  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function serialize() {
    return {
      round_name:          form.round_name.trim(),
      status:              form.status,
      raise_amount:        form.raise_amount        ? Math.round(Number(form.raise_amount) * 1000)        : null,
      investment_types:    form.investment_types,
      equity_offered:      form.equity_offered      ? Number(form.equity_offered)                        : null,
      pre_money_valuation: form.pre_money_valuation ? Math.round(Number(form.pre_money_valuation) * 1000) : null,
      min_ticket:          form.min_ticket          ? Math.round(Number(form.min_ticket) * 1000)          : null,
      use_of_funds:        form.use_of_funds        || null,
      closing_date:        form.closing_date        || null,
    };
  }

  return { form, update, serialize };
}

export default function RaiseForm({ form, update, onSubmit, saving, error, mode = 'create' }) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const TOTAL = STEPS.length;

  function validateStep() {
    setStepError('');
    if (step === 0) {
      if (!form.round_name.trim()) return setStepError('Round name is required');
      if (form.investment_types.length === 0) return setStepError('Select at least one investment type');
    }
    if (step === 1) {
      if (!form.raise_amount) return setStepError('Raise amount is required');
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

        {/* ── Step 0: Round Details ── */}
        {step === 0 && (
          <Section title="Round Details" desc="Name your round and set the investment structure.">
            <Field label="Round Name *">
              <input
                style={s.input}
                value={form.round_name}
                onChange={e => update('round_name', e.target.value)}
                placeholder="e.g. Seed Round, Series A, Bridge Round"
              />
            </Field>

            <Field label="Investment Type *">
              <div style={s.pillRow}>
                {INVESTMENT_TYPES.map(opt => {
                  const on = form.investment_types.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      style={{ ...s.pill, ...(on ? s.pillOn : {}) }}
                      onClick={() => {
                        update('investment_types',
                          on
                            ? form.investment_types.filter(x => x !== opt)
                            : [...form.investment_types, opt]
                        );
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Round Status">
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

        {/* ── Step 1: Financials ── */}
        {step === 1 && (
          <Section title="Financials" desc="Amount you're raising and deal terms for investors.">
            <Field label="Raise Amount (USD k) *">
              <div style={s.inputWrap}>
                <span style={s.inputPrefix}>$</span>
                <input
                  type="number" min="0" step="1"
                  style={{ ...s.input, paddingLeft: '2rem' }}
                  value={form.raise_amount}
                  onChange={e => update('raise_amount', e.target.value)}
                  placeholder="e.g. 500"
                />
                <span style={s.inputSuffix}>k</span>
              </div>
              {form.raise_amount && (
                <div style={s.hint}>= {fmtKHint(form.raise_amount)}</div>
              )}
            </Field>

            <div style={s.twoCol}>
              <Field label="Pre-Money Valuation (USD k)">
                <div style={s.inputWrap}>
                  <span style={s.inputPrefix}>$</span>
                  <input
                    type="number" min="0" step="1"
                    style={{ ...s.input, paddingLeft: '2rem' }}
                    value={form.pre_money_valuation}
                    onChange={e => update('pre_money_valuation', e.target.value)}
                    placeholder="e.g. 5000"
                  />
                  <span style={s.inputSuffix}>k</span>
                </div>
                {form.pre_money_valuation && (
                  <div style={s.hint}>= {fmtKHint(form.pre_money_valuation)}</div>
                )}
              </Field>
              <Field label="Equity Offered (%)">
                <div style={s.inputWrap}>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    style={{ ...s.input, paddingRight: '2.5rem' }}
                    value={form.equity_offered}
                    onChange={e => update('equity_offered', e.target.value)}
                    placeholder="e.g. 10"
                  />
                  <span style={s.inputSuffix}>%</span>
                </div>
              </Field>
            </div>

            <Field label="Minimum Ticket Size (USD k)">
              <div style={s.inputWrap}>
                <span style={s.inputPrefix}>$</span>
                <input
                  type="number" min="0" step="1"
                  style={{ ...s.input, paddingLeft: '2rem' }}
                  value={form.min_ticket}
                  onChange={e => update('min_ticket', e.target.value)}
                  placeholder="e.g. 25"
                />
                <span style={s.inputSuffix}>k</span>
              </div>
            </Field>

            {form.raise_amount && form.equity_offered && form.pre_money_valuation && (
              <div style={s.preview}>
                Post-money valuation: <strong>{fmtKShort(Number(form.pre_money_valuation) + Number(form.raise_amount))}</strong>
                &nbsp;·&nbsp; Investor gets <strong>{form.equity_offered}%</strong> equity
              </div>
            )}
          </Section>
        )}

        {/* ── Step 2: Use of Funds ── */}
        {step === 2 && (
          <Section title="Use of Funds" desc="Tell investors how you'll deploy the capital.">
            <Field label="Target Closing Date">
              <input
                type="date"
                style={s.input}
                value={form.closing_date}
                onChange={e => update('closing_date', e.target.value)}
              />
            </Field>

            <Field label="Use of Funds">
              <textarea
                style={{ ...s.input, minHeight: 150, resize: 'vertical' }}
                value={form.use_of_funds}
                onChange={e => update('use_of_funds', e.target.value)}
                placeholder="Describe how you plan to deploy this capital — e.g. 40% product development, 30% sales &amp; marketing, 20% hiring, 10% operations..."
              />
            </Field>
          </Section>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <Section title="Review" desc="Confirm your fundraising round details before saving.">
            <div style={s.reviewBox}>
              <ReviewGroup title="Round">
                <ReviewRow label="Name"   value={form.round_name} />
                <ReviewRow label="Status" value={STATUS_OPTIONS.find(o => o.value === form.status)?.label} />
                {form.investment_types.length > 0 && (
                  <ReviewRow label="Type" value={form.investment_types.join(', ')} />
                )}
                {form.closing_date && (
                  <ReviewRow label="Closes" value={form.closing_date} />
                )}
              </ReviewGroup>

              <ReviewGroup title="Financials">
                {form.raise_amount && (
                  <ReviewRow label="Raising"    value={fmtKShort(form.raise_amount)} />
                )}
                {form.pre_money_valuation && (
                  <ReviewRow label="Pre-Money"  value={fmtKShort(form.pre_money_valuation)} />
                )}
                {form.equity_offered && (
                  <ReviewRow label="Equity"     value={`${form.equity_offered}%`} />
                )}
                {form.min_ticket && (
                  <ReviewRow label="Min Ticket" value={fmtKShort(form.min_ticket)} />
                )}
              </ReviewGroup>

              {form.use_of_funds && (
                <ReviewGroup title="Use of Funds">
                  <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                    {form.use_of_funds}
                  </p>
                </ReviewGroup>
              )}
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
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Round'}
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

function ReviewGroup({ title, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ width: 90, fontSize: '0.8rem', color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ─── Styles ─── */
const s = {
  card: { background: '#fff', borderRadius: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', overflow: 'hidden' },
  progressTrack: { height: 3, background: '#f3f4f6' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #059669, #34d399)', transition: 'width 0.4s ease' },

  stepRow: { display: 'flex', borderBottom: '1px solid #f3f4f6', overflowX: 'auto' },
  stepTab: { flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1rem', background: 'none', border: 'none', cursor: 'default', whiteSpace: 'nowrap', borderBottom: '2px solid transparent' },
  stepTabActive: { borderBottom: '2px solid #059669', background: '#f0fdf9' },
  stepTabDone: { cursor: 'pointer' },
  stepNum: { width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumActive: { background: '#059669', color: '#fff' },
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
  preview: { padding: '0.65rem 1rem', background: '#ecfdf5', borderRadius: 8, fontSize: '0.875rem', color: '#065f46' },

  pillRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  pill: { padding: '0.4rem 0.85rem', borderRadius: 999, fontSize: '0.83rem', fontWeight: 500, cursor: 'pointer', border: '2px solid #e5e7eb', background: '#f9fafb', color: '#6b7280' },
  pillOn: { border: '2px solid #059669', background: '#ecfdf5', color: '#059669' },

  statusRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  statusBtn: { flex: 1, minWidth: 130, padding: '0.85rem 1rem', border: '2px solid #e5e7eb', borderRadius: 10, background: '#f9fafb', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  statusActive: { border: '2px solid #059669', background: '#f0fdf9' },
  statusLabel: { fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' },
  statusDesc: { fontSize: '0.78rem', color: '#6b7280' },

  reviewBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' },

  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem', marginTop: '1rem' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderTop: '1px solid #f3f4f6' },
  btnBack: { padding: '0.65rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' },
  btnNext: { padding: '0.65rem 1.5rem', border: 'none', borderRadius: 8, background: '#059669', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
};
