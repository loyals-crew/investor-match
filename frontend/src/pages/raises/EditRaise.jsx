import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RaiseForm, { useRaiseForm } from './RaiseForm';

export default function EditRaise() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/raises/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.round) setInitialData(d.round);
        else setError('Round not found');
      })
      .catch(() => setError('Failed to load round'))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <LoadingScreen />;
  if (!initialData) return <LoadingScreen message={error || 'Round not found'} />;

  return <EditForm initialData={initialData} id={id} token={token} navigate={navigate} />;
}

function EditForm({ initialData, id, token, navigate }) {
  const { form, update, serialize } = useRaiseForm(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/raises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(serialize()),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to save changes');
      navigate('/dashboard/company');
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
        <Link to="/dashboard/company" style={styles.back}>← Back to Dashboard</Link>
      </nav>
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>Edit Fundraise Round</h1>
          <p style={styles.sub}>Update the details of your fundraising round.</p>
        </div>
        <RaiseForm form={form} update={update} onSubmit={handleSubmit} saving={saving} error={error} mode="edit" />
      </main>
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
      <p style={{ color: '#9ca3af', fontSize: '0.95rem' }}>{message || 'Loading...'}</p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f8f9fb' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo: { fontWeight: 700, fontSize: '1rem', color: '#059669' },
  back: { fontSize: '0.875rem', color: '#059669', fontWeight: 500 },
  main: { maxWidth: 680, margin: '0 auto', padding: '2.5rem 1.5rem' },
  header: { marginBottom: '1.75rem' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.35rem' },
  sub: { fontSize: '0.9rem', color: '#6b7280' },
};
