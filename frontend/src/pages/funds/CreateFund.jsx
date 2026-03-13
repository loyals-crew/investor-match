import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FundForm, { useFundForm } from './FundForm';

export default function CreateFund() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { form, update, serialize } = useFundForm(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(serialize()),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to create fund');
      navigate('/dashboard/investor');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>InvestorMatch</span>
        <Link to="/dashboard/investor" style={styles.back}>← Back to Dashboard</Link>
      </nav>
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Create New Fund</h1>
          <p style={styles.sub}>Each fund can have its own mandate, ticket size, and thesis.</p>
        </div>
        <FundForm form={form} update={update} onSubmit={handleSubmit} saving={saving} error={error} mode="create" />
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f8f9fb' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#7c3aed' },
  back: { fontSize: '0.875rem', color: '#7c3aed', fontWeight: 500 },
  main: { maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.5rem' },
  header: { marginBottom: '1.75rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.35rem' },
  sub: { fontSize: '0.9rem', color: '#6b7280' },
};
