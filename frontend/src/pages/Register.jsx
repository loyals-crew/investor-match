import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!role) return setError('Please select your account type');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Registration failed');

      login(data.token, data.user);
      navigate(role === 'investor' ? '/onboarding/investor' : '/onboarding/company');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/" style={styles.logo}>InvestorMatch</Link>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.sub}>Join as an investor or a company raising funds</p>

        {/* Role selector */}
        <div style={styles.roleRow}>
          <button
            type="button"
            style={{ ...styles.roleBtn, ...(role === 'investor' ? styles.roleActive : {}) }}
            onClick={() => setRole('investor')}
          >
            <span style={styles.roleIcon}>💼</span>
            <span style={styles.roleLabel}>Investor</span>
            <span style={styles.roleDesc}>I want to find companies to invest in</span>
          </button>
          <button
            type="button"
            style={{ ...styles.roleBtn, ...(role === 'company' ? styles.roleActive : {}) }}
            onClick={() => setRole('company')}
          >
            <span style={styles.roleIcon}>🚀</span>
            <span style={styles.roleLabel}>Company</span>
            <span style={styles.roleDesc}>I'm looking for investors for my business</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Min. 8 characters"
            />
          </label>

          <label style={styles.label}>
            Confirm Password
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={styles.input}
              placeholder="Repeat your password"
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f8', padding: '2rem' },
  card: { background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { display: 'block', fontWeight: 700, fontSize: '1.1rem', color: '#7c3aed', marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem', color: '#1a1a2e' },
  sub: { fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.75rem' },
  roleRow: { display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' },
  roleBtn: { flex: 1, padding: '1rem', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.25rem', transition: 'all 0.15s' },
  roleActive: { border: '2px solid #7c3aed', background: '#faf5ff' },
  roleIcon: { fontSize: '1.4rem' },
  roleLabel: { fontWeight: 600, fontSize: '0.95rem', color: '#1a1a2e' },
  roleDesc: { fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.15s', color: '#1a1a2e' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem' },
  btn: { padding: '0.75rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem', marginTop: '0.25rem' },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' },
  link: { color: '#7c3aed', fontWeight: 500 },
};
