import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── TOKENS ──────────────────────────────────────── */
const T = {
  forest:       '#1d8c63',
  forestDeep:   '#177350',
  forestSoft:   '#ecfdf5',
  forestMid:    '#a7f3d0',
  ink:          '#111827',
  body:         '#374151',
  secondary:    '#6b7280',
  muted:        '#9ca3af',
  border:       '#e5e7eb',
  borderStrong: '#d1d5db',
  surfaceAlt:   '#f9fafb',
  bg:           '#ffffff',
  surface:      '#ffffff',
  green:        '#1d8c63',
  greenSoft:    '#ecfdf5',
};

const font = "'Bricolage Grotesque', sans-serif";

/* ── Logo ─────────────────────────────────────────── */
const Logo: React.FC<{ size?: number; onDark?: boolean }> = ({ size = 32, onDark = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={onDark ? 'rgba(255,255,255,0.15)' : T.forest} />
      {/* Calendar frame */}
      <rect x="7" y="13" width="26" height="19" rx="3" stroke="white" strokeWidth="1.6" fill="none" />
      <line x1="7" y1="19" x2="33" y2="19" stroke="white" strokeWidth="1.6" />
      {/* Binder rings */}
      <path d="M14 10 L14 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 10 L26 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      {/* Audio equalizer bars — baseline at y=30, asymmetric heights */}
      <rect x="11" y="24.5" width="4" height="5.5" rx="2" fill="white" />
      <rect x="18" y="20.5" width="5" height="9.5" rx="2.5" fill="white" />
      <rect x="25.5" y="22.5" width="4" height="7.5" rx="2" fill="white" />
    </svg>
    <span style={{
      fontSize: size * 0.6, fontWeight: 800,
      color: onDark ? '#ffffff' : T.ink,
      letterSpacing: '-0.5px', fontFamily: font,
    }}>
      Calendio
    </span>
  </div>
);

/* ── Button ───────────────────────────────────────── */
const Btn: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'white';
  onClick?: () => void;
  sm?: boolean;
}> = ({ children, variant = 'primary', onClick, sm }) => {
  const [h, setH] = useState(false);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: sm ? '9px 18px' : '13px 26px',
    borderRadius: 12, fontWeight: 700, fontSize: sm ? 14 : 15,
    letterSpacing: '-0.02em', transition: 'all 0.15s cubic-bezier(0.22, 1, 0.36, 1)',
    cursor: 'pointer', fontFamily: font, border: 'none',
  };
  const vs: Record<string, React.CSSProperties> = {
    primary: {
      background: h ? T.forestDeep : T.forest, color: '#fff',
      boxShadow: h ? '0 6px 20px -4px rgba(29,120,116,0.38)' : '0 2px 8px rgba(29,120,116,0.18)',
    },
    ghost: {
      background: h ? T.surfaceAlt : 'transparent',
      color: h ? T.ink : T.body,
      border: `1.5px solid ${h ? T.borderStrong : T.border}`,
    },
    white: {
      background: h ? T.forestSoft : T.surface,
      color: T.forest,
      boxShadow: h ? '0 4px 16px rgba(25,21,16,0.14)' : '0 2px 8px rgba(25,21,16,0.10)',
    },
  };
  return (
    <button
      style={{ ...base, ...vs[variant] }}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {children}
    </button>
  );
};

/* ── Mic icon ─────────────────────────────────────── */
const MicIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = T.forest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

/* ── Hero Collage ─────────────────────────────────── */
const HeroCollage: React.FC = () => (
  <div style={{ position: 'relative', width: 460, height: 460, flexShrink: 0 }}>

    {/* ① Dashboard card — main, bottom-left */}
    <div style={{
      position: 'absolute', left: 0, top: 56, width: 292,
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18,
      boxShadow: '0 24px 64px -12px rgba(25,21,16,0.20)',
      overflow: 'hidden', zIndex: 1,
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Logo size={20} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 7, height: 7, borderRadius: 99, background: T.green }} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontFamily: font }}>Your Agents</div>
        {[
          { name: 'Booking Assistant', services: 'Haircut, Color, Blowout' },
          { name: 'Front Desk', services: 'Appointments, FAQs' },
        ].map(a => (
          <div key={a.name} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', background: T.bg, borderRadius: 10, marginBottom: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: T.forestSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <MicIcon size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: font }}>{a.name}</div>
              <div style={{ fontSize: 11, color: T.secondary, fontFamily: font }}>{a.services}</div>
            </div>
            <div style={{ background: T.forestSoft, color: T.forest, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: font, flexShrink: 0 }}>Live</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1, background: T.forestSoft, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.forest, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Calls today</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.forest, marginTop: 2, fontFamily: font }}>14</div>
          </div>
          <div style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Booked</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, marginTop: 2, fontFamily: font }}>8</div>
          </div>
        </div>
      </div>
    </div>

    {/* ② Incoming call — top right */}
    <div style={{
      position: 'absolute', right: 0, top: 0, width: 198,
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 12px 40px -8px rgba(25,21,16,0.16)',
      zIndex: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 99,
          background: T.forestSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.forest} strokeWidth="2" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.65 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.27-.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.forest, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>Incoming call</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: font }}>Sarah Mitchell</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.secondary, lineHeight: 1.5, fontFamily: font }}>
        "I'd like to book a haircut for this Saturday..."
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: 99, background: T.green }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.green, fontFamily: font }}>Agent handling</span>
      </div>
    </div>

    {/* ③ Booking confirmed — bottom right */}
    <div style={{
      position: 'absolute', right: 12, bottom: 12, width: 214,
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 12px 40px -8px rgba(25,21,16,0.13)',
      zIndex: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 99,
          background: T.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: font }}>Appointment booked</div>
      </div>
      <div style={{ background: T.bg, borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: font }}>Sarah Mitchell</div>
        <div style={{ fontSize: 11, color: T.secondary, fontFamily: font }}>Haircut + Blowout</div>
        <div style={{ fontSize: 11, color: T.forest, fontWeight: 600, marginTop: 3, fontFamily: font }}>Sat, Apr 26 at 11:00 AM</div>
      </div>
      <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Added to Google Calendar</div>
    </div>

  </div>
);

/* ── Nav ──────────────────────────────────────────── */
const LandingNav: React.FC<{ onGoApp: () => void }> = ({ onGoApp }) => {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = ref.current?.closest('[data-scroll]') as HTMLElement | null;
    const target = container ?? window;
    const fn = () => {
      const top = container ? container.scrollTop : window.scrollY;
      setScrolled(top > 8);
    };
    target.addEventListener('scroll', fn);
    return () => target.removeEventListener('scroll', fn);
  }, []);

  const [hLogin, setHLogin] = useState(false);
  const [hCta, setHCta] = useState(false);

  return (
    <nav ref={ref} aria-label="Main navigation" style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 64px', height: 64,
      background: scrolled ? 'rgba(250,248,244,0.96)' : T.bg,
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: `1px solid ${scrolled ? T.border : 'transparent'}`,
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>
      <Logo size={28} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onGoApp}
          onMouseEnter={() => setHLogin(true)}
          onMouseLeave={() => setHLogin(false)}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: hLogin ? T.surfaceAlt : 'transparent',
            color: hLogin ? T.ink : T.secondary,
            fontFamily: font, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
        >Log in</button>
        <button
          onClick={onGoApp}
          onMouseEnter={() => setHCta(true)}
          onMouseLeave={() => setHCta(false)}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: hCta ? T.forestDeep : T.forest,
            color: '#fff',
            fontFamily: font, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s ease',
            boxShadow: hCta ? '0 4px 14px -3px rgba(29,120,116,0.40)' : '0 2px 6px rgba(29,120,116,0.20)',
          }}
        >Get started free</button>
      </div>
    </nav>
  );
};

/* ── Hero ─────────────────────────────────────────── */
const Hero: React.FC<{ onGoApp: () => void }> = ({ onGoApp }) => (
  <section className="hero-section" style={{
    minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '80px 64px', overflow: 'hidden',
    background: `radial-gradient(ellipse 65% 90% at 90% 48%, ${T.forestSoft} 0%, ${T.bg} 62%)`,
  }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 96, maxWidth: 1160, width: '100%' }}>
    {/* Left: text */}
    <div className="anim-fade-up" style={{ flex: '0 1 500px', minWidth: 0 }}>
      <h1 style={{
        fontSize: 'clamp(36px, 4.5vw, 62px)', fontWeight: 800,
        lineHeight: 1.06, letterSpacing: '-2.5px',
        marginBottom: 24, color: T.ink, fontFamily: font,
      }}>
        Your calls,<br />
        <span style={{ color: T.forest }}>made simple.</span>
      </h1>

      <p style={{
        fontSize: 'clamp(15px, 1.6vw, 18px)', color: T.secondary, fontWeight: 500,
        maxWidth: 440, lineHeight: 1.78, marginBottom: 40, fontFamily: font,
      }}>
        Let our voice agents handle your customer workflows. So you can focus on your craft.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
        <Btn variant="primary" onClick={onGoApp}>Start for free →</Btn>
        <Btn variant="ghost" onClick={() => {
          const el = document.getElementById('features');
          el?.closest('[data-scroll]')?.scrollTo({ top: el.offsetTop - 82, behavior: 'smooth' });
        }}>See how it works</Btn>
      </div>

      {/* Social proof inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: T.green }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: T.secondary, fontFamily: font }}>
          Used by <span style={{ color: T.ink, fontWeight: 700 }}>20+ businesses</span> and counting
        </span>
      </div>
    </div>

    {/* Right: product collage */}
    <div aria-hidden="true" className="anim-fade-up anim-d2 hero-collage-wrap" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0 }}>
      <HeroCollage />
    </div>
    </div>
  </section>
);

/* ── Features ─────────────────────────────────────── */
const FEATURES = [
  { n: '01', label: '24/7 Call Handling', desc: 'Your AI receptionist picks up every call, after hours, weekends, whenever. No calls go to voicemail.' },
  { n: '02', label: 'Any Tool, One Agent', desc: 'Connect your calendar, CRM, helpdesk, or payment system. Your agent knows what to do on every call.' },
  { n: '03', label: 'Customer Memory', desc: 'Recalls past interactions, preferences, and account history to give every caller a fast, personal experience.' },
];

const Features: React.FC = () => (
  <section id="features" style={{ padding: '96px 80px', background: T.surfaceAlt }}>
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 56 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.forest, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: font }}>What Calendio does</p>
        <h2 style={{
          fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800,
          color: T.ink, letterSpacing: '-1.2px', lineHeight: 1.15,
          margin: 0, maxWidth: 520, fontFamily: font,
        }}>
          Built for businesses that run on their tools
        </h2>
      </div>
      <div style={{ borderTop: `1px solid ${T.border}` }}>
        {FEATURES.map(f => (
          <div key={f.n} className="features-row">
            <span style={{ fontSize: 13, fontWeight: 800, color: T.forest, letterSpacing: '0.04em', fontFamily: font, paddingTop: 2 }}>{f.n}</span>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.3px', lineHeight: 1.35, fontFamily: font }}>{f.label}</h3>
            <p style={{ fontSize: 15, color: T.secondary, lineHeight: 1.75, margin: 0, fontFamily: font }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── Step illustrations ───────────────────────────── */
const StepToolConnect: React.FC = () => {
  const integrations = [
    {
      name: 'Google Calendar', sub: 'Scheduling', connected: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="18" rx="2.5" stroke={T.forest} strokeWidth="1.5" fill="none" />
          <rect x="2" y="4" width="20" height="6" rx="2.5" fill={T.forest} opacity="0.25" />
          <circle cx="8" cy="15" r="1.3" fill={T.forest} />
          <circle cx="12" cy="15" r="1.3" fill={T.forest} />
          <circle cx="16" cy="15" r="1.3" fill={T.forest} />
        </svg>
      ),
    },
    {
      name: 'HubSpot', sub: 'CRM', connected: true,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill={T.forest} />
          <line x1="12" y1="3" x2="12" y2="9" stroke={T.forest} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="12" y1="15" x2="12" y2="21" stroke={T.forest} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3" y1="12" x2="9" y2="12" stroke={T.forest} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="15" y1="12" x2="21" y2="12" stroke={T.forest} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: 'Zendesk', sub: 'Support', connected: false,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.6" strokeLinecap="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
          <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ),
    },
  ];
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: '18px 20px', boxShadow: '0 8px 28px -8px rgba(25,21,16,0.10)',
      marginBottom: 28, minHeight: 324, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, fontFamily: font, marginBottom: 14 }}>Integrations</div>
      {integrations.map(item => (
        <div key={item.name} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 10px', background: T.bg, borderRadius: 10, marginBottom: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: item.connected ? T.forestSoft : T.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{item.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: font }}>{item.name}</div>
            <div style={{ fontSize: 11, color: T.secondary, fontFamily: font }}>{item.sub}</div>
          </div>
          {item.connected
            ? <div style={{ background: T.forestSoft, color: T.forest, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: font, flexShrink: 0 }}>Connected</div>
            : <div style={{ background: T.surfaceAlt, color: T.secondary, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: font, flexShrink: 0, border: `1px solid ${T.border}` }}>Connect</div>
          }
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ background: T.forestSoft, borderRadius: 8, padding: '9px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.forest, fontFamily: font }}>2 integrations active</span>
      </div>
    </div>
  );
};

const StepAgentBuilder: React.FC = () => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: '18px 20px', boxShadow: '0 8px 28px -8px rgba(25,21,16,0.10)',
    marginBottom: 28, minHeight: 324, display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, fontFamily: font, marginBottom: 14 }}>New agent</div>
    {[
      { label: 'Name', value: 'Booking Assistant' },
      { label: 'Services', value: 'Haircut, Color, Styling' },
      { label: 'Hours', value: 'Mon–Sat, 9am–7pm' },
    ].map(f => (
      <div key={f.label} style={{ marginBottom: 9 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, fontFamily: font }}>{f.label}</div>
        <div style={{
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: '7px 10px',
          fontSize: 12, color: T.body, fontFamily: font,
        }}>{f.value}</div>
      </div>
    ))}
    <div style={{ flex: 1 }} />
    <div style={{ background: T.forest, borderRadius: 8, padding: '9px', textAlign: 'center', marginTop: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: font }}>Create agent →</span>
    </div>
  </div>
);

const StepLiveDashboard: React.FC = () => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: '18px 20px', boxShadow: '0 8px 28px -8px rgba(25,21,16,0.10)',
    marginBottom: 28, minHeight: 324, display: 'flex', flexDirection: 'column',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, fontFamily: font }}>Booking Assistant</div>
      <div style={{ background: T.forestSoft, color: T.forest, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, fontFamily: font }}>Live</div>
    </div>
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <div style={{ flex: 1, background: T.forestSoft, borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.forest, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Calls</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.forest, fontFamily: font }}>12</div>
      </div>
      <div style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Booked</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, fontFamily: font }}>9</div>
      </div>
    </div>
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontFamily: font }}>Recent</div>
      {[
        { time: '2:14pm', name: 'Sarah M.', note: 'Haircut booked Sat 11am' },
        { time: '1:52pm', name: 'James K.', note: 'FAQ: pricing sent' },
      ].map(call => (
        <div key={call.name} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: font, minWidth: 38, paddingTop: 1 }}>{call.time}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: font }}>{call.name}</div>
            <div style={{ fontSize: 11, color: T.secondary, fontFamily: font }}>{call.note}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── How It Works ─────────────────────────────────── */
const STEPS = [
  {
    n: '01', title: 'Connect your tools',
    desc: 'Link your calendar, CRM, helpdesk, or any integration. Your whole stack, in minutes.',
    illustration: <StepToolConnect />,
  },
  {
    n: '02', title: 'Build your agent',
    desc: 'Name it, add your services, hours, and custom instructions. Under 5 minutes.',
    illustration: <StepAgentBuilder />,
  },
  {
    n: '03', title: 'Go live',
    desc: 'Your agent handles incoming calls, and utilizes the right tool for the moment.',
    illustration: <StepLiveDashboard />,
  },
];

const HowItWorks: React.FC = () => (
  <section style={{ padding: '96px 80px', background: T.surface }}>
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: T.forest, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: font }}>Getting started</p>
        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, color: T.ink, letterSpacing: '-1.2px', margin: 0, fontFamily: font }}>
          Up and running in minutes
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, alignItems: 'start' }}>
        {STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Product illustration first */}
            {step.illustration}
            {/* Number + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 99,
                background: T.forest, color: '#fff', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                boxShadow: '0 4px 12px rgba(29,120,116,0.25)', fontFamily: font,
              }}>{step.n}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: '-0.3px', fontFamily: font }}>{step.title}</h3>
            </div>
            <p style={{ fontSize: 14, color: T.secondary, lineHeight: 1.72, margin: 0, fontFamily: font }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── CTA Banner ───────────────────────────────────── */
const CTABanner: React.FC<{ onGoApp: () => void }> = ({ onGoApp }) => (
  <section style={{ padding: '96px 80px', textAlign: 'center', background: T.forest }}>
    <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.2px', marginBottom: 18, fontFamily: font }}>
      Ready to automate every call?
    </h2>
    <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.88)', marginBottom: 44, fontWeight: 500, fontFamily: font }}>
      Set up in minutes. Every call handled, every appointment booked, automatically.
    </p>
    <Btn variant="white" onClick={onGoApp}>Get started free →</Btn>
  </section>
);

/* ── Footer ───────────────────────────────────────── */
const Footer: React.FC = () => (
  <footer style={{ padding: '24px 80px', borderTop: `1px solid ${T.border}`, background: T.surface }}>
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Logo size={26} />
      <span style={{ fontSize: 13, color: T.muted, fontFamily: font }}>© 2026 Calendio. All rights reserved.</span>
    </div>
  </footer>
);

/* ── Landing ──────────────────────────────────────── */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const goApp = () => navigate('/auth');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Bricolage Grotesque', sans-serif; -webkit-font-smoothing: antialiased; background: #f8faf9; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up { animation: fadeUp 0.52s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-d2 { animation-delay: 0.12s; }

        .features-row {
          display: grid;
          grid-template-columns: 52px 200px 1fr;
          gap: 0 40px;
          padding: 36px 0;
          border-bottom: 1px solid #dce8e2;
          align-items: start;
        }

        @media (max-width: 900px) {
          .hero-section { flex-direction: column !important; padding: 60px 32px !important; min-height: auto !important; }
          .hero-collage-wrap { display: none !important; }
          .features-row { grid-template-columns: 1fr; gap: 8px 0; padding: 28px 0; }
          nav { padding: 0 24px !important; height: 56px !important; }
          section { padding-left: 24px !important; padding-right: 24px !important; }
          footer { padding-left: 24px !important; padding-right: 24px !important; }
        }
        @media (max-width: 700px) {
          .steps-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-fade-up { animation: none; }
        }
      `}</style>
      <div data-scroll style={{ height: '100vh', overflowY: 'auto', fontFamily: font }}>
        <LandingNav onGoApp={goApp} />
        <Hero onGoApp={goApp} />
        <HowItWorks />
        <Features />
        <CTABanner onGoApp={goApp} />
        <Footer />
      </div>
    </>
  );
};

export default Landing;
