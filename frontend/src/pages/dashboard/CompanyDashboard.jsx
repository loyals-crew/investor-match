import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const REVENUE_LABEL = { pre_revenue: 'Pre-Revenue', generating: 'Revenue Generating' };

const STATUS_COLOR = {
  open:    { bg: '#ecfdf5', color: '#065f46', label: 'Open' },
  closing: { bg: '#fffbeb', color: '#92400e', label: 'Closing' },
  closed:  { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
};

// Inquiry types that INVESTORS send to companies
const REQUEST_TYPE_META = {
  meeting:       { icon: '📅', label: 'Request Meeting' },
  pitch_deck:    { icon: '📄', label: 'Request Pitch Deck' },
  financials:    { icon: '💰', label: 'Request Financials' },
  question:      { icon: '💬', label: 'Question' },
  // Company-initiated types
  pitch_meeting: { icon: '🎤', label: 'Invite to Pitch' },
  share_deck:    { icon: '📊', label: 'Share Our Deck' },
  share_traction:{ icon: '📈', label: 'Share Traction' },
  intro:         { icon: '👋', label: 'Introduce Ourselves' },
};

// Outreach types that COMPANIES initiate to investors
const COMPANY_OUTREACH_TYPES = [
  { type: 'pitch_meeting', icon: '🎤', label: 'Invite to Pitch',      desc: 'Invite the investor to a pitch session' },
  { type: 'share_deck',    icon: '📊', label: 'Share Our Deck',       desc: 'Send them your pitch deck proactively' },
  { type: 'share_traction',icon: '📈', label: 'Share Traction',       desc: 'Show off your latest growth metrics' },
  { type: 'intro',         icon: '👋', label: 'Introduce Ourselves',  desc: 'Send a brief company introduction' },
];

const INQUIRY_STATUS_META = {
  pending:   { bg: '#fffbeb', color: '#92400e', label: 'Pending' },
  responded: { bg: '#ecfdf5', color: '#065f46', label: 'Responded' },
  passed:    { bg: '#f3f4f6', color: '#9ca3af', label: 'Passed' },
};

export default function CompanyDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]             = useState(null);
  const [rounds, setRounds]               = useState([]);
  const [matches, setMatches]             = useState([]);
  const [inquiries, setInquiries]         = useState([]);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [threadModal, setThreadModal]     = useState(null);   // received inquiry
  const [outreachModal, setOutreachModal] = useState(null);   // { match } — company initiates
  const [outreachThread, setOutreachThread] = useState(null); // sent outreach thread view

  useEffect(() => {
    fetch('/api/companies/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});

    fetch('/api/raises', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.rounds) setRounds(d.rounds); })
      .catch(() => {});

    fetch('/api/matches', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.matches) setMatches(d.matches); })
      .catch(() => {});

    fetch('/api/inquiries', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.inquiries) setInquiries(d.inquiries); })
      .catch(() => {});
  }, [token]);

  function handleLogout() { logout(); navigate('/'); }

  async function handleCloseRound(id) {
    try {
      await fetch(`/api/raises/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRounds(rs => rs.map(r => r.id === id ? { ...r, status: 'closed' } : r));
    } catch { /* ignore */ }
  }

  // Called when company replies to a RECEIVED inquiry (investor-initiated)
  function handleThreadReply(inquiryId) {
    setInquiries(qs =>
      qs.map(q => q.id === inquiryId && q.status === 'pending' ? { ...q, status: 'responded' } : q)
    );
  }

  function handleThreadPass(inquiryId) {
    setInquiries(qs => qs.map(q => q.id === inquiryId ? { ...q, status: 'passed' } : q));
  }

  // Called after company creates a new outreach
  function handleOutreachCreated(newInquiry) {
    setInquiries(qs => [newInquiry, ...qs]);
    setOutreachModal(null);
  }

  // Split by direction
  const receivedInquiries = inquiries.filter(i => i.initiated_by !== 'company'); // investor → company
  const sentOutreach      = inquiries.filter(i => i.initiated_by === 'company'); // company → investor

  // Build a map: `${investor_id}_${raise_round_id}` → Set<request_type>
  // Used to grey-out already-sent types in the outreach modal
  const outreachMap = new Map();
  for (const inq of sentOutreach) {
    const key = `${inq.investor_id}_${inq.raise_round_id}`;
    if (!outreachMap.has(key)) outreachMap.set(key, new Set());
    outreachMap.get(key).add(inq.request_type);
  }

  const activeRounds         = rounds.filter(r => r.status !== 'closed');
  const pendingInquiries     = receivedInquiries.filter(q => q.status === 'pending');
  const outreachWithReplies  = sentOutreach.filter(i => i.status === 'responded');

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.logo}>InvestorMatch</span>
        <div style={S.navRight}>
          <span style={S.email}>{user?.email}</span>
          <button style={S.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <main style={S.main}>
        {/* Header */}
        <div style={S.topRow}>
          <div>
            <h1 style={S.title}>{profile?.company_name || 'Company Dashboard'}</h1>
            <p style={S.sub}>
              {profile?.one_liner || 'Manage your profile and track investor interest.'}
            </p>
          </div>
          <Link to="/profile/company/edit" style={S.editProfileBtn}>✏️ Edit Profile</Link>
        </div>

        {/* Stats */}
        <div style={S.statsRow}>
          {[
            { label: 'Stage',            value: profile?.stage || '—',                    color: profile?.stage ? '#059669' : '#6b7280' },
            { label: 'Active Rounds',    value: activeRounds.length || '—',               color: activeRounds.length > 0 ? '#059669' : '#6b7280' },
            { label: 'Investor Matches', value: matches.length || '—',                    color: matches.length > 0 ? '#059669' : '#6b7280' },
            { label: 'Inquiries',        value: receivedInquiries.length || '—',          color: pendingInquiries.length > 0 ? '#d97706' : receivedInquiries.length > 0 ? '#059669' : '#6b7280' },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Collapsible Company Profile */}
        {profile && (
          <div style={S.profileCard}>
            <button
              style={S.profileHeader}
              onClick={() => setProfileOpen(o => !o)}
              aria-expanded={profileOpen}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ ...S.chevron, transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▾
                </span>
                <div>
                  <h2 style={S.profileTitle}>Company Profile</h2>
                  <p style={S.profileSub}>Your public profile shown to matched investors.</p>
                </div>
              </div>
            </button>

            {profileOpen && (
              <div style={S.profileGrid}>
                <ProfileSection title="Business">
                  <ProfileRow label="Sector"       value={profile.sector} />
                  <ProfileRow label="Stage"        value={profile.stage} />
                  <ProfileRow label="Model"        value={profile.business_model} />
                  <ProfileRow label="Team Size"    value={profile.team_size} />
                  {profile.country    && <ProfileRow label="Country"    value={profile.country} />}
                  {profile.legal_type && <ProfileRow label="Legal Type" value={profile.legal_type} />}
                  {profile.website && (
                    <ProfileRow label="Website" value={
                      <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: '#059669' }}>
                        {profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    } />
                  )}
                </ProfileSection>

                <ProfileSection title="Traction">
                  {profile.revenue_status && (
                    <ProfileRow label="Revenue" value={REVENUE_LABEL[profile.revenue_status] || profile.revenue_status} />
                  )}
                  {profile.annual_revenue && (
                    <ProfileRow label="Annual Rev" value={`$${(profile.annual_revenue / 1000).toLocaleString()}k / yr`} />
                  )}
                  {profile.mrr && (
                    <ProfileRow label="MRR" value={`$${(profile.mrr / 1000).toLocaleString()}k`} />
                  )}
                  {profile.is_profitable !== null && (
                    <ProfileRow label="Profitable" value={profile.is_profitable ? 'Yes ✓' : 'Not yet'} />
                  )}
                  {profile.has_previous_funding !== null && (
                    <ProfileRow
                      label="Prev. Raised"
                      value={
                        profile.has_previous_funding
                          ? (profile.previous_funding ? `$${(profile.previous_funding / 1000).toLocaleString()}k` : 'Yes')
                          : 'No'
                      }
                    />
                  )}
                </ProfileSection>

                {profile.description && (
                  <div style={S.descBlock}>
                    <div style={S.descLabel}>About</div>
                    <p style={S.descText}>{profile.description}</p>
                  </div>
                )}

                {profile.target_market && (
                  <div style={S.descBlock}>
                    <div style={S.descLabel}>Target Market</div>
                    <p style={S.descText}>{profile.target_market}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fund Raise Rounds */}
        <div style={S.raiseSection}>
          <div style={S.raiseHeader}>
            <div>
              <h2 style={S.raiseTitle}>Fundraise Rounds</h2>
              <p style={S.raiseSub}>
                {rounds.length === 0
                  ? 'Create a round to start matching with investors.'
                  : `${activeRounds.length} active · ${rounds.length - activeRounds.length} closed`}
              </p>
            </div>
            <Link to="/raises/new" style={S.raiseBtn}>+ New Round</Link>
          </div>

          {rounds.length === 0 ? (
            <div style={S.raiseEmpty}>
              <div style={S.raiseEmptyIcon}>💰</div>
              <p style={S.raiseEmptyText}>No fundraise rounds yet. Create your first round to get matched with investors.</p>
            </div>
          ) : (
            <div style={S.roundsList}>
              {rounds.map(round => (
                <RoundCard
                  key={round.id}
                  round={round}
                  onClose={() => handleCloseRound(round.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Investor Matches */}
        <div style={S.raiseSection}>
          <div style={S.raiseHeader}>
            <div>
              <h2 style={S.raiseTitle}>Investor Matches</h2>
              <p style={S.raiseSub}>
                {matches.length === 0
                  ? 'Create a fundraise round to start seeing matched investors.'
                  : `${matches.filter(m => m.match_type === 'strong').length} strong · ${matches.filter(m => m.match_type === 'good').length} good · ${matches.filter(m => m.match_type === 'possible').length} possible`}
              </p>
            </div>
          </div>

          {matches.length === 0 ? (
            <div style={S.raiseEmpty}>
              <div style={S.raiseEmptyIcon}>🔍</div>
              <p style={S.raiseEmptyText}>
                No matches yet. Create or update a fundraise round to trigger matching.
              </p>
            </div>
          ) : (
            <div style={S.roundsList}>
              {matches.map(m => {
                const sentTypes = outreachMap.get(`${m.investor_id}_${m.raise_round_id}`) || new Set();
                return (
                  <MatchCard
                    key={m.id}
                    match={m}
                    sentTypes={sentTypes}
                    onReachOut={() => setOutreachModal({ match: m, sentTypes })}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Incoming Inquiries (investor → company) ── */}
        <div style={S.raiseSection}>
          <div style={S.raiseHeader}>
            <div>
              <h2 style={S.raiseTitle}>Incoming Inquiries</h2>
              <p style={S.raiseSub}>
                {receivedInquiries.length === 0
                  ? 'Investor requests will appear here when they reach out.'
                  : pendingInquiries.length > 0
                    ? `${pendingInquiries.length} pending · ${receivedInquiries.length - pendingInquiries.length} replied`
                    : `${receivedInquiries.length} total — all replied`}
              </p>
            </div>
            {pendingInquiries.length > 0 && (
              <span style={S.pendingBadge}>{pendingInquiries.length} pending</span>
            )}
          </div>

          {receivedInquiries.length === 0 ? (
            <div style={S.raiseEmpty}>
              <div style={S.raiseEmptyIcon}>✉️</div>
              <p style={S.raiseEmptyText}>
                No inquiries yet. Once investors reach out, you can respond to them here.
              </p>
            </div>
          ) : (
            <div style={S.roundsList}>
              {receivedInquiries.map(inq => (
                <InquiryCard
                  key={inq.id}
                  inquiry={inq}
                  onOpen={() => setThreadModal(inq)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sent Outreach (company → investor) ── */}
        <div style={S.raiseSection}>
          <div style={S.raiseHeader}>
            <div>
              <h2 style={S.raiseTitle}>Sent Outreach</h2>
              <p style={S.raiseSub}>
                {sentOutreach.length === 0
                  ? 'Reach out to matched investors using the "Reach Out" button on any match.'
                  : outreachWithReplies.length > 0
                    ? `${sentOutreach.length} sent · ${outreachWithReplies.length} replied`
                    : `${sentOutreach.length} sent · awaiting responses`}
              </p>
            </div>
            {outreachWithReplies.length > 0 && (
              <span style={{ ...S.pendingBadge, background: '#ecfdf5', color: '#065f46' }}>
                {outreachWithReplies.length} replied
              </span>
            )}
          </div>

          {sentOutreach.length === 0 ? (
            <div style={S.raiseEmpty}>
              <div style={S.raiseEmptyIcon}>📤</div>
              <p style={S.raiseEmptyText}>
                Don't wait — proactively reach out to matched investors to introduce your company.
              </p>
            </div>
          ) : (
            <div style={S.roundsList}>
              {sentOutreach.map(inq => (
                <OutreachCard
                  key={inq.id}
                  inquiry={inq}
                  onOpen={() => setOutreachThread(inq)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Thread Modal — for received inquiries */}
      {threadModal && (
        <ThreadModal
          inquiry={threadModal}
          onClose={() => setThreadModal(null)}
          onReply={handleThreadReply}
          onPass={(id) => { handleThreadPass(id); setThreadModal(null); }}
        />
      )}

      {/* Outreach Thread Modal — for sent outreach */}
      {outreachThread && (
        <ThreadModal
          inquiry={outreachThread}
          onClose={() => setOutreachThread(null)}
          onReply={() => {}} // company replying doesn't change status
          onPass={null}      // company can't pass their own sent outreach
          companySent
        />
      )}

      {/* Company Outreach Modal */}
      {outreachModal && (
        <CompanyOutreachModal
          match={outreachModal.match}
          sentTypes={outreachModal.sentTypes}
          token={token}
          onClose={() => setOutreachModal(null)}
          onCreated={handleOutreachCreated}
        />
      )}
    </div>
  );
}

/* ─── Round Card ─── */

function RoundCard({ round, onClose }) {
  const sc = STATUS_COLOR[round.status] || STATUS_COLOR.open;

  return (
    <div style={S.roundCard}>
      <div style={S.roundTop}>
        <div style={S.roundLeft}>
          <span style={{ ...S.roundBadge, background: sc.bg, color: sc.color }}>{sc.label}</span>
          <h3 style={S.roundName}>{round.round_name}</h3>
        </div>
        <div style={S.roundActions}>
          <Link to={`/raises/${round.id}/edit`} style={S.roundEditBtn}>Edit</Link>
          {round.status !== 'closed' && (
            <button style={S.roundCloseBtn} onClick={onClose}>Close Round</button>
          )}
        </div>
      </div>

      <div style={S.roundMeta}>
        {round.raise_amount && (
          <RoundMetaItem label="Raising"   value={`$${(round.raise_amount / 1000).toLocaleString()}k`} />
        )}
        {round.investment_types?.length > 0 && (
          <RoundMetaItem label="Type"      value={round.investment_types.join(', ')} />
        )}
        {round.equity_offered && (
          <RoundMetaItem label="Equity"    value={`${round.equity_offered}%`} />
        )}
        {round.pre_money_valuation && (
          <RoundMetaItem label="Pre-Money" value={`$${(round.pre_money_valuation / 1_000_000).toFixed(1)}M`} />
        )}
        {round.min_ticket && (
          <RoundMetaItem label="Min Ticket" value={`$${(round.min_ticket / 1000).toLocaleString()}k`} />
        )}
        {round.closing_date && (
          <RoundMetaItem label="Closes" value={new Date(round.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
        )}
      </div>

      {round.use_of_funds && (
        <p style={S.roundUseOfFunds}>{round.use_of_funds}</p>
      )}
    </div>
  );
}

function RoundMetaItem({ label, value }) {
  return (
    <div style={S.roundMetaItem}>
      <span style={S.roundMetaLabel}>{label}</span>
      <span style={S.roundMetaValue}>{value}</span>
    </div>
  );
}

/* ─── Match Card ─── */

const MATCH_TYPE_STYLE = {
  strong:   { bg: '#ecfdf5', color: '#065f46', label: 'Strong Match' },
  good:     { bg: '#eff6ff', color: '#1e40af', label: 'Good Match' },
  possible: { bg: '#fefce8', color: '#854d0e', label: 'Possible Match' },
};

function MatchCard({ match, sentTypes, onReachOut }) {
  const mt = MATCH_TYPE_STYLE[match.match_type] || MATCH_TYPE_STYLE.possible;
  const ticketMin = match.fund_id ? match.deal_size_min : match.ticket_min;
  const ticketMax = match.fund_id ? match.deal_size_max : match.ticket_max;
  const sentCount = sentTypes?.size || 0;

  function fmtTicket(val) {
    if (!val) return null;
    return val >= 1_000_000 ? `$${(val / 1_000_000).toFixed(1)}M` : `$${(val / 1000).toLocaleString()}k`;
  }

  return (
    <div style={S.roundCard}>
      <div style={S.roundTop}>
        <div style={S.roundLeft}>
          <span style={{ ...S.roundBadge, background: mt.bg, color: mt.color }}>{mt.label}</span>
          <h3 style={S.roundName}>{match.investor_firm || match.investor_contact || 'Investor'}</h3>
          {match.fund_name && (
            <span style={S.matchFundTag}>📁 {match.fund_name}</span>
          )}
        </div>
        <div style={S.matchScore}>
          <span style={S.matchScoreNum}>{match.score}</span>
          <span style={S.matchScoreDen}>/100</span>
        </div>
      </div>

      <div style={S.matchRoundTag}>
        For: <strong>{match.round_name}</strong>
      </div>

      {(ticketMin || ticketMax) && (
        <div style={S.roundMeta}>
          {ticketMin && <RoundMetaItem label="Min Ticket" value={fmtTicket(ticketMin)} />}
          {ticketMax && <RoundMetaItem label="Max Ticket" value={fmtTicket(ticketMax)} />}
        </div>
      )}

      {match.match_reasons?.length > 0 && (
        <div style={S.reasonPills}>
          {match.match_reasons.map(r => (
            <span key={r} style={S.reasonPill}>✓ {r}</span>
          ))}
        </div>
      )}

      {/* Reach Out row */}
      <div style={S.reachOutRow}>
        {sentCount > 0 && (
          <span style={S.sentOutreachBadge}>
            {sentCount} outreach sent
          </span>
        )}
        <button
          style={sentCount >= COMPANY_OUTREACH_TYPES.length ? S.reachOutBtnDisabled : S.reachOutBtn}
          onClick={onReachOut}
          disabled={sentCount >= COMPANY_OUTREACH_TYPES.length}
        >
          📤 Reach Out
        </button>
      </div>
    </div>
  );
}

/* ─── Inquiry Card (received from investors) ─── */

function InquiryCard({ inquiry, onOpen }) {
  const rtm = REQUEST_TYPE_META[inquiry.request_type] || { icon: '📩', label: inquiry.request_type };
  const ism = INQUIRY_STATUS_META[inquiry.status]     || INQUIRY_STATUS_META.pending;
  const timeAgo = formatTimeAgo(inquiry.created_at);

  return (
    <div style={{ ...S.roundCard, ...(inquiry.status === 'pending' ? S.inquiryCardPending : {}) }}>
      <div style={S.roundTop}>
        <div style={S.roundLeft}>
          <span style={S.inquiryTypeBadge}>
            {rtm.icon} {rtm.label}
          </span>
          <span style={{ ...S.inquiryStatusBadge, background: ism.bg, color: ism.color }}>
            {ism.label}
          </span>
        </div>
        <span style={S.inquiryTime}>{timeAgo}</span>
      </div>

      <div style={S.inquiryInvestorRow}>
        <span style={S.inquiryFrom}>From:</span>
        <span style={S.inquiryInvestorName}>
          {inquiry.investor_firm || inquiry.investor_contact || 'Investor'}
        </span>
        <span style={S.inquiryRoundName}>· {inquiry.round_name}</span>
      </div>

      {inquiry.message && (
        <p style={S.inquiryMsgPreview}>
          "{inquiry.message.length > 120 ? inquiry.message.slice(0, 120) + '…' : inquiry.message}"
        </p>
      )}

      <div style={S.inquiryActions}>
        <button
          style={{
            ...S.viewThreadBtn,
            ...(inquiry.status === 'pending' ? S.viewThreadBtnPrimary : {}),
          }}
          onClick={onOpen}
        >
          {inquiry.status === 'pending' ? '💬 Reply' : '💬 View Thread'}
        </button>
      </div>
    </div>
  );
}

/* ─── Outreach Card (sent by company) ─── */

function OutreachCard({ inquiry, onOpen }) {
  const rtm = REQUEST_TYPE_META[inquiry.request_type] || { icon: '📤', label: inquiry.request_type };
  const ism = INQUIRY_STATUS_META[inquiry.status]     || INQUIRY_STATUS_META.pending;
  const timeAgo = formatTimeAgo(inquiry.created_at);
  const hasReply = inquiry.status === 'responded';

  return (
    <div style={{ ...S.roundCard, ...(hasReply ? S.outreachCardReplied : {}) }}>
      <div style={S.roundTop}>
        <div style={S.roundLeft}>
          <span style={{ ...S.inquiryTypeBadge, background: '#eff6ff', color: '#1e40af' }}>
            {rtm.icon} {rtm.label}
          </span>
          <span style={{ ...S.inquiryStatusBadge, background: ism.bg, color: ism.color }}>
            {ism.label}
          </span>
        </div>
        <span style={S.inquiryTime}>{timeAgo}</span>
      </div>

      <div style={S.inquiryInvestorRow}>
        <span style={S.inquiryFrom}>To:</span>
        <span style={S.inquiryInvestorName}>
          {inquiry.investor_firm || inquiry.investor_contact || 'Investor'}
        </span>
        <span style={S.inquiryRoundName}>· {inquiry.round_name}</span>
      </div>

      {inquiry.message && (
        <p style={S.inquiryMsgPreview}>
          "{inquiry.message.length > 120 ? inquiry.message.slice(0, 120) + '…' : inquiry.message}"
        </p>
      )}

      <div style={S.inquiryActions}>
        <button
          style={{
            ...S.viewThreadBtn,
            ...(hasReply ? S.viewThreadBtnPrimary : {}),
          }}
          onClick={onOpen}
        >
          {hasReply ? '💬 View Reply' : '💬 View Thread'}
        </button>
      </div>
    </div>
  );
}

/* ─── Thread Modal ─── */

// companySent=true → company viewing their own outreach; no Pass button, reply doesn't advance status
function ThreadModal({ inquiry, onClose, onReply, onPass, companySent = false }) {
  const { token, user } = useAuth();
  const [messages, setMessages]     = useState([]);
  const [replyText, setReplyText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [currentStatus, setCurrentStatus] = useState(inquiry.status);

  const rtm = REQUEST_TYPE_META[inquiry.request_type] || { icon: '📩', label: inquiry.request_type };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/inquiries/${inquiry.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.messages) setMessages(d.messages);
        if (d.inquiry?.status) setCurrentStatus(d.inquiry.status);
      })
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
        // Only auto-advance status for RECEIVED inquiries (investor-initiated)
        // when the company (recipient) first replies
        if (!companySent && currentStatus === 'pending') {
          setCurrentStatus('responded');
          onReply(inquiry.id);
        }
      }
    } catch { /* silent */ } finally { setSending(false); }
  }

  async function passInquiry() {
    if (!confirm('Mark this inquiry as passed?')) return;
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'passed' }),
      });
      if (res.ok && onPass) onPass(inquiry.id);
    } catch { /* silent */ }
  }

  function fmt(dateStr) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.threadModal}>
        <div style={S.threadHeader}>
          <div style={{ flex: 1 }}>
            <div style={S.threadTitleRow}>
              <span style={S.threadIcon}>{rtm.icon}</span>
              <h3 style={S.threadTitle}>{rtm.label}</h3>
            </div>
            <p style={S.threadSub}>
              {companySent ? 'To' : 'From'}{' '}
              <strong>{inquiry.investor_firm || inquiry.investor_contact || 'Investor'}</strong>
              {' · '}{inquiry.round_name}
            </p>
          </div>
          <button style={S.threadCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {inquiry.message && messages.length === 0 && (
          <div style={S.openingMsg}>
            <p style={S.openingMsgText}>{inquiry.message}</p>
          </div>
        )}

        <div style={S.threadMessages}>
          {loading ? (
            <p style={S.threadLoading}>Loading thread…</p>
          ) : messages.length === 0 ? (
            <p style={S.threadEmpty}>
              {inquiry.message
                ? 'No replies yet.'
                : 'No messages yet.'}
            </p>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} style={{ ...S.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ ...S.msgBubble, ...(isMine ? S.msgBubbleMine : S.msgBubbleTheirs) }}>
                    <p style={S.msgBody}>{msg.body}</p>
                    <span style={S.msgTime}>{fmt(msg.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {currentStatus !== 'passed' ? (
          <div style={S.replyBox}>
            <textarea
              style={S.replyTextarea}
              rows={3}
              placeholder="Type your reply… (Ctrl+Enter to send)"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendReply(); }}
            />
            <div style={S.replyActions}>
              {/* Pass button only for received inquiries */}
              {!companySent && currentStatus === 'pending' && (
                <button style={S.passBtn} onClick={passInquiry}>Pass</button>
              )}
              <button
                style={{
                  ...S.sendBtn,
                  opacity: (!replyText.trim() || sending) ? 0.55 : 1,
                  cursor:  (!replyText.trim() || sending) ? 'not-allowed' : 'pointer',
                }}
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
              >
                {sending ? 'Sending…' : 'Reply'}
              </button>
            </div>
          </div>
        ) : (
          <div style={S.passedNotice}>
            This inquiry has been passed.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Company Outreach Modal ─── */

function CompanyOutreachModal({ match, sentTypes, token, onClose, onCreated }) {
  const [selectedType, setSelectedType] = useState(null);
  const [message, setMessage]           = useState('');
  const [sending, setSending]           = useState(false);
  const [error, setError]               = useState('');

  async function handleSend() {
    if (!selectedType) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          raise_round_id: match.raise_round_id,
          investor_id:    match.investor_id,
          match_id:       match.id,
          request_type:   selectedType,
          message:        message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.inquiry);
      } else {
        setError(data.error || 'Failed to send. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.outreachModal}>
        <div style={S.threadHeader}>
          <div style={{ flex: 1 }}>
            <h3 style={S.threadTitle}>📤 Reach Out</h3>
            <p style={S.threadSub}>
              To: <strong>{match.investor_firm || match.investor_contact || 'Investor'}</strong>
              {' · '}{match.round_name}
            </p>
          </div>
          <button style={S.threadCloseBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={S.outreachTypeGrid}>
          {COMPANY_OUTREACH_TYPES.map(ot => {
            const alreadySent = sentTypes.has(ot.type);
            const selected    = selectedType === ot.type;
            return (
              <button
                key={ot.type}
                style={{
                  ...S.outreachTypeBtn,
                  ...(selected    ? S.outreachTypeBtnSelected : {}),
                  ...(alreadySent ? S.outreachTypeBtnDisabled : {}),
                }}
                onClick={() => !alreadySent && setSelectedType(ot.type)}
                disabled={alreadySent}
              >
                <span style={S.outreachTypeIcon}>{ot.icon}</span>
                <span style={S.outreachTypeLabel}>{ot.label}</span>
                {alreadySent && <span style={S.outreachTypeSentTag}>Sent ✓</span>}
                {!alreadySent && <span style={S.outreachTypeDesc}>{ot.desc}</span>}
              </button>
            );
          })}
        </div>

        <div style={S.outreachMsgBox}>
          <textarea
            style={S.replyTextarea}
            rows={3}
            placeholder="Add a personal message (optional)…"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        {error && <p style={S.outreachError}>{error}</p>}

        <div style={{ ...S.replyActions, padding: '0.75rem 1.5rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          <button style={S.passBtn} onClick={onClose}>Cancel</button>
          <button
            style={{
              ...S.sendBtn,
              opacity: (!selectedType || sending) ? 0.55 : 1,
              cursor:  (!selectedType || sending) ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSend}
            disabled={!selectedType || sending}
          >
            {sending ? 'Sending…' : 'Send Outreach'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function ProfileSection({ title, children }) {
  return (
    <div style={S.profileSection}>
      <div style={S.sectionLabel}>{title}</div>
      {children}
    </div>
  );
}

function ProfileRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={S.profileRow}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value}</span>
    </div>
  );
}

/* ─── Utilities ─── */

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Styles ─── */

const S = {
  page:    { minHeight: '100vh', background: '#f8f9fb' },
  nav:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e5e7eb' },
  logo:    { fontWeight: 700, fontSize: '1rem', color: '#059669' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  email:   { fontSize: '0.85rem', color: '#6b7280' },
  logoutBtn: { padding: '0.4rem 0.9rem', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
  main:    { maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' },

  // Header
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title:  { fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.4rem' },
  sub:    { fontSize: '0.95rem', color: '#6b7280', maxWidth: 540 },

  // Stats
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: { background: '#fff', borderRadius: 12, padding: '1.1rem 1.5rem', border: '1px solid #e5e7eb', flex: '1 1 140px', textAlign: 'center' },
  statValue: { fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' },
  statLabel: { fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' },

  // Collapsible profile card
  profileCard:     { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', marginBottom: '1.5rem', overflow: 'hidden' },
  profileHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', background: '#f8fffe', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' },
  chevron:         { fontSize: '1rem', color: '#9ca3af', display: 'inline-block', transition: 'transform 0.2s ease', lineHeight: 1, flexShrink: 0 },
  profileTitle:    { fontSize: '0.95rem', fontWeight: 600, color: '#1a1a2e', marginBottom: '0.15rem' },
  profileSub:      { fontSize: '0.78rem', color: '#9ca3af', textAlign: 'left' },
  editProfileBtn: { padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', alignSelf: 'center' },
  profileGrid:     { borderTop: '1px solid #f3f4f6', padding: '0.75rem 0 0.25rem' },
  profileSection:  { padding: '0.25rem 0 0.5rem' },
  sectionLabel:    { fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 1.5rem 0.4rem' },
  profileRow:      { display: 'flex', alignItems: 'flex-start', padding: '0.55rem 1.5rem', borderBottom: '1px solid #f9fafb', gap: '1rem' },
  rowLabel:        { width: 110, fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500, flexShrink: 0, paddingTop: 1 },
  rowValue:        { fontSize: '0.875rem', color: '#1a1a2e', fontWeight: 500 },
  descBlock:       { padding: '0.75rem 1.5rem', borderTop: '1px solid #f3f4f6' },
  descLabel:       { fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' },
  descText:        { fontSize: '0.875rem', color: '#374151', lineHeight: 1.6, margin: 0 },

  // Section wrapper
  raiseSection: { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', marginBottom: '1.5rem', overflow: 'hidden' },
  raiseHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '0.75rem' },
  raiseTitle:   { fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '0.15rem' },
  raiseSub:     { fontSize: '0.85rem', color: '#6b7280' },
  raiseBtn:     { padding: '0.55rem 1.1rem', background: '#059669', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' },
  raiseEmpty:   { padding: '2.5rem', textAlign: 'center' },
  raiseEmptyIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  raiseEmptyText: { fontSize: '0.875rem', color: '#6b7280', maxWidth: 360, margin: '0 auto' },

  // Round cards
  roundsList:     { display: 'flex', flexDirection: 'column' },
  roundCard:      { padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' },
  roundTop:       { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' },
  roundLeft:      { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  roundBadge:     { padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap' },
  roundName:      { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e' },
  roundActions:   { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  roundEditBtn:   { padding: '0.3rem 0.8rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', color: '#374151', fontWeight: 500, background: '#fff' },
  roundCloseBtn:  { padding: '0.3rem 0.8rem', border: '1px solid #fca5a5', borderRadius: 6, fontSize: '0.8rem', color: '#dc2626', fontWeight: 500, background: '#fff', cursor: 'pointer' },
  roundMeta:      { display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', marginBottom: '0.6rem' },
  roundMetaItem:  { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  roundMetaLabel: { fontSize: '0.68rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  roundMetaValue: { fontSize: '0.875rem', color: '#1a1a2e', fontWeight: 600 },
  roundUseOfFunds: { fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5, margin: 0, borderTop: '1px solid #f9fafb', paddingTop: '0.6rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },

  // Match card extras
  matchScore:       { display: 'flex', alignItems: 'baseline', gap: '0.15rem' },
  matchScoreNum:    { fontSize: '1.4rem', fontWeight: 700, color: '#059669' },
  matchScoreDen:    { fontSize: '0.8rem', color: '#9ca3af' },
  matchFundTag:     { fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: 999 },
  matchRoundTag:    { fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.5rem' },
  reasonPills:      { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' },
  reasonPill:       { fontSize: '0.73rem', padding: '0.2rem 0.6rem', borderRadius: 999, background: '#f0fdf4', color: '#065f46', fontWeight: 500 },
  reachOutRow:      { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #f9fafb' },
  sentOutreachBadge:{ fontSize: '0.72rem', color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: 999, fontWeight: 500 },
  reachOutBtn:      { padding: '0.4rem 1rem', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  reachOutBtnDisabled: { padding: '0.4rem 1rem', background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'not-allowed' },

  // Inquiry card
  inquiryCardPending: { borderLeft: '3px solid #d97706' },
  outreachCardReplied: { borderLeft: '3px solid #059669' },
  inquiryTypeBadge:   { fontSize: '0.8rem', fontWeight: 600, color: '#1a1a2e', background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: 999 },
  inquiryStatusBadge: { fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999 },
  inquiryTime:        { fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0 },
  inquiryInvestorRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  inquiryFrom:        { fontSize: '0.78rem', color: '#9ca3af' },
  inquiryInvestorName: { fontSize: '0.875rem', fontWeight: 600, color: '#1a1a2e' },
  inquiryRoundName:   { fontSize: '0.78rem', color: '#6b7280' },
  inquiryMsgPreview:  { fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5, margin: '0.25rem 0 0', borderLeft: '2px solid #e5e7eb', paddingLeft: '0.75rem' },
  inquiryActions:     { display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' },
  viewThreadBtn:      { padding: '0.4rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.82rem', color: '#374151', fontWeight: 500, background: '#fff', cursor: 'pointer' },
  viewThreadBtnPrimary: { background: '#059669', color: '#fff', border: '1px solid #059669' },
  pendingBadge:       { padding: '0.3rem 0.75rem', background: '#fffbeb', color: '#92400e', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600 },

  // Modal overlay
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },

  // Thread modal
  threadModal: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
    maxHeight: '88vh', overflow: 'hidden',
  },
  threadHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', gap: '0.75rem' },
  threadTitleRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' },
  threadIcon:     { fontSize: '1.25rem' },
  threadTitle:    { fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', margin: 0 },
  threadSub:      { fontSize: '0.82rem', color: '#6b7280' },
  threadCloseBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#9ca3af', padding: '0.2rem 0.4rem', flexShrink: 0 },
  openingMsg:     { background: '#f8f9fb', borderBottom: '1px solid #f3f4f6', padding: '0.75rem 1.5rem' },
  openingMsgText: { fontSize: '0.875rem', color: '#374151', lineHeight: 1.6, margin: 0, fontStyle: 'italic' },

  // Messages area
  threadMessages: { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 120 },
  threadLoading:  { color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' },
  threadEmpty:    { color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' },
  msgRow:         { display: 'flex' },
  msgBubble:      { maxWidth: '78%', padding: '0.65rem 0.9rem', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  msgBubbleMine:  { background: '#059669', color: '#fff', borderBottomRightRadius: 4 },
  msgBubbleTheirs: { background: '#f3f4f6', color: '#1a1a2e', borderBottomLeftRadius: 4 },
  msgBody:        { fontSize: '0.875rem', lineHeight: 1.5, margin: 0 },
  msgTime:        { fontSize: '0.68rem', opacity: 0.7, alignSelf: 'flex-end' },

  // Reply box
  replyBox:      { borderTop: '1px solid #f3f4f6', padding: '1rem 1.5rem', background: '#fafafa' },
  replyTextarea: { width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '0.6rem' },
  replyActions:  { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' },
  passBtn:       { padding: '0.45rem 0.9rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#9ca3af', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' },
  sendBtn:       { padding: '0.45rem 1.1rem', background: '#059669', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', border: 'none' },
  passedNotice:  { padding: '1rem 1.5rem', background: '#f9fafb', textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6' },

  // Outreach modal
  outreachModal: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
    maxHeight: '90vh', overflow: 'hidden',
  },
  outreachTypeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1.25rem 1.5rem' },
  outreachTypeBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
    padding: '0.85rem 1rem', borderRadius: 12, border: '2px solid #e5e7eb',
    background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
  },
  outreachTypeBtnSelected: { borderColor: '#1e40af', background: '#eff6ff' },
  outreachTypeBtnDisabled: { background: '#f9fafb', cursor: 'not-allowed', opacity: 0.7 },
  outreachTypeIcon:  { fontSize: '1.3rem', marginBottom: '0.1rem' },
  outreachTypeLabel: { fontSize: '0.82rem', fontWeight: 700, color: '#1a1a2e' },
  outreachTypeDesc:  { fontSize: '0.72rem', color: '#9ca3af', lineHeight: 1.3 },
  outreachTypeSentTag: { fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: '0.1rem' },
  outreachMsgBox:    { padding: '0 1.5rem 0.75rem' },
  outreachError:     { fontSize: '0.82rem', color: '#dc2626', padding: '0 1.5rem 0.5rem', margin: 0 },
};
