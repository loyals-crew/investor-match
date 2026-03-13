import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Login failed');

      login(data.token, data.user);

      if (!data.user.onboarding_completed) {
        navigate(data.user.role === 'investor' ? '/onboarding/investor' : '/onboarding/company');
      } else {
        navigate(data.user.role === 'investor' ? '/dashboard/investor' : '/dashboard/company');
      }
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
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.sub}>Log in to your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email address
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={styles.input} placeholder="you@example.com" />
          </label>

          <label style={styles.label}>
            Password
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={styles.input} placeholder="Your password" />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f8', padding: '2rem' },
  card: { background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { display: 'block', fontWeight: 700, fontSize: '1.1rem', color: '#7c3aed', marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem', color: '#1a1a2e' },
  sub: { fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.75rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.65rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem', outline: 'none', color: '#1a1a2e' },
  error: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, padding: '0.65rem 0.875rem', fontSize: '0.875rem' },
  btn: { padding: '0.75rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '1rem', marginTop: '0.25rem' },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#6b7280' },
  link: { color: '#7c3aed', fontWeight: 500 },
};
