import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FundForm, { useFundForm } from './FundForm';

export default function EditFund() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rawFund, setRawFund] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch(`/api/funds/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.fund) setRawFund(data.fund);
        else setLoadError('Fund not found');
      })
      .catch(() => setLoadError('Failed to load fund'))
      .finally(() => setLoading(false));
  }, [id, token]);

  // Only render the form once rawFund is loaded, so useFundForm gets initial data
  if (loading) return <Loading />;
  if (loadError) return <Error msg={loadError} />;

  return <EditForm rawFund={rawFund} id={id} token={token} navigate={navigate} />;
}

function EditForm({ rawFund, id, token, navigate }) {
  const { form, update, serialize } = useFundForm(rawFund);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/funds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(serialize()),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to update fund');
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
          <h1 style={styles.title}>Edit Fund</h1>
          <p style={styles.sub}>Update mandate, deal size, or thesis for <strong>{rawFund.name}</strong>.</p>
        </div>
        <FundForm form={form} update={update} onSubmit={handleSubmit} saving={saving} error={error} mode="edit" />
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div style={styles.page}>
      <nav style={styles.nav}><span style={styles.logo}>InvestorMatch</span></nav>
      <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}>Loading fund...</div>
    </div>
  );
}

function Error({ msg }) {
  return (
    <div style={styles.page}>
      <nav style={styles.nav}><span style={styles.logo}>InvestorMatch</span></nav>
      <div style={{ padding: '4rem', textAlign: 'center', color: '#dc2626' }}>{msg}</div>
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
