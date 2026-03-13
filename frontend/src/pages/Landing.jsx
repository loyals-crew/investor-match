import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>InvestorMatch</span>
        <div style={styles.navLinks}>
          {user ? (
            <Link to="/dashboard" style={styles.btnPrimary}>Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={styles.btnOutline}>Log In</Link>
              <Link to="/register" style={styles.btnPrimary}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <main style={styles.hero}>
        <div style={styles.badge}>Connecting Capital with Opportunity</div>
        <h1 style={styles.headline}>
          The smarter way to match<br />
          <span style={styles.accent}>investors</span> with <span style={styles.accent}>businesses</span>
        </h1>
        <p style={styles.subtext}>
          Whether you're deploying capital or raising your next round — find the right match based on mandate, sector, stage, and more.
        </p>
        <div style={styles.ctaRow}>
          <Link to="/register?role=investor" style={styles.btnPrimary}>I'm an Investor</Link>
          <Link to="/register?role=company" style={styles.btnOutline}>I'm a Company</Link>
        </div>
      </main>

      <section style={styles.features}>
        {[
          { icon: '🎯', title: 'Mandate-Based Matching', desc: 'Investors define their thesis. Companies surface only when they fit.' },
          { icon: '⚡', title: 'Fast Onboarding', desc: 'Set up your profile in minutes. Start seeing matches right away.' },
          { icon: '🤝', title: 'Two-Sided Platform', desc: 'Both sides qualify each other — reducing noise for everyone.' },
        ].map(f => (
          <div key={f.title} style={styles.featureCard}>
            <div style={styles.featureIcon}>{f.icon}</div>
            <h3 style={styles.featureTitle}>{f.title}</h3>
            <p style={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── How It Works ── */}
      <section style={styles.howSection}>
        <div style={styles.howInner}>
          <div style={styles.howHeader}>
            <div style={styles.sectionBadge}>How It Works</div>
            <h2 style={styles.howTitle}>Built for both sides of the table</h2>
            <p style={styles.howSub}>
              A structured workflow that saves time for investors and founders alike — from first match to closed deal.
            </p>
          </div>

          <div style={styles.howCols}>
            {/* ── Investor column ── */}
            <div style={styles.howCol}>
              <div style={styles.howColHeader}>
                <span style={{ ...styles.colBadge, background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', borderColor: 'rgba(124,58,237,0.45)' }}>
                  💼 For Investors
                </span>
              </div>
              {[
                {
                  n: '1',
                  title: 'Define Your Mandate',
                  desc: 'Set sectors, stages, geography, and ticket size. Add individual funds — each with its own thesis and deal-size range — for precise targeting.',
                },
                {
                  n: '2',
                  title: 'Get Matched Automatically',
                  desc: 'Our matching engine scores and ranks companies whose active fundraise rounds align with your mandate. No manual searching needed.',
                },
                {
                  n: '3',
                  title: 'Reach Out With Intent',
                  desc: 'Send structured inquiries: request a meeting, pitch deck, financials, or ask a specific question — all inside a threaded conversation.',
                },
                {
                  n: '4',
                  title: 'Close & Track Deals',
                  desc: 'Mark investment outcomes, log deal amounts, and assign them to the right fund. View deployed capital and your full portfolio per fund at a glance.',
                },
              ].map(step => (
                <StepRow key={step.n} step={step} variant="investor" />
              ))}
            </div>

            <div style={styles.howDivider} />

            {/* ── Company column ── */}
            <div style={styles.howCol}>
              <div style={styles.howColHeader}>
                <span style={{ ...styles.colBadge, background: 'rgba(5,150,105,0.15)', color: '#6ee7b7', borderColor: 'rgba(5,150,105,0.4)' }}>
                  🏢 For Companies
                </span>
              </div>
              {[
                {
                  n: '1',
                  title: 'Set Up Your Profile & Round',
                  desc: 'Tell investors who you are — sector, stage, country, and a one-liner. Then create a fundraise round with your target amount, equity, and close date.',
                },
                {
                  n: '2',
                  title: 'Get Discovered by the Right Investors',
                  desc: 'You automatically surface in the feeds of investors whose mandates match your sector, stage, and raise size. No cold outreach required.',
                },
                {
                  n: '3',
                  title: 'Receive Qualified Inquiries',
                  desc: 'Investors reach out with specific, intentional requests — meetings, decks, financials. No spam, just interested capital with context.',
                },
                {
                  n: '4',
                  title: 'Manage Your Investor Pipeline',
                  desc: 'Respond to investor messages in threaded conversations. Proactively reach out to matched investors and track every relationship in one place.',
                },
              ].map(step => (
                <StepRow key={step.n} step={step} variant="company" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaGlow} />
        <h2 style={styles.ctaTitle}>Ready to find your match?</h2>
        <p style={styles.ctaSub}>
          Join investors and founders already using InvestorMatch to close smarter, faster deals.
        </p>
        <div style={styles.ctaRow}>
          <Link to="/register?role=investor" style={styles.btnPrimary}>Join as Investor</Link>
          <Link to="/register?role=company" style={styles.btnOutline}>Join as Company</Link>
        </div>
      </section>
    </div>
  );
}

/* ── Step Row sub-component ── */

function StepRow({ step, variant }) {
  const numStyle = variant === 'company'
    ? { background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.4)', color: '#6ee7b7' }
    : { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.45)', color: '#c4b5fd' };

  return (
    <div style={styles.stepRow}>
      <div style={{ ...styles.stepNum, ...numStyle }}>{step.n}</div>
      <div style={styles.stepContent}>
        <div style={styles.stepTitle}>{step.title}</div>
        <div style={styles.stepDesc}>{step.desc}</div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },

  // Nav
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logo: { fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  navLinks: { display: 'flex', gap: '1rem', alignItems: 'center' },

  // Hero
  hero: { textAlign: 'center', padding: '6rem 2rem 4rem', maxWidth: 700, margin: '0 auto' },
  badge: { display: 'inline-block', padding: '0.35rem 1rem', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 999, color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 500, marginBottom: '1.5rem' },
  headline: { fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-1px' },
  accent: { color: '#a78bfa' },
  subtext: { fontSize: '1.1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '2.5rem' },
  ctaRow: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' },

  // Feature cards
  features: { display: 'flex', gap: '1.5rem', padding: '3rem 4rem 4rem', justifyContent: 'center', flexWrap: 'wrap' },
  featureCard: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2rem', maxWidth: 280, flex: '1 1 220px' },
  featureIcon: { fontSize: '2rem', marginBottom: '1rem' },
  featureTitle: { fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' },
  featureDesc: { fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 },

  // How It Works section
  howSection: {
    padding: '5rem 2rem 6rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.15)',
  },
  howInner: { maxWidth: 980, margin: '0 auto' },
  howHeader: { textAlign: 'center', marginBottom: '3.5rem' },
  sectionBadge: {
    display: 'inline-block', padding: '0.3rem 0.9rem',
    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
    borderRadius: 999, color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem',
  },
  howTitle: {
    fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 700, color: '#fff',
    marginBottom: '0.85rem', letterSpacing: '-0.5px',
  },
  howSub: {
    fontSize: '1rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
    maxWidth: 580, margin: '0 auto',
  },

  // Two-column layout
  howCols: { display: 'flex', gap: '0', alignItems: 'flex-start', flexWrap: 'wrap' },
  howCol: { flex: '1 1 320px', display: 'flex', flexDirection: 'column', padding: '0 2.5rem' },
  howColHeader: { marginBottom: '1.75rem' },
  colBadge: {
    display: 'inline-block', padding: '0.4rem 1rem',
    borderRadius: 999, fontSize: '0.85rem', fontWeight: 700, border: '1px solid',
  },
  howDivider: {
    width: '1px', background: 'rgba(255,255,255,0.08)',
    alignSelf: 'stretch', flexShrink: 0,
    margin: '0',
  },

  // Step rows
  stepRow: {
    display: 'flex', gap: '1rem', alignItems: 'flex-start',
    padding: '1.25rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  stepNum: {
    width: 30, height: 30, borderRadius: '50%',
    fontSize: '0.8rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: '0.1rem',
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: '0.93rem', fontWeight: 600, color: '#fff',
    marginBottom: '0.4rem', lineHeight: 1.4,
  },
  stepDesc: {
    fontSize: '0.83rem', color: 'rgba(255,255,255,0.52)', lineHeight: 1.65,
  },

  // Final CTA section
  ctaSection: {
    position: 'relative', textAlign: 'center',
    padding: '6rem 2rem 5rem', overflow: 'hidden',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  ctaGlow: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 500, height: 300,
    background: 'radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  ctaTitle: {
    position: 'relative', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
    fontWeight: 700, color: '#fff', marginBottom: '0.85rem', letterSpacing: '-0.5px',
  },
  ctaSub: {
    position: 'relative', fontSize: '1rem',
    color: 'rgba(255,255,255,0.55)', maxWidth: 460, margin: '0 auto 2.25rem', lineHeight: 1.7,
  },

  // Buttons
  btnPrimary: { padding: '0.7rem 1.5rem', background: '#7c3aed', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', border: 'none', display: 'inline-block' },
  btnOutline: { padding: '0.7rem 1.5rem', background: 'transparent', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.3)', display: 'inline-block' },
};
