import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── ICONS ── */
const IconArrow = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
  </svg>
);

const IconPlay = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9"/>
    <path strokeLinecap="round" d="M10 8.5l5 3.5-5 3.5V8.5z" fill="currentColor" stroke="none"/>
  </svg>
);

const IconLogo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" fill="white"/>
    <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconLink = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
  </svg>
);

const IconUsers = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const IconMoon = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
  </svg>
);

/* ── SVG LOGOS ── */
const LogoGoogleCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect width="24" height="24" rx="4" fill="white"/>
    <rect x="2" y="2" width="20" height="20" rx="3" fill="white" stroke="#E0E0E0" strokeWidth="0.5"/>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="#fff"/>
    <path d="M8.5 3.5v4M15.5 3.5v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="3.5" y="7" width="17" height="2.5" fill="#4285F4"/>
    <text x="12" y="17.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4285F4" fontFamily="sans-serif">31</text>
  </svg>
);

const LogoGmail = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect width="24" height="24" rx="4" fill="white"/>
    <path d="M4 6v12h4V10l4 3.5 4-3.5v8h4V6" fill="#F5F5F5" stroke="none"/>
    <path d="M4 6l8 6 8-6v12H4V6z" fill="white" stroke="none"/>
    <path d="M4 6l8 6 8-6" stroke="#EA4335" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoHubSpot = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect width="24" height="24" rx="4" fill="#FF7A59"/>
    <circle cx="15.5" cy="8.5" r="2.5" fill="white"/>
    <path d="M15.5 11v3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9.5" cy="15" r="3" fill="white"/>
    <path d="M15.5 6V4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12.8 14.2l-1 .8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const LogoSlack = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect width="24" height="24" rx="4" fill="white"/>
    <path d="M9.5 4.5a1.5 1.5 0 000 3H11V6a1.5 1.5 0 00-1.5-1.5z" fill="#E01E5A"/>
    <path d="M4.5 9.5a1.5 1.5 0 103 0v-1.5H6A1.5 1.5 0 004.5 9.5z" fill="#36C5F0"/>
    <path d="M14.5 19.5a1.5 1.5 0 000-3H13v1.5a1.5 1.5 0 001.5 1.5z" fill="#2EB67D"/>
    <path d="M19.5 14.5a1.5 1.5 0 10-3 0V16H18a1.5 1.5 0 001.5-1.5z" fill="#ECB22E"/>
    <path d="M4.5 14.5a1.5 1.5 0 001.5 1.5h1.5V13H6a1.5 1.5 0 00-1.5 1.5z" fill="#2EB67D"/>
    <path d="M9.5 19.5a1.5 1.5 0 001.5-1.5V16.5H9.5a1.5 1.5 0 000 3z" fill="#ECB22E"/>
    <path d="M19.5 9.5A1.5 1.5 0 0018 8h-1.5v1.5a1.5 1.5 0 003 0z" fill="#E01E5A"/>
    <path d="M14.5 4.5A1.5 1.5 0 0013 6v1.5h1.5a1.5 1.5 0 000-3z" fill="#36C5F0"/>
  </svg>
);

const LogoSalesforce = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect width="24" height="24" rx="4" fill="#00A1E0"/>
    <path d="M10 8.5a2.5 2.5 0 015 0c.8 0 2.5.7 2.5 2.5s-1.5 2.5-2.5 2.5H9c-1.1 0-2.5-.9-2.5-2.5C6.5 9.3 8 8.5 10 8.5z" fill="white"/>
  </svg>
);

const LogoZoom = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <rect width="24" height="24" rx="4" fill="#2D8CFF"/>
    <rect x="4" y="8" width="11" height="8" rx="2" fill="white"/>
    <path d="M15 11l5-3v8l-5-3v-2z" fill="white"/>
  </svg>
);

/* ── HERO CARD A: Live Transcript ── */
function TranscriptCard() {
  const waveBars = [6, 14, 10, 18, 8, 20, 12, 16, 9, 14, 7, 11, 19, 8];
  return (
    <div style={glassCard}>
      <div style={cardLabel}>Live Call</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
        <div style={{ ...transcriptAvatar, background: 'var(--lavender-dark)', color: 'var(--plum)' }}>S</div>
        <div style={{ ...transcriptBubble }}>"Hi, I'd like to book a session for next Tuesday…"</div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ ...transcriptAvatar, background: 'var(--plum)' }}>C</div>
        <div style={{ ...transcriptBubble, background: 'var(--plum)', color: 'white', borderRadius: '12px 12px 4px 12px' }}>
          Sure! I have 10am or 2pm — which works better?
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 16 }}>
        {waveBars.map((h, i) => (
          <div key={i} style={{
            width: 3,
            height: h,
            background: (i > 5 && i < 10) ? 'var(--plum-mid)' : 'var(--lavender-dark)',
            borderRadius: 2,
            animation: 'wave-anim 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.08}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── HERO CARD B: Confirmation ── */
function CenterCard() {
  return (
    <div style={{ ...glassCard, padding: '32px 28px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--plum)', borderRadius: 100,
        padding: '8px 16px', marginBottom: 24, width: 'fit-content',
      }}>
        <div style={{ position: 'relative', width: 8, height: 8, background: 'var(--plum-xlight)', borderRadius: '50%' }}>
          <div style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            background: 'rgba(167,139,250,0.3)',
            animation: 'pulse-ring 1.5s ease-out infinite',
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'white', textTransform: 'uppercase' }}>Live</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>· Booking Agent</span>
      </div>

      <div style={{
        background: 'var(--green-light)', border: '1px solid #BBF7D0', borderRadius: 16,
        padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
      }}>
        <div style={{
          width: 22, height: 22, background: 'var(--green)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
        }}>
          <IconCheck />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 2 }}>Appointment Confirmed</div>
          <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>Added to Google Calendar — Tue, May 6 at 10:00 AM</div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', background: 'var(--lavender-bg)', borderRadius: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: 'white',
          border: '1px solid var(--lavender-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#5B1A96" strokeWidth="1.8"/>
            <path d="M3 9h18" stroke="#5B1A96" strokeWidth="1.8"/>
            <path d="M8 2v3M16 2v3" stroke="#5B1A96" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500 }}>Google Calendar synced</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>Reminder set · 30 min before</div>
        </div>
      </div>
    </div>
  );
}

/* ── HERO CARD C: Stats ── */
function StatsCard() {
  const [fill, setFill] = useState(0);
  useEffect(() => { const t = setTimeout(() => setFill(57), 400); return () => clearTimeout(t); }, []);
  return (
    <div style={glassCard}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 18 }}>Today's Overview</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--lavender-mid)' }}>
        <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Calls handled</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-brand)', fontSize: 22, fontWeight: 700 }}>14</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 100, background: 'var(--green-light)', color: 'var(--green)' }}>+3</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>Booked</span>
        <span style={{ fontFamily: 'var(--font-brand)', fontSize: 22, fontWeight: 700 }}>8</span>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-soft)', marginBottom: 6 }}>
          <span>Conversion</span><span>57%</span>
        </div>
        <div style={{ height: 6, background: 'var(--lavender-mid)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--plum-mid)', borderRadius: 3, width: fill + '%', transition: 'width 1s ease' }} />
        </div>
      </div>
    </div>
  );
}

/* ── SETUP CARD 1: Integrations ── */
function IntegrationCard() {
  const integrations = [
    { id: 'gcal', name: 'Google Calendar', desc: 'Sync bookings automatically', Logo: LogoGoogleCalendar, connected: true },
    { id: 'gmail', name: 'Gmail', desc: 'Send confirmation emails', Logo: LogoGmail, connected: true },
    { id: 'hubspot', name: 'HubSpot CRM', desc: 'Update contact records', Logo: LogoHubSpot, connected: false },
    { id: 'slack', name: 'Slack', desc: 'Get notified on new bookings', Logo: LogoSlack, connected: false },
  ];
  return (
    <div style={setupCard}>
      <div style={setupNum}>1</div>
      <div style={setupCardTitle}>Connect your tools</div>
      <div style={setupCardSub}>Link your calendar, inbox, and CRM in one click.</div>
      <div style={{ background: 'white', border: '1px solid var(--lavender-dark)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ background: 'var(--lavender-bg)', borderBottom: '1px solid var(--lavender-dark)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)', flex: 1 }}>Integrations</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', background: 'var(--green-light)', borderRadius: 100, padding: '2px 8px' }}>2 connected</div>
        </div>
        {integrations.map(({ id, name, desc, Logo, connected }) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--lavender-bg)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--lavender-dark)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Logo />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>{desc}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: connected ? 'var(--green)' : 'var(--text-soft)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--lavender-dark)' }} />
              {connected ? 'Connected' : 'Connect'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SETUP CARD 2: Builder ── */
function BuilderCard() {
  const [typed, setTyped] = useState('');
  const [tone, setTone] = useState('Friendly');
  const fullText = 'Booking Assistant';
  const idx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (idx.current < fullText.length) {
        setTyped(fullText.slice(0, idx.current + 1));
        idx.current++;
      } else {
        idx.current = 0;
        setTimeout(() => setTyped(''), 1400);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={setupCard}>
      <div style={setupNum}>2</div>
      <div style={setupCardTitle}>Build your agent</div>
      <div style={setupCardSub}>Name it, define your services, and set its personality in minutes.</div>
      <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid var(--lavender-dark)', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={formLabel}>Agent Name</div>
          <div style={{ ...formInput, display: 'flex', alignItems: 'center' }}>
            <span>{typed}</span>
            <span style={{ display: 'inline-block', width: 2, height: 13, background: 'var(--plum)', marginLeft: 1, animation: 'blink 1s step-end infinite', verticalAlign: 'middle' }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={formLabel}>Services offered</div>
          <textarea readOnly style={{ ...formInput, resize: 'none', lineHeight: 1.5, height: 72 }} placeholder="e.g. 60-min massage, 30-min consultation…" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={formLabel}>Tone</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Friendly', 'Professional', 'Concise'].map(t => (
              <div key={t} onClick={() => setTone(t)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, textAlign: 'center',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tone === t ? 'var(--plum)' : 'var(--lavender-bg)',
                color: tone === t ? 'white' : 'var(--text-mid)',
                border: `1px solid ${tone === t ? 'var(--plum)' : 'var(--lavender-dark)'}`,
                transition: 'all 0.15s',
              }}>{t}</div>
            ))}
          </div>
        </div>
        <button style={{ width: '100%', background: 'var(--plum)', color: 'white', border: 'none', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', marginTop: 'auto' }}>
          Create Agent →
        </button>
      </div>
    </div>
  );
}

/* ── SETUP CARD 3: Live ── */
function LiveCard() {
  const calls = [
    { name: 'Maria L.', action: 'Booked Tue 2pm', ago: '2m ago' },
    { name: 'James T.', action: 'Rescheduled to Fri', ago: '9m ago' },
    { name: 'Priya S.', action: 'Booked Thu 10am', ago: '14m ago' },
  ];
  return (
    <div style={setupCard}>
      <div style={setupNum}>3</div>
      <div style={setupCardTitle}>Go live instantly</div>
      <div style={setupCardSub}>Your agent starts answering calls from the moment you flip the switch.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ label: 'Calls Today', val: '14', accent: false }, { label: 'Booked', val: '8', accent: true }].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'white', border: '1px solid var(--lavender-dark)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-brand)', fontSize: 32, fontWeight: 700, color: s.accent ? 'var(--plum-mid)' : 'var(--text-dark)' }}>{s.val}</div>
            </div>
          ))}
        </div>
        {calls.map(c => (
          <div key={c.name} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--lavender-dark)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', animation: 'pip-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-mid)', fontWeight: 500 }}>{c.name} · {c.action}</div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{c.ago}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FEATURE CARDS ── */
function FeatureCard({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'white', border: '1px solid var(--lavender-mid)', borderRadius: 24,
        padding: '32px 28px',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hover ? '0 12px 40px rgba(59,7,100,0.10)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ width: 44, height: 44, background: 'var(--plum)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: 'white' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-brand)', fontSize: 20, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 8, lineHeight: 1.25 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.65, marginBottom: 24 }}>{body}</div>
      {children}
    </div>
  );
}

/* ── LANDING PAGE ── */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const goApp = () => navigate('/auth');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const integrationLogos = [
    { Logo: LogoGoogleCalendar, name: 'G Calendar' },
    { Logo: LogoGmail, name: 'Gmail' },
    { Logo: LogoHubSpot, name: 'HubSpot' },
    { Logo: LogoSlack, name: 'Slack' },
    { Logo: LogoSalesforce, name: 'Salesforce' },
    { Logo: LogoZoom, name: 'Zoom' },
  ];

  return (
    <div style={{ background: 'var(--lavender-bg)', fontFamily: 'var(--font-ui)', overflowX: 'hidden' }}>
      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,243,255,0.85)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(59,7,100,0.06)',
        padding: '0 48px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: scrolled ? '0 2px 20px rgba(59,7,100,0.08)' : 'none',
        transition: 'box-shadow 0.2s',
      }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', fontFamily: 'var(--font-brand)', fontSize: 22, fontWeight: 700, color: 'var(--plum)' }}>
          <div style={{ width: 32, height: 32, background: 'var(--plum)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconLogo />
          </div>
          Calendio
        </a>
        <ul style={{ display: 'flex', alignItems: 'center', gap: 36, listStyle: 'none' }}>
          <li><a href="#features" style={navLink}>Features</a></li>
          <li><a href="#setup" style={navLink}>How it works</a></li>
          <li>
            <button onClick={goApp} style={{
              background: 'var(--plum)', color: 'white', padding: '10px 20px',
              borderRadius: 100, fontSize: 14, fontWeight: 600,
              textDecoration: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'background 0.2s, transform 0.15s',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--plum-mid)'; (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'var(--plum)'; (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              Get started free
            </button>
          </li>
        </ul>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: 'var(--lavender-bg)', minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center' }}>
        <div style={{ padding: '40px 48px', textAlign: 'center', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 32, fontSize: 14, fontWeight: 500, color: 'var(--text-soft)' }}>
            <span style={{ color: 'var(--plum-mid)', fontSize: 14 }}>★★★★★</span>
            Trusted by businesses across the Bay Area
          </div>
          <h1 style={{
            fontFamily: 'var(--font-brand)', fontSize: 'clamp(48px,6vw,80px)', fontWeight: 700,
            lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text-dark)',
            marginBottom: 24,
          }}>
            Your calls, made <em style={{ fontStyle: 'italic', color: 'var(--plum-mid)' }}>simple.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--text-soft)', maxWidth: 560, margin: '0 auto 40px', fontWeight: 400 }}>
            Let our voice agents handle your customer workflows so you can focus on your craft.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 64 }}>
            <button onClick={goApp} style={btnPrimary}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--plum-mid)'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 24px rgba(59,7,100,0.25)'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'var(--plum)'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
            >
              Start for free →
            </button>
            <button onClick={goApp} style={{ color: 'var(--text-mid)', fontSize: 15, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-ui)' }}>
              <IconPlay /> See it in action
            </button>
          </div>

          {/* Hero cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 16, alignItems: 'end', maxWidth: 1060, margin: '0 auto' }}>
            <TranscriptCard />
            <CenterCard />
            <StatsCard />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="setup" style={{ background: 'white', padding: '100px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--plum-mid)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 2, background: 'var(--plum-mid)', borderRadius: 1 }} />
            How it works
          </div>
          <div style={{ fontFamily: 'var(--font-brand)', fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 56 }}>
            Up and running<br />in minutes.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
            <IntegrationCard />
            <BuilderCard />
            <LiveCard />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: 'var(--lavender-bg)', padding: '100px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--plum-mid)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 2, background: 'var(--plum-mid)', borderRadius: 1 }} />
            Everything covered
          </div>
          <div style={{ fontFamily: 'var(--font-brand)', fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 56 }}>
            Built for the way<br />real businesses run.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            <FeatureCard icon={<IconLink />} title="Major Integrations" body="Connect your existing stack. Google, CRM, messaging — Calendio fits right in.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {integrationLogos.map(({ Logo, name }) => (
                  <div key={name} style={{ background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                    <Logo />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-soft)', letterSpacing: '0.03em', textAlign: 'center' }}>{name}</div>
                  </div>
                ))}
              </div>
            </FeatureCard>

            <FeatureCard icon={<IconUsers />} title="Customer Memory" body="Personalized context that builds relationships — without ever being intrusive.">
              <div style={{ background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, background: 'var(--plum-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>SM</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>Sarah M.</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>Client since Jan 2024</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Prefers mornings', 'Last call: Oct 12', 'No SMS', 'Yoga class'].map(t => (
                    <div key={t} style={{ fontSize: 12, background: 'white', border: '1px solid var(--lavender-dark)', borderRadius: 100, padding: '4px 10px', color: 'var(--text-mid)', fontWeight: 500 }}>{t}</div>
                  ))}
                </div>
              </div>
            </FeatureCard>

            <FeatureCard icon={<IconMoon />} title="24/7 Operations" body="Let the agent do its thing while you disconnect. Every call answered, every time.">
              <div style={{ background: '#0F0720', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                {[[15, 10], [25, 80], [55, 20], [70, 65], [10, 50], [45, 90], [80, 35], [30, 40]].map(([top, left], i) => (
                  <div key={i} style={{ position: 'absolute', width: 2, height: 2, background: 'rgba(255,255,255,0.6)', borderRadius: '50%', top: `${top}%`, left: `${left}%` }} />
                ))}
                <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Active call · 3:14 AM</div>
                  <div style={{ fontFamily: 'var(--font-brand)', fontSize: 20, fontWeight: 700, color: 'white' }}>3 AM</div>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(167,139,250,0.9)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "Hi, I need to reschedule my appointment to…"
                </div>
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <section style={{ background: 'var(--plum)', padding: '100px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white"/>
                <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-brand)', fontSize: 32, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>Calendio</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 28, padding: '48px 40px', backdropFilter: 'blur(20px)' }}>
            <div style={{ fontFamily: 'var(--font-brand)', fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 10 }}>Ready to never miss a call?</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 32 }}>Free to start — no credit card required.</div>
            <button onClick={goApp} style={{
              background: 'white', color: 'var(--plum)', padding: '15px 32px', borderRadius: 100,
              fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
            >
              Start for free <IconArrow />
            </button>
          </div>
          <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            {['Privacy', 'Terms', 'Contact', '© 2026 Calendio'].map(l => (
              <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

/* ── SHARED STYLES ── */
const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.9)',
  borderRadius: 24,
  boxShadow: '0 4px 24px rgba(59,7,100,0.08), 0 1px 4px rgba(59,7,100,0.04)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding: 24,
};

const cardLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 16,
};

const transcriptAvatar: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 700, color: 'white',
};

const transcriptBubble: React.CSSProperties = {
  background: 'var(--lavender-bg)',
  borderRadius: '12px 12px 12px 4px',
  padding: '8px 12px', fontSize: 13, lineHeight: 1.5,
  color: 'var(--text-dark)', flex: 1,
};

const setupCard: React.CSSProperties = {
  background: 'var(--lavender-bg)', border: '1px solid var(--lavender-mid)',
  borderRadius: 24, padding: '32px 28px',
  display: 'flex', flexDirection: 'column',
};

const setupNum: React.CSSProperties = {
  width: 32, height: 32, background: 'var(--plum)', color: 'white', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700, marginBottom: 24,
};

const setupCardTitle: React.CSSProperties = {
  fontFamily: 'var(--font-brand)', fontSize: 20, fontWeight: 600,
  color: 'var(--text-dark)', marginBottom: 8,
};

const setupCardSub: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 24,
};

const formLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-soft)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5,
};

const formInput: React.CSSProperties = {
  background: 'var(--lavender-bg)', border: '1px solid var(--lavender-dark)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  fontFamily: 'var(--font-ui)', color: 'var(--text-dark)', width: '100%',
  outline: 'none', minHeight: 38,
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--plum)', color: 'white', padding: '14px 28px',
  borderRadius: 100, fontSize: 15, fontWeight: 600, border: 'none',
  cursor: 'pointer', transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
  fontFamily: 'var(--font-ui)',
};

const navLink: React.CSSProperties = {
  textDecoration: 'none', fontSize: 14, fontWeight: 500, color: 'var(--text-mid)', transition: 'color 0.2s',
};

export default Landing;
