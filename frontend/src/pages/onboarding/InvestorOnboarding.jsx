import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function InvestorOnboarding() {
  const { token, setUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firm_name: '',
    contact_name: '',
    website: '',
    bio: '',
  });

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.firm_name.trim()) return setError('Firm name is required');
    if (!form.contact_name.trim()) return setError('Contact name is required');

    setSaving(true);
    try {
      const res = await fetch('/api/investors/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.logo}>InvestorMatch</span>
          <span style={styles.badge}>Investor Setup</span>
        </div>

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: '100%' }} />
        </div>

        <form onSubmit={handleSubmit} style={styles.content}>
          <h2 style={styles.sectionTitle}>Welcome! Tell us about yourself</h2>
          <p style={styles.sectionSub}>
            Just the basics for now — you'll set up your investment mandate when you create your first fund.
          </p>

          <Field label="Firm / Fund Name *">
            <input
              style={styles.input}
              value={form.firm_name}
              onChange={e => update('firm_name', e.target.value)}
              placeholder="e.g. Acme Ventures"
              autoFocus
            />
          </Field>

          <Field label="Your Name *">
            <input
              style={styles.input}
              value={form.contact_name}
              onChange={e => update('contact_name', e.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </Field>

          <Field label="Website">
            <input
              style={styles.input}
              value={form.website}
              onChange={e => update('website', e.target.value)}
              placeholder="https://yourfirm.com"
            />
          </Field>

          <Field label="Short Bio">
            <textarea
              style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
              value={form.bio}
              onChange={e => update('bio', e.target.value)}
              placeholder="Briefly describe your fund's focus and background..."
            />
          </Field>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.hint}>
            <span style={styles.hintIcon}>💡</span>
            <span>After this, you'll create a fund with your investment criteria (sectors, stages, ticket size). That's what powers your matching.</span>
          </div>

          <button type="submit" style={styles.btnSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Continue to Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.4rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f3f4f8', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' },
  card: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, boxShadow: '0 4px 32px rgba(0,0,0,0.08)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '1px solid #f3f4f6' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#7c3aed' },
  badge: { fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600, background: '#f5f3ff', padding: '0.3rem 0.75rem', borderRadius: 999 },
  progressTrack: { height: 3, background: '#f3f4f6' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', transition: 'width 0.4s ease' },
  content: { padding: '2rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.35rem' },
  sectionSub: { fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.75rem', lineHeight: 1.5 },
  input: { width: '100%', padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', color: '#1a1a2e', outline: 'none' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem', marginBottom: '1rem' },
  hint: { display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: '#f5f3ff', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#5b21b6', lineHeight: 1.45 },
  hintIcon: { fontSize: '1rem', flexShrink: 0 },
  btnSubmit: { width: '100%', padding: '0.75rem', border: 'none', borderRadius: 10, background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' },
};
