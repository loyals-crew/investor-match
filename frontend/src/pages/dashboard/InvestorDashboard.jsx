import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const STATUS_META = {
  active:    { label: 'Active',    bg: '#f0fdf4', color: '#166534' },
  deploying: { label: 'Deploying', bg: '#fffbeb', color: '#92400e' },
  closed:    { label: 'Closed',    bg: '#f9fafb', color: '#9ca3af' },
};

const REQUEST_TYPES = [
  { type: 'meeting',    icon: '📅', label: 'Request Meeting',    desc: 'Schedule a call or in-person meeting' },
  { type: 'pitch_deck', icon: '📄', label: 'Request Pitch Deck', desc: 'Get the full investor presentation' },
  { type: 'financials', icon: '💰', label: 'Request Financials', desc: 'Access revenue, metrics & projections' },
  { type: 'question',   icon: '💬', label: 'Ask a Question',     desc: 'Send a specific question to the founder' },
];

const MATCH_BADGE = {
  strong:   { bg: '#ecfdf5', color: '#065f46', label: 'Strong Match' },
  good:     { bg: '#eff6ff', color: '#1e40af', label: 'Good Match' },
  possible: { bg: '#fefce8', color: '#854d0e', label: 'Possible Match' },
};

const INVESTOR_REQUEST_TYPE_META = {
  meeting:        { icon: '📅', label: 'Request Meeting' },
  pitch_deck:     { icon: '📄', label: 'Request Pitch Deck' },
  financials:     { icon: '💰', label: 'Request Financials' },
  question:       { icon: '💬', label: 'Question' },
  // Company-initiated types
  pitch_meeting:  { icon: '🎤', label: 'Invite to Pitch' },
  share_deck:     { icon: '📊', label: 'Share Our Deck' },
  share_traction: { icon: '📈', label: 'Share Traction' },
  intro:          { icon: '👋', label: 'Introduce Ourselves' },
};

const INQUIRY_STATUS_META = {
  pending:   { bg: '#fffbeb', color: '#92400e', label: 'Pending' },
  responded: { bg: '#ecfdf5', color: '#065f46', label: 'Replied ✓' },
  passed:    { bg: '#f3f4f6', color: '#9ca3af', label: 'Passed' },
};

export default function InvestorDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]             = useState(null);
  const [funds, setFunds]                 = useState([]);
  const [matches, setMatches]             = useState([]);
  const [sentInquiries, setSentInquiries] = useState([]);
  const [closingId, setClosingId]         = useState(null);
  const [inquiryModal, setInquiryModal]         = useState(null); // null | match object
  const [investorThreadModal, setInvestorThreadModal] = useState(null); // null | inquiry object
  const [dealModal, setDealModal]               = useState(null); // null | match object
  const [portfolioModal, setPortfolioModal]     = useState(null); // null | fund object

  useEffect(() => {
    fetch('/api/investors/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.profile) setProfile(d.profile); }).catch(() => {});

    fetch('/api/funds', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.funds) setFunds(d.funds); }).catch(() => {});

    fetch('/api/matches', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.matches) setMatches(d.matches); }).catch(() => {});

    fetch('/api/inquiries', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.inquiries) setSentInquiries(d.inquiries); }).catch(() => {});
  }, [token]);

  function handleLogout() { logout(); navigate('/'); }

  async function closeFund(id) {
    if (!confirm('Mark this fund as closed? You can re-open it by editing.')) return;
    setClosingId(id);
    try {
      await fetch(`/api/funds/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setFunds(fs => fs.map(f => f.id === id ? { ...f, status: 'closed' } : f));
    } catch { /* silent */ } finally { setClosingId(null); }
  }

  function handleInquirySuccess(newInquiry) {
    setSentInquiries(prev => [newInquiry, ...prev]);
    setInquiryModal(null);
  }

  function handleDealSaved(updatedMatch) {
    setMatches(ms => ms.map(m => m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m));
    setDealModal(null);
  }

  // Split by direction
  const sentByMe             = sentInquiries.filter(i => i.initiated_by !== 'company');
  const receivedFromCompanies = sentInquiries.filter(i => i.initiated_by === 'company');

  // Build a map: raise_round_id → Set<request_type> — only investor-initiated
  const sentMap = new Map();
  for (const inq of sentByMe) {
    if (inq.status !== 'passed') {
      if (!sentMap.has(inq.raise_round_id)) sentMap.set(inq.raise_round_id, new Set());
      sentMap.get(inq.raise_round_id).add(inq.request_type);
    }
  }

  const activeFunds = funds.filter(f => f.status !== 'closed');
  const closedFunds = funds.filter(f => f.status === 'closed');
  const pendingCompanyOutreach = receivedFromCompanies.filter(i => i.status === 'pending');

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo}>InvestorMatch</span>
        <div style={styles.navRight}>
          <span style={styles.email}>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <main style={styles.main}>
        {/* Header */}
        <div style={styles.topRow}>
          <div>
            <h1 style={styles.title}>{profile?.firm_name || 'Investor Dashboard'}</h1>
            <p style={styles.sub}>Manage your funds and track your investment activity.</p>
          </div>
          <Link to="/profile/investor/edit" style={styles.editProfileBtn}>✏️ Edit Profile</Link>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { label: 'Active Funds',   value: activeFunds.length || '—',         color: '#7c3aed' },
            { label: 'Matches',        value: matches.length || '—',             color: matches.length > 0 ? '#7c3aed' : '#6b7280' },
            { label: 'Inquiries Sent', value: sentByMe.length || '—',           color: sentByMe.length > 0 ? '#7c3aed' : '#6b7280' },
            { label: 'Incoming',       value: receivedFromCompanies.length || '—', color: pendingCompanyOutreach.length > 0 ? '#d97706' : receivedFromCompanies.length > 0 ? '#059669' : '#6b7280' },
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Funds section ── */}
        <div style={styles.fundsHeader}>
          <div>
            <h2 style={styles.fundsTitle}>My Funds</h2>
            <p style={styles.fundsSub}>Each fund has its own specific mandate used for matching.</p>
          </div>
          <Link to="/funds/new" style={styles.newFundBtn}>+ New Fund</Link>
        </div>

        {funds.length === 0 ? (
          <div style={styles.emptyFunds}>
            <div style={styles.emptyIcon}>💼</div>
            <h3 style={styles.emptyTitle}>No funds yet</h3>
            <p style={styles.emptyText}>Create your first fund to start matching with companies that fit your specific mandate.</p>
            <Link to="/funds/new" style={styles.emptyBtn}>Create Your First Fund</Link>
          </div>
        ) : (
          <>
            <div style={styles.fundGrid}>
              {activeFunds.map(fund => <FundCard key={fund.id} fund={fund} onClose={closeFund} closing={closingId === fund.id} onPortfolio={() => setPortfolioModal(fund)} />)}
            </div>

            {closedFunds.length > 0 && (
              <details style={styles.closedSection}>
                <summary style={styles.closedSummary}>Closed Funds ({closedFunds.length})</summary>
                <div style={{ ...styles.fundGrid, marginTop: '0.75rem', opacity: 0.65 }}>
                  {closedFunds.map(fund => <FundCard key={fund.id} fund={fund} onClose={closeFund} closing={closingId === fund.id} onPortfolio={() => setPortfolioModal(fund)} />)}
                </div>
              </details>
            )}
          </>
        )}

        {/* Company Matches */}
        <div style={styles.matchesSection}>
          <div style={styles.matchesHeader}>
            <div>
              <h2 style={styles.fundsTitle}>Company Matches</h2>
              <p style={styles.fundsSub}>
                {matches.length === 0
                  ? 'Set up a fund to start matching with companies.'
                  : `${matches.filter(m => m.match_type === 'strong').length} strong · ${matches.filter(m => m.match_type === 'good').length} good · ${matches.filter(m => m.match_type === 'possible').length} possible`}
              </p>
            </div>
          </div>

          {matches.length === 0 ? (
            <div style={{ ...styles.emptyFunds, border: '1px dashed #e5e7eb' }}>
              <div style={styles.emptyIcon}>🔍</div>
              <h3 style={styles.emptyTitle}>No matches yet</h3>
              <p style={styles.emptyText}>
                Companies will appear here once they create a fundraise round that fits your mandate.
              </p>
            </div>
          ) : (
            <div style={styles.matchList}>
              {matches.map(m => (
                <CompanyMatchCard
                  key={m.id}
                  match={m}
                  sentTypes={sentMap.get(m.raise_round_id) || new Set()}
                  onInquire={() => setInquiryModal(m)}
                  onMarkDeal={() => setDealModal(m)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sent Inquiries (investor → company) ── */}
        <div style={styles.sentSection}>
          <div style={styles.sentHeader}>
            <div>
              <h2 style={styles.fundsTitle}>Sent Inquiries</h2>
              <p style={styles.fundsSub}>
                {sentByMe.length === 0
                  ? 'Inquiries you send to companies will appear here.'
                  : `${sentByMe.length} sent · ${sentByMe.filter(i => i.status === 'responded').length} replied`}
              </p>
            </div>
            {sentByMe.filter(i => i.status === 'responded').length > 0 && (
              <span style={styles.respondedBadge}>
                {sentByMe.filter(i => i.status === 'responded').length} replied
              </span>
            )}
          </div>

          {sentByMe.length === 0 ? (
            <div style={{ ...styles.emptyFunds, border: '1px dashed #e5e7eb' }}>
              <div style={styles.emptyIcon}>✉️</div>
              <h3 style={styles.emptyTitle}>No inquiries sent yet</h3>
              <p style={styles.emptyText}>
                Click "✉ Inquire" on a company match card to reach out to founders.
              </p>
            </div>
          ) : (
            <div style={styles.sentList}>
              {sentByMe.map(inq => (
                <SentInquiryCard
                  key={inq.id}
                  inquiry={inq}
                  onOpen={() => setInvestorThreadModal(inq)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Incoming from Companies (company → investor) ── */}
        <div style={{ ...styles.sentSection, marginTop: '1.5rem' }}>
          <div style={styles.sentHeader}>
            <div>
              <h2 style={styles.fundsTitle}>Incoming from Companies</h2>
              <p style={styles.fundsSub}>
                {receivedFromCompanies.length === 0
                  ? 'Companies can proactively reach out to you — their messages appear here.'
                  : pendingCompanyOutreach.length > 0
                    ? `${pendingCompanyOutreach.length} new · ${receivedFromCompanies.length - pendingCompanyOutreach.length} seen`
                    : `${receivedFromCompanies.length} total`}
              </p>
            </div>
            {pendingCompanyOutreach.length > 0 && (
              <span style={{ ...styles.respondedBadge, background: '#fffbeb', color: '#92400e' }}>
                {pendingCompanyOutreach.length} new
              </span>
            )}
          </div>

          {receivedFromCompanies.length === 0 ? (
            <div style={{ ...styles.emptyFunds, border: '1px dashed #e5e7eb' }}>
              <div style={styles.emptyIcon}>📬</div>
              <h3 style={styles.emptyTitle}>No company outreach yet</h3>
              <p style={styles.emptyText}>
                When companies reach out to you directly, you can view and reply to them here.
              </p>
            </div>
          ) : (
            <div style={styles.sentList}>
              {receivedFromCompanies.map(inq => (
                <ReceivedOutreachCard
                  key={inq.id}
                  inquiry={inq}
                  onOpen={() => setInvestorThreadModal(inq)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Inquiry Modal */}
      {inquiryModal && (
        <InquiryModal
          match={inquiryModal}
          sentTypes={sentMap.get(inquiryModal.raise_round_id) || new Set()}
          onClose={() => setInquiryModal(null)}
          onSuccess={handleInquirySuccess}
        />
      )}

      {/* Investor Thread Modal — handles both sent inquiries and incoming from companies */}
      {investorThreadModal && (
        <InvestorThreadModal
          inquiry={investorThreadModal}
          onClose={() => setInvestorThreadModal(null)}
          onReply={(id) => {
            // Called when investor replies to a RECEIVED company outreach (status advance)
            setSentInquiries(qs =>
              qs.map(q => q.id === id && q.status === 'pending' ? { ...q, status: 'responded' } : q)
            );
          }}
          onPass={(id) => {
            setSentInquiries(qs => qs.map(q => q.id === id ? { ...q, status: 'passed' } : q));
            setInvestorThreadModal(null);
          }}
        />
      )}

      {/* Deal Modal */}
      {dealModal && (
        <DealModal
          match={dealModal}
          funds={funds.filter(f => f.status !== 'closed')}
          onClose={() => setDealModal(null)}
          onSaved={handleDealSaved}
        />
      )}

      {/* Fund Portfolio Modal */}
      {portfolioModal && (
        <FundPortfolioModal
          fund={portfolioModal}
          token={token}
          onClose={() => setPortfolioModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Fund Card ─── */

function FundCard({ fund, onClose, closing, onPortfolio }) {
  const meta = STATUS_META[fund.status] || STATUS_META.active;
  const sectors = (fund.sectors || []).slice(0, 3);
  const moreSectors = (fund.sectors || []).length - 3;
  const deployed = Number(fund.deployed_amount) || 0;

  function fmtMoney(v) {
    if (!v) return null;
    return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toLocaleString()}k`;
  }

  return (
    <div style={styles.fundCard}>
      <div style={styles.fundCardTop}>
        <div style={styles.fundCardLeft}>
          <span style={{ ...styles.statusBadge, background: meta.bg, color: meta.color }}>{meta.label}</span>
          <h3 style={styles.fundName}>{fund.name}</h3>
          {fund.vintage_year && <span style={styles.fundMeta}>Vintage {fund.vintage_year}</span>}
        </div>
        <div style={styles.fundCardActions}>
          <Link to={`/funds/${fund.id}/edit`} style={styles.actionLink}>Edit</Link>
          {fund.status !== 'closed' && (
            <button style={styles.closeBtn} onClick={() => onClose(fund.id)} disabled={closing}>
              {closing ? '...' : 'Close'}
            </button>
          )}
        </div>
      </div>

      <div style={styles.fundStats}>
        {fund.fund_size && (
          <div style={styles.fundStat}>
            <span style={styles.fundStatLabel}>Fund Size</span>
            <span style={styles.fundStatVal}>${(fund.fund_size / 1_000_000).toLocaleString()}M</span>
          </div>
        )}
        {deployed > 0 && (
          <div style={styles.fundStat}>
            <span style={styles.fundStatLabel}>Deployed</span>
            <span style={{ ...styles.fundStatVal, color: '#059669' }}>
              {fmtMoney(deployed)}{fund.fund_size ? ` / ${fmtMoney(fund.fund_size)}` : ''}
            </span>
          </div>
        )}
        {fund.deal_size_min && fund.deal_size_max && (
          <div style={styles.fundStat}>
            <span style={styles.fundStatLabel}>Deal Size</span>
            <span style={styles.fundStatVal}>${(fund.deal_size_min / 1000).toLocaleString()}k – ${(fund.deal_size_max / 1000).toLocaleString()}k</span>
          </div>
        )}
        {fund.redemption_date && (
          <div style={styles.fundStat}>
            <span style={styles.fundStatLabel}>Matures</span>
            <span style={styles.fundStatVal}>{new Date(fund.redemption_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
          </div>
        )}
      </div>

      {sectors.length > 0 && (
        <div style={styles.tagRow}>
          {sectors.map(s => <span key={s} style={styles.tag}>{s}</span>)}
          {moreSectors > 0 && <span style={styles.tagMore}>+{moreSectors}</span>}
        </div>
      )}

      {fund.thesis && (
        <p style={styles.thesis}>
          {fund.thesis.length > 110 ? fund.thesis.slice(0, 110) + '…' : fund.thesis}
        </p>
      )}

      {deployed > 0 && (
        <button style={styles.portfolioBtn} onClick={onPortfolio}>
          📊 View Portfolio
        </button>
      )}
    </div>
  );
}

/* ─── Company Match Card ─── */

function CompanyMatchCard({ match, sentTypes, onInquire, onMarkDeal }) {
  const mb = MATCH_BADGE[match.match_type] || MATCH_BADGE.possible;
  const sentCount = sentTypes?.size || 0;

  function fmtMoney(val) {
    if (!val) return null;
    return val >= 1_000_000 ? `$${(val / 1_000_000).toFixed(1)}M` : `$${(val / 1000).toLocaleString()}k`;
  }

  return (
    <div style={styles.matchCard}>
      {/* Top row */}
      <div style={styles.matchTop}>
        <div style={styles.matchLeft}>
          <span style={{ ...styles.statusBadge, background: mb.bg, color: mb.color }}>{mb.label}</span>
          <h3 style={styles.matchCompanyName}>{match.company_name || 'Company'}</h3>
        </div>
        <div style={styles.matchScore}>
          <span style={styles.matchScoreNum}>{match.score}</span>
          <span style={styles.matchScoreDen}>/100</span>
        </div>
      </div>

      {/* Company tags */}
      <div style={styles.tagRow}>
        {match.sector  && <span style={styles.tag}>{match.sector}</span>}
        {match.stage   && <span style={styles.tag}>{match.stage}</span>}
        {match.country && <span style={{ ...styles.tag, background: '#f0f9ff', color: '#0369a1' }}>{match.country}</span>}
      </div>

      {/* Round info */}
      <div style={styles.matchRoundInfo}>
        <span style={styles.matchRoundLabel}>Round:</span>
        <span style={styles.matchRoundName}>{match.round_name}</span>
        {match.fund_name
          ? <span style={styles.matchFundBadge}>📁 {match.fund_name}</span>
          : <span style={styles.matchFundBadge}>👤 General Profile</span>
        }
      </div>

      {/* Round financials */}
      <div style={styles.fundStats}>
        {match.raise_amount   && <MatchStat label="Raising"    value={fmtMoney(match.raise_amount)} />}
        {match.min_ticket     && <MatchStat label="Min Ticket" value={fmtMoney(match.min_ticket)} />}
        {match.equity_offered && <MatchStat label="Equity"     value={`${match.equity_offered}%`} />}
        {match.closing_date   && <MatchStat label="Closes"     value={new Date(match.closing_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />}
      </div>

      {/* One-liner */}
      {match.one_liner && (
        <p style={styles.thesis}>{match.one_liner}</p>
      )}

      {/* Reasons */}
      {match.match_reasons?.length > 0 && (
        <div style={styles.tagRow}>
          {match.match_reasons.map(r => (
            <span key={r} style={styles.reasonPill}>✓ {r}</span>
          ))}
        </div>
      )}

      {/* Inquire button */}
      <div style={styles.inquireRow}>
        {sentCount > 0 && (
          <span style={styles.sentBadge}>
            {sentCount} inquiry{sentCount > 1 ? ' types' : ''} sent
          </span>
        )}
        <button
          style={{
            ...styles.inquireBtn,
            ...(sentCount >= 4 ? styles.inquireBtnDisabled : {}),
          }}
          onClick={onInquire}
          disabled={sentCount >= 4}
        >
          {sentCount >= 4 ? '✓ All Sent' : sentCount > 0 ? 'Inquire Again' : '✉ Inquire'}
        </button>
      </div>

      {/* Deal row */}
      <div style={styles.dealRow}>
        {match.deal_status === 'completed' ? (
          <span style={styles.dealBadgeCompleted}>
            ✓ Invested{match.deal_amount ? ` · ${fmtMoney(match.deal_amount)}` : ''}
          </span>
        ) : match.deal_status === 'declined' ? (
          <span style={styles.dealBadgeDeclined}>✗ Not Pursuing</span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>No decision yet</span>
        )}
        <button
          style={match.deal_status ? styles.dealEditBtn : styles.dealMarkBtn}
          onClick={onMarkDeal}
        >
          {match.deal_status ? 'Edit' : '🤝 Mark Deal'}
        </button>
      </div>
    </div>
  );
}

/* ─── Inquiry Modal ─── */

function InquiryModal({ match, sentTypes, onClose, onSuccess }) {
  const { token } = useAuth();
  const [selectedType, setSelectedType] = useState(null);
  const [message, setMessage]           = useState('');
  const [sending, setSending]           = useState(false);
  const [error, setError]               = useState('');

  async function handleSubmit() {
    if (!selectedType) { setError('Please select a request type.'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          raise_round_id: match.raise_round_id,
          match_id:       match.id,
          request_type:   selectedType,
          message:        message.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send inquiry'); return; }
      onSuccess(data.inquiry);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        {/* Modal header */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Send Inquiry</h3>
            <p style={styles.modalSub}>
              {match.company_name} · <em>{match.round_name}</em>
            </p>
          </div>
          <button style={styles.modalCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Modal body */}
        <div style={styles.modalBody}>
          <p style={styles.fieldLabel}>What would you like to request?</p>
          <div style={styles.typeGrid}>
            {REQUEST_TYPES.map(rt => {
              const alreadySent = sentTypes.has(rt.type);
              const isSelected  = selectedType === rt.type;
              return (
                <button
                  key={rt.type}
                  title={alreadySent ? 'Already sent' : rt.desc}
                  style={{
                    ...styles.typeBtn,
                    ...(isSelected  ? styles.typeBtnSelected  : {}),
                    ...(alreadySent ? styles.typeBtnDisabled   : {}),
                  }}
                  onClick={() => !alreadySent && setSelectedType(rt.type)}
                  disabled={alreadySent}
                >
                  <span style={styles.typeIcon}>{rt.icon}</span>
                  <span style={styles.typeLabel}>{rt.label}</span>
                  {alreadySent && <span style={styles.typeSentBadge}>Sent ✓</span>}
                </button>
              );
            })}
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>
              Message <span style={styles.optional}>(optional)</span>
            </label>
            <textarea
              style={styles.textarea}
              rows={4}
              placeholder="Add context, specific questions, or introduce yourself..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}
        </div>

        {/* Modal footer */}
        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: (!selectedType || sending) ? 0.55 : 1,
              cursor:  (!selectedType || sending) ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={!selectedType || sending}
          >
            {sending ? 'Sending…' : 'Send Inquiry'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Small helpers ─── */

function MatchStat({ label, value }) {
  return (
    <div style={styles.fundStat}>
      <span style={styles.fundStatLabel}>{label}</span>
      <span style={styles.fundStatVal}>{value}</span>
    </div>
  );
}

/* ─── Utilities ─── */

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Sent Inquiry Card ─── */

function SentInquiryCard({ inquiry, onOpen }) {
  const rtm = INVESTOR_REQUEST_TYPE_META[inquiry.request_type] || { icon: '📩', label: inquiry.request_type };
  const ism = INQUIRY_STATUS_META[inquiry.status] || INQUIRY_STATUS_META.pending;
  const isReplied = inquiry.status === 'responded';

  return (
    <div style={{ ...styles.sentCard, ...(isReplied ? styles.sentCardReplied : {}) }}>
      <div style={styles.sentCardTop}>
        <div style={styles.sentCardLeft}>
          <span style={styles.sentTypeBadge}>{rtm.icon} {rtm.label}</span>
          <span style={{ ...styles.sentStatusBadge, background: ism.bg, color: ism.color }}>
            {ism.label}
          </span>
        </div>
        <span style={styles.sentTime}>{formatTimeAgo(inquiry.created_at)}</span>
      </div>

      <div style={styles.sentToRow}>
        <span style={styles.sentTo}>To:</span>
        <span style={styles.sentCompanyName}>{inquiry.company_name || 'Company'}</span>
        <span style={styles.sentRoundName}>· {inquiry.round_name}</span>
      </div>

      {inquiry.message && (
        <p style={styles.sentMsgPreview}>
          "{inquiry.message.length > 120 ? inquiry.message.slice(0, 120) + '…' : inquiry.message}"
        </p>
      )}

      <div style={styles.sentActions}>
        <button
          style={{ ...styles.viewSentBtn, ...(isReplied ? styles.viewSentBtnPrimary : {}) }}
          onClick={onOpen}
        >
          {isReplied ? '💬 View Reply' : '💬 View Thread'}
        </button>
      </div>
    </div>
  );
}

/* ─── Received Outreach Card (company → investor) ─── */

function ReceivedOutreachCard({ inquiry, onOpen }) {
  const rtm = INVESTOR_REQUEST_TYPE_META[inquiry.request_type] || { icon: '📩', label: inquiry.request_type };
  const ism = INQUIRY_STATUS_META[inquiry.status] || INQUIRY_STATUS_META.pending;
  const isNew = inquiry.status === 'pending';

  return (
    <div style={{ ...styles.sentCard, borderLeft: isNew ? '3px solid #d97706' : '3px solid transparent' }}>
      <div style={styles.sentCardTop}>
        <div style={styles.sentCardLeft}>
          <span style={{ ...styles.sentTypeBadge, background: '#eff6ff', color: '#1e40af' }}>{rtm.icon} {rtm.label}</span>
          <span style={{ ...styles.sentStatusBadge, background: ism.bg, color: ism.color }}>
            {ism.label}
          </span>
        </div>
        <span style={styles.sentTime}>{formatTimeAgo(inquiry.created_at)}</span>
      </div>

      <div style={styles.sentToRow}>
        <span style={styles.sentTo}>From:</span>
        <span style={styles.sentCompanyName}>{inquiry.company_name || 'Company'}</span>
        <span style={styles.sentRoundName}>· {inquiry.round_name}</span>
      </div>

      {inquiry.message && (
        <p style={styles.sentMsgPreview}>
          "{inquiry.message.length > 120 ? inquiry.message.slice(0, 120) + '…' : inquiry.message}"
        </p>
      )}

      <div style={styles.sentActions}>
        <button
          style={{ ...styles.viewSentBtn, ...(isNew ? styles.viewSentBtnPrimary : {}) }}
          onClick={onOpen}
        >
          {isNew ? '💬 Reply' : '💬 View Thread'}
        </button>
      </div>
    </div>
  );
}

/* ─── Investor Thread Modal ─── */

function InvestorThreadModal({ inquiry, onClose, onReply, onPass }) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [currentStatus, setCurrentStatus] = useState(inquiry.status);

  // isRecipient = true when a company sent this outreach to the investor
  const isRecipient = inquiry.initiated_by === 'company';

  const rtm = INVESTOR_REQUEST_TYPE_META[inquiry.request_type] || { icon: '📩', label: inquiry.request_type };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inquiries/${inquiry.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.messages) setMessages(d.messages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inquiry.id, token]);

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(ms => [...ms, data.message]);
        setReplyText('');
        // Auto-advance pending → responded only when investor (recipient) first replies
        if (isRecipient && currentStatus === 'pending') {
          setCurrentStatus('responded');
          onReply?.(inquiry.id);
        }
      }
    } catch { /* silent */ } finally { setSending(false); }
  }

  async function passInquiry() {
    try {
      await fetch(`/api/inquiries/${inquiry.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'passed' }),
      });
      onPass?.(inquiry.id);
    } catch { /* silent */ }
  }

  function fmt(dateStr) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{rtm.icon}</span>
              <h3 style={styles.modalTitle}>{rtm.label}</h3>
            </div>
            <p style={styles.modalSub}>
              {isRecipient ? 'From' : 'To'} <strong>{inquiry.company_name || 'Company'}</strong> · {inquiry.round_name}
            </p>
          </div>
          <button style={styles.modalCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Opening message fallback (before first thread entry loads) */}
        {inquiry.message && messages.length === 0 && !loading && (
          <div style={{ background: '#f8f9fb', borderBottom: '1px solid #f3f4f6', padding: '0.75rem 1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
              {inquiry.message}
            </p>
          </div>
        )}

        {/* Messages */}
        <div style={styles.threadMessages}>
          {loading ? (
            <p style={styles.threadLoading}>Loading thread…</p>
          ) : messages.length === 0 ? (
            <p style={styles.threadEmpty}>
              {inquiry.message
                ? (isRecipient ? 'Waiting for your reply.' : 'Waiting for the company to reply.')
                : 'No messages yet. Send a follow-up below.'}
            </p>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '78%', padding: '0.65rem 0.9rem', borderRadius: 12,
                    display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    ...(isMine
                      ? { background: '#7c3aed', color: '#fff', borderBottomRightRadius: 4 }
                      : { background: '#f3f4f6', color: '#1a1a2e', borderBottomLeftRadius: 4 }),
                  }}>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{msg.body}</p>
                    <span style={{ fontSize: '0.68rem', opacity: 0.7, alignSelf: 'flex-end' }}>{fmt(msg.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply box or passed notice */}
        {currentStatus === 'passed' ? (
          <div style={{ padding: '1rem 1.5rem', background: '#f9fafb', textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>
            This inquiry has been passed.
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '1rem 1.5rem', background: '#fafafa' }}>
            <textarea
              style={{ ...styles.textarea, marginBottom: '0.6rem' }}
              rows={3}
              placeholder="Add a follow-up message… (Ctrl+Enter to send)"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendReply(); }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {isRecipient && currentStatus === 'pending' ? (
                <button
                  style={{ padding: '0.45rem 1rem', border: '1px solid #e5e7eb', borderRadius: 7, background: '#fff', color: '#6b7280', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                  onClick={passInquiry}
                >
                  Pass
                </button>
              ) : <span />}
              <button
                style={{
                  ...styles.submitBtn,
                  opacity: (!replyText.trim() || sending) ? 0.55 : 1,
                  cursor:  (!replyText.trim() || sending) ? 'not-allowed' : 'pointer',
                }}
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Deal Modal ─── */

function DealModal({ match, funds, onClose, onSaved }) {
  const { token } = useAuth();
  const [step, setStep]         = useState('choose'); // 'choose' | 'complete'
  const [amount, setAmount]     = useState(match.deal_amount ? String(match.deal_amount) : '');
  const [fundId, setFundId]     = useState(match.deal_fund_id || match.fund_id || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submitDeal(deal_status) {
    setSaving(true);
    setError('');
    try {
      const body = { deal_status };
      if (deal_status === 'completed') {
        if (amount) body.deal_amount = parseInt(amount, 10);
        if (fundId) body.deal_fund_id = fundId;
      }
      const res = await fetch(`/api/matches/${match.id}/deal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      onSaved(data.match);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...styles.modal, maxWidth: 440 }}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Mark Deal Outcome</h3>
            <p style={styles.modalSub}>{match.company_name} · {match.round_name}</p>
          </div>
          <button style={styles.modalCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          {step === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                What is the outcome of this match?
              </p>
              <button
                style={styles.dealChoiceBtn}
                onClick={() => setStep('complete')}
              >
                <span style={{ fontSize: '1.4rem' }}>✅</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.9rem' }}>Deal Completed</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Investment agreed — specify amount & fund</div>
                </div>
              </button>
              <button
                style={{ ...styles.dealChoiceBtn, borderColor: '#fca5a5' }}
                onClick={() => submitDeal('declined')}
                disabled={saving}
              >
                <span style={{ fontSize: '1.4rem' }}>❌</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '0.9rem' }}>Not Continuing</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Pass on this match for now</div>
                </div>
              </button>
              {error && <p style={styles.errorText}>{error}</p>}
            </div>
          )}

          {step === 'complete' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={styles.fieldLabel}>
                  Investment Amount <span style={styles.optional}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.875rem' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 500000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{ ...styles.textarea, paddingLeft: '1.75rem', height: 42, resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>
                {amount && Number(amount) > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.3rem' }}>
                    = ${(Number(amount) / 1000).toLocaleString()}k
                  </p>
                )}
              </div>

              <div>
                <label style={styles.fieldLabel}>Book to Fund</label>
                {funds.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>No active funds available.</p>
                ) : (
                  <select
                    value={fundId}
                    onChange={e => setFundId(e.target.value)}
                    style={{ ...styles.textarea, height: 42, resize: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    <option value="">— General (no fund) —</option>
                    {funds.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}{f.vintage_year ? ` (${f.vintage_year})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {error && <p style={styles.errorText}>{error}</p>}
            </div>
          )}
        </div>

        {step === 'complete' && (
          <div style={styles.modalFooter}>
            <button style={styles.cancelBtn} onClick={() => setStep('choose')}>← Back</button>
            <button
              style={{ ...styles.submitBtn, background: '#059669', opacity: saving ? 0.6 : 1 }}
              onClick={() => submitDeal('completed')}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Confirm Deal ✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Fund Portfolio Modal ─── */

function FundPortfolioModal({ fund, token, onClose }) {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`/api/funds/${fund.id}/portfolio`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.portfolio) setPortfolio(d.portfolio); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fund.id, token]);

  function fmtMoney(v) {
    if (!v) return null;
    return v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toLocaleString()}k`;
  }

  const totalDeployed = portfolio.reduce((acc, m) => acc + (Number(m.deal_amount) || 0), 0);

  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...styles.modal, maxWidth: 520 }}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>📊 Portfolio — {fund.name}</h3>
            {totalDeployed > 0 && (
              <p style={styles.modalSub}>Total deployed: <strong style={{ color: '#059669' }}>{fmtMoney(totalDeployed)}</strong></p>
            )}
          </div>
          <button style={styles.modalCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ ...styles.modalBody, padding: '0.75rem 0' }}>
          {loading ? (
            <p style={{ ...styles.threadLoading, padding: '2rem' }}>Loading portfolio…</p>
          ) : portfolio.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No completed deals via this fund yet.</p>
            </div>
          ) : (
            portfolio.map(item => (
              <div key={item.id} style={styles.portfolioRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.25rem' }}>
                    {item.company_name}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {item.sector && <span style={styles.tag}>{item.sector}</span>}
                    {item.stage  && <span style={styles.tag}>{item.stage}</span>}
                    <span style={{ ...styles.tag, background: '#f0fdf4', color: '#166534' }}>{item.round_name}</span>
                  </div>
                </div>
                {item.deal_amount && (
                  <span style={styles.portfolioAmount}>{fmtMoney(item.deal_amount)}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */

const styles = {
  page:    { minHeight: '100vh', background: '#f8f9fb' },
  nav:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo:    { fontWeight: 700, fontSize: '1rem', color: '#7c3aed' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  email:   { fontSize: '0.85rem', color: '#6b7280' },
  logoutBtn: { padding: '0.4rem 0.9rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
  main:    { maxWidth: 920, margin: '0 auto', padding: '2.5rem 1.5rem' },
  topRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title:   { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.4rem' },
  sub:     { fontSize: '0.95rem', color: '#6b7280' },
  editProfileBtn: { padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', alignSelf: 'center' },

  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: '#fff', borderRadius: 12, padding: '1.25rem 1.75rem', border: '1px solid #e5e7eb', flex: '1 1 160px', textAlign: 'center' },
  statValue: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  statLabel: { fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },

  // Funds header
  fundsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' },
  fundsTitle:  { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.2rem' },
  fundsSub:    { fontSize: '0.85rem', color: '#6b7280' },
  newFundBtn:  { padding: '0.6rem 1.1rem', background: '#7c3aed', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' },

  // Fund grid
  fundGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  fundCard:       { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  fundCardTop:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' },
  fundCardLeft:   { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  fundCardActions: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 },
  statusBadge:    { display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, width: 'fit-content' },
  fundName:       { fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' },
  fundMeta:       { fontSize: '0.78rem', color: '#9ca3af' },
  actionLink:     { fontSize: '0.8rem', color: '#7c3aed', fontWeight: 500, padding: '0.3rem 0.65rem', border: '1px solid #e5e7eb', borderRadius: 6 },
  closeBtn:       { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500, padding: '0.3rem 0.65rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' },
  fundStats:      { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  fundStat:       { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  fundStatLabel:  { fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' },
  fundStatVal:    { fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' },
  tagRow:         { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  tag:            { padding: '0.2rem 0.6rem', background: '#f5f3ff', color: '#7c3aed', borderRadius: 999, fontSize: '0.78rem', fontWeight: 500 },
  tagMore:        { padding: '0.2rem 0.6rem', background: '#f3f4f6', color: '#9ca3af', borderRadius: 999, fontSize: '0.78rem', fontWeight: 500 },
  thesis:         { fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.5, borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', margin: 0 },
  closedSection:  { marginTop: '0.5rem' },
  closedSummary:  { fontSize: '0.85rem', color: '#9ca3af', cursor: 'pointer', fontWeight: 500 },

  // Empty states
  emptyFunds: { background: '#fff', borderRadius: 16, border: '1px dashed #e5e7eb', padding: '3rem 2rem', textAlign: 'center' },
  emptyIcon:  { fontSize: '2.25rem', marginBottom: '0.75rem' },
  emptyTitle: { fontSize: '1rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '0.4rem' },
  emptyText:  { fontSize: '0.875rem', color: '#6b7280', maxWidth: 380, margin: '0 auto 1.25rem', lineHeight: 1.6 },
  emptyBtn:   { display: 'inline-block', padding: '0.65rem 1.25rem', background: '#7c3aed', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem' },

  // Matches section
  matchesSection: { marginTop: '1.5rem' },
  matchesHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' },
  matchList:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },

  // Match card
  matchCard:       { background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  matchTop:        { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' },
  matchLeft:       { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  matchCompanyName: { fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  matchScore:      { display: 'flex', alignItems: 'baseline', gap: '0.1rem', flexShrink: 0 },
  matchScoreNum:   { fontSize: '1.4rem', fontWeight: 700, color: '#7c3aed' },
  matchScoreDen:   { fontSize: '0.8rem', color: '#9ca3af' },
  matchRoundInfo:  { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  matchRoundLabel: { fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 },
  matchRoundName:  { fontSize: '0.82rem', fontWeight: 600, color: '#1a1a2e' },
  matchFundBadge:  { fontSize: '0.72rem', background: '#f5f3ff', color: '#7c3aed', padding: '0.15rem 0.5rem', borderRadius: 999 },
  reasonPill:      { padding: '0.2rem 0.6rem', background: '#f5f3ff', color: '#7c3aed', borderRadius: 999, fontSize: '0.73rem', fontWeight: 500 },

  // Inquire button row
  inquireRow:          { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.6rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginTop: '0.1rem' },
  sentBadge:           { fontSize: '0.72rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.2rem 0.6rem', borderRadius: 999, fontWeight: 500 },
  inquireBtn:          { padding: '0.45rem 1rem', background: '#7c3aed', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', border: 'none', cursor: 'pointer' },
  inquireBtnDisabled:  { background: '#e5e7eb', color: '#9ca3af', cursor: 'default' },

  // Modal overlay + container
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
    maxHeight: '90vh', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.4rem 1.5rem 1rem', borderBottom: '1px solid #f3f4f6',
  },
  modalTitle:    { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.2rem' },
  modalSub:      { fontSize: '0.82rem', color: '#6b7280' },
  modalCloseBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9ca3af', padding: '0.2rem 0.4rem', lineHeight: 1 },
  modalBody:     { padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 },
  fieldLabel:    { fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.6rem', display: 'block' },
  optional:      { color: '#9ca3af', fontWeight: 400 },
  fieldGroup:    { marginTop: '1.25rem' },

  // Request type grid
  typeGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.5rem' },
  typeBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem',
    padding: '0.75rem 1rem', borderRadius: 10, border: '2px solid #e5e7eb',
    background: '#fff', cursor: 'pointer', textAlign: 'left', position: 'relative',
    transition: 'border-color 0.15s, background 0.15s',
  },
  typeBtnSelected: { borderColor: '#7c3aed', background: '#faf5ff' },
  typeBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', background: '#f9fafb' },
  typeIcon:    { fontSize: '1.25rem' },
  typeLabel:   { fontSize: '0.8rem', fontWeight: 600, color: '#1a1a2e' },
  typeSentBadge: {
    position: 'absolute', top: '0.4rem', right: '0.5rem',
    fontSize: '0.65rem', color: '#059669', fontWeight: 700,
  },

  // Textarea
  textarea: {
    width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #d1d5db',
    fontSize: '0.875rem', color: '#1a1a2e', resize: 'vertical', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  },

  errorText:  { fontSize: '0.82rem', color: '#dc2626', marginTop: '0.5rem' },

  // Modal footer
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6' },
  cancelBtn:   { padding: '0.55rem 1.1rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  submitBtn:   { padding: '0.55rem 1.25rem', background: '#7c3aed', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', border: 'none' },

  // Thread messages (shared by InvestorThreadModal)
  threadMessages: { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 120 },
  threadLoading:  { color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' },
  threadEmpty:    { color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' },

  // Sent Inquiries section
  sentSection:  { marginTop: '1.5rem', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' },
  sentHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '0.75rem' },
  respondedBadge: { padding: '0.3rem 0.75rem', background: '#ecfdf5', color: '#065f46', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600 },
  sentList:     { display: 'flex', flexDirection: 'column' },

  // Sent Inquiry Card
  sentCard:         { padding: '1.1rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sentCardReplied:  { borderLeft: '3px solid #7c3aed' },
  sentCardTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' },
  sentCardLeft:     { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  sentTypeBadge:    { fontSize: '0.8rem', fontWeight: 600, color: '#1a1a2e', background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: 999 },
  sentStatusBadge:  { fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999 },
  sentTime:         { fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0 },
  sentToRow:        { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  sentTo:           { fontSize: '0.78rem', color: '#9ca3af' },
  sentCompanyName:  { fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e' },
  sentRoundName:    { fontSize: '0.78rem', color: '#6b7280' },
  sentMsgPreview:   { fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5, margin: 0, borderLeft: '2px solid #e5e7eb', paddingLeft: '0.75rem' },
  sentActions:      { display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' },
  viewSentBtn:      { padding: '0.4rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.82rem', color: '#374151', fontWeight: 500, background: '#fff', cursor: 'pointer' },
  viewSentBtnPrimary: { background: '#7c3aed', color: '#fff', border: '1px solid #7c3aed' },

  // Portfolio button on fund card (full-width, bottom of card)
  portfolioBtn: {
    display: 'block', width: '100%', padding: '0.55rem',
    background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
    borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', textAlign: 'center',
  },

  // Deal row on match card
  dealRow:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.6rem', marginTop: '-0.1rem' },
  dealBadgeCompleted: { fontSize: '0.75rem', fontWeight: 700, color: '#065f46', background: '#ecfdf5', padding: '0.25rem 0.65rem', borderRadius: 999 },
  dealBadgeDeclined:  { fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '0.25rem 0.65rem', borderRadius: 999 },
  dealMarkBtn:       { padding: '0.35rem 0.8rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer' },
  dealEditBtn:       { padding: '0.35rem 0.7rem', fontSize: '0.75rem', fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#7c3aed', cursor: 'pointer' },

  // Deal modal choice buttons
  dealChoiceBtn: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '1rem 1.25rem', borderRadius: 12, border: '2px solid #e5e7eb',
    background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%',
    transition: 'border-color 0.15s, background 0.15s',
  },

  // Portfolio modal row
  portfolioRow:   { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.5rem', borderBottom: '1px solid #f3f4f6' },
  portfolioAmount: { fontSize: '0.95rem', fontWeight: 700, color: '#059669', flexShrink: 0 },
};
