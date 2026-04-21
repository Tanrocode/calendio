import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── TOKENS ─────────────────────────────────────── */
const T = {
  b50: '#eff6ff', b100: '#dbeafe', b200: '#bfdbfe',
  b500: '#3b82f6', b600: '#2563eb', b700: '#1d4ed8',
  v50: '#f5f3ff', v600: '#7c3aed',
  s50: '#f8fafc', s100: '#f1f5f9', s200: '#e2e8f0',
  s300: '#cbd5e1', s400: '#94a3b8', s500: '#64748b',
  s600: '#475569', s700: '#334155', s900: '#0f172a',
  white: '#ffffff', green: '#22c55e',
};

/* ── Logo ──────────────────────────────────────── */
const Logo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={T.b600} />
      <rect x="10" y="13" width="20" height="15" rx="3" fill="none" stroke="white" strokeWidth="1.6" />
      <line x1="10" y1="18" x2="30" y2="18" stroke="white" strokeWidth="1.6" />
      <line x1="15.5" y1="13" x2="15.5" y2="10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="24.5" y1="13" x2="24.5" y2="10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15.5" cy="23" r="1.5" fill="white" />
      <circle cx="20" cy="22" r="1.5" fill="white" />
      <circle cx="24.5" cy="24" r="1.5" fill="white" />
    </svg>
    <span style={{ fontSize: size * 0.625, fontWeight: 800, color: T.s900, letterSpacing: '-0.5px' }}>
      Calendio
    </span>
  </div>
);

/* ── Btn ───────────────────────────────────────── */
const Btn: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'outline';
  onClick?: () => void;
  sm?: boolean;
  style?: React.CSSProperties;
}> = ({ children, variant = 'primary', onClick, sm, style: xs }) => {
  const [h, setH] = useState(false);
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: sm ? '9px 18px' : '13px 26px',
    borderRadius: 10, fontWeight: 700, fontSize: sm ? 14 : 15,
    letterSpacing: '-0.2px', transition: 'all 0.15s ease', cursor: 'pointer',
    fontFamily: 'Plus Jakarta Sans, sans-serif', ...xs,
  };
  const vs: Record<string, React.CSSProperties> = {
    primary: {
      background: h ? T.b700 : T.b600, color: '#fff', border: 'none',
      boxShadow: h ? '0 8px 20px -4px rgba(37,99,235,0.5)' : '0 2px 6px rgba(37,99,235,0.2)',
    },
    ghost: {
      background: h ? T.s100 : 'transparent', color: T.s700,
      border: `1.5px solid ${h ? T.s300 : T.s200}`,
    },
    outline: {
      background: h ? T.b50 : 'transparent', color: T.b600,
      border: `1.5px solid ${T.b600}`,
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

/* ── Icon ──────────────────────────────────────── */
const Icon: React.FC<{ id: string; size?: number; color?: string }> = ({ id, size = 20, color = 'currentColor' }) => {
  const paths: Record<string, React.ReactNode> = {
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.65 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.27-.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
};

/* ── Mini Dashboard Preview ─────────────────────── */
const MiniDashPreview: React.FC = () => (
  <div style={{ display: 'flex', height: 380, background: T.s50 }}>
    <div style={{ width: 188, background: '#fff', borderRight: `1px solid ${T.s100}`, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ padding: '6px 8px', marginBottom: 10 }}><Logo size={22} /></div>
      {['Dashboard', 'My Agents', 'Calendar', 'Voice', 'Settings'].map((item, i) => (
        <div key={item} style={{
          padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: i === 0 ? T.b50 : 'transparent', color: i === 0 ? T.b600 : T.s400,
        }}>{item}</div>
      ))}
    </div>
    <div style={{ flex: 1, padding: '22px 24px', overflow: 'hidden' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.s900, marginBottom: 16 }}>Good morning ☀️</div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[['Calls', '142', T.b600], ['Appointments', '38', T.v600]] .map(([l, v]) => (
          <div key={l as string} style={{ flex: 1, background: '#fff', border: `1px solid ${T.s200}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.s400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.s900, marginTop: 3 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.s400, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Your Agents</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[['Booking Assistant', 'Haircut, Color treatment'], ['Front Desk', 'Appointments, FAQs']].map(([n, s]) => (
          <div key={n} style={{ flex: 1, background: '#fff', border: `1px solid ${T.s200}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: T.green }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.s900 }}>{n}</span>
            </div>
            <div style={{ fontSize: 10, color: T.s400 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Nav ───────────────────────────────────────── */
const LandingNav: React.FC<{ onGoApp: () => void }> = ({ onGoApp }) => {
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current?.closest('[data-scroll]') as HTMLElement | null;
    const target = container ?? window;
    const fn = () => {
      const scrollTop = container ? container.scrollTop : window.scrollY;
      setScrolled(scrollTop > 16);
    };
    target.addEventListener('scroll', fn);
    return () => target.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav ref={containerRef} style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 56px', height: 68,
      background: scrolled ? 'rgba(255,255,255,0.9)' : '#fff',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: `1px solid ${scrolled ? T.s200 : T.s100}`,
      transition: 'all 0.2s',
    }}>
      <Logo size={34} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Btn variant="ghost" sm onClick={onGoApp}>Log in</Btn>
        <Btn variant="primary" sm onClick={onGoApp}>Get started free</Btn>
      </div>
    </nav>
  );
};

/* ── Hero ──────────────────────────────────────── */
const Hero: React.FC<{ onGoApp: () => void }> = ({ onGoApp }) => (
  <section style={{
    minHeight: '88vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    padding: '80px 24px 64px', position: 'relative', overflow: 'hidden',
    background: `radial-gradient(ellipse 90% 55% at 50% -5%, ${T.b100} 0%, #fff 65%)`,
  }}>
    <div className="anim-fade-up" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: T.b50, border: `1px solid ${T.b100}`,
      borderRadius: 999, padding: '5px 14px 5px 8px', marginBottom: 32,
    }}>
      <span style={{ background: T.b600, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '2px 8px', letterSpacing: '0.06em' }}>
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.b700 }}>Now in Private Beta</span>
    </div>

    <h1 className="anim-fade-up anim-d1" style={{
      fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 800,
      lineHeight: 1.08, letterSpacing: '-2.5px', maxWidth: 780,
      marginBottom: 24, color: T.s900,
    }}>
      Your business,{' '}
      <span style={{
        background: 'linear-gradient(120deg, #2563eb 0%, #7c3aed 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>
        always on the phone.
      </span>
    </h1>

    <p className="anim-fade-up anim-d2" style={{
      fontSize: 'clamp(15px, 2vw, 19px)', color: T.s500, fontWeight: 500,
      maxWidth: 530, lineHeight: 1.78, marginBottom: 44,
    }}>
      Let our agents handle your calls, so you can focus on your craft.
    </p>

    <div className="anim-fade-up anim-d3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 68 }}>
      <Btn variant="primary" onClick={onGoApp}>Start for free →</Btn>
      <Btn variant="ghost" onClick={() => {
        const el = document.getElementById('features');
        el?.closest('[data-scroll]')?.scrollTo({ top: el.offsetTop - 68, behavior: 'smooth' });
      }}>See how it works</Btn>
    </div>

    {/* Browser mockup */}
    <div className="anim-fade-up anim-d4" style={{
      width: '100%', maxWidth: 880,
      background: '#fff', border: `1px solid ${T.s200}`, borderRadius: 18,
      boxShadow: '0 32px 80px -16px rgba(15,23,42,0.15), 0 2px 8px rgba(15,23,42,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{ background: T.s50, borderBottom: `1px solid ${T.s200}`, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
        {['#fca5a5', '#fcd34d', '#86efac'].map(c => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />
        ))}
        <div style={{ flex: 1, background: T.s200, borderRadius: 6, height: 24, marginLeft: 8, maxWidth: 320 }} />
      </div>
      <MiniDashPreview />
    </div>
  </section>
);

/* ── Trust Band ────────────────────────────────── */
const TrustBand: React.FC = () => (
  <section style={{ padding: '32px 48px', borderTop: `1px solid ${T.s100}`, borderBottom: `1px solid ${T.s100}` }}>
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: T.s300, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 8 }}>Trusted by</span>
      {['Bloom Salon', 'Oak & Oven', 'Clarity Clinic', 'The Cut Co.', 'Petal & Press'].map(name => (
        <span key={name} style={{ fontSize: 14, fontWeight: 700, color: T.s300 }}>{name}</span>
      ))}
    </div>
  </section>
);

/* ── Features ──────────────────────────────────── */
const FEATURES = [
  { icon: 'phone', label: '24/7 Call Handling', desc: 'Your AI receptionist picks up every call — after hours, weekends, whenever. No calls go to voicemail.' },
  { icon: 'calendar', label: 'Instant Booking', desc: 'Agents check your live availability and book straight to Google Calendar. No double-booking, ever.' },
  { icon: 'zap', label: 'Customer Memory', desc: 'Recalls past visits, preferences, and notes to give each caller a personal, familiar experience.' },
];

const FeatureCard: React.FC<{ icon: string; label: string; desc: string }> = ({ icon, label, desc }) => {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: h ? T.b50 : '#fff',
        border: `1px solid ${h ? T.b200 : T.s200}`,
        borderRadius: 20, padding: '36px 30px',
        transition: 'all 0.18s',
        boxShadow: h ? '0 10px 36px -8px rgba(37,99,235,0.14)' : '0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{
        width: 50, height: 50, borderRadius: 14,
        background: h ? T.b100 : T.b50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 22, transition: 'background 0.18s',
      }}>
        <Icon id={icon} color={T.b600} size={22} />
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, color: T.s900, marginBottom: 10, letterSpacing: '-0.3px' }}>{label}</h3>
      <p style={{ fontSize: 14, color: T.s500, lineHeight: 1.78, margin: 0 }}>{desc}</p>
    </div>
  );
};

const Features: React.FC = () => (
  <section id="features" style={{ padding: '96px 48px', background: '#fff' }}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: T.b600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>What Calendio does</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: T.s900, letterSpacing: '-1.5px', lineHeight: 1.2 }}>
          Built for businesses that run<br />on relationships
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {FEATURES.map(f => <FeatureCard key={f.icon} {...f} />)}
      </div>
    </div>
  </section>
);

/* ── How It Works ──────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Connect your calendar', desc: 'Link Google Calendar in one click. Calendio syncs your availability in real time.' },
  { n: '02', title: 'Build your agent', desc: 'Name it, add your services, hours, and custom instructions. Under 5 minutes.' },
  { n: '03', title: 'Go live', desc: 'Your agent handles incoming calls, books slots, and follows up — automatically.' },
];

const HowItWorks: React.FC = () => (
  <section style={{ padding: '96px 48px', background: T.s50 }}>
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: T.b600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Getting started</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: T.s900, letterSpacing: '-1.5px' }}>
          Up and running in minutes
        </h2>
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {STEPS.map((step, i) => (
          <div key={i} style={{ flex: 1, padding: '0 28px', textAlign: 'center', position: 'relative' }}>
            {i < STEPS.length - 1 && (
              <div style={{ position: 'absolute', top: 28, left: '58%', right: '-10%', height: 1, background: T.s200 }} />
            )}
            <div style={{
              width: 56, height: 56, borderRadius: 99,
              background: T.b600, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px',
              margin: '0 auto 24px', position: 'relative', zIndex: 1,
              boxShadow: '0 4px 18px rgba(37,99,235,0.35)',
            }}>{step.n}</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: T.s900, marginBottom: 10, letterSpacing: '-0.3px' }}>{step.title}</h3>
            <p style={{ fontSize: 14, color: T.s500, lineHeight: 1.72 }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── CTA Banner ────────────────────────────────── */
const CTABanner: React.FC<{ onGoApp: () => void }> = ({ onGoApp }) => (
  <section style={{
    padding: '96px 48px', textAlign: 'center',
    background: `linear-gradient(135deg, ${T.b600} 0%, ${T.v600} 100%)`,
  }}>
    <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', marginBottom: 18 }}>
      Ready to put your calls on autopilot?
    </h2>
    <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.72)', marginBottom: 44, fontWeight: 500 }}>
      Join hundreds of small businesses saving time with Calendio.
    </p>
    <button onClick={onGoApp} style={{
      padding: '15px 36px', background: '#fff', color: T.b600,
      borderRadius: 12, fontWeight: 800, fontSize: 16, border: 'none',
      cursor: 'pointer', letterSpacing: '-0.3px', fontFamily: 'Plus Jakarta Sans, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      Get started free →
    </button>
  </section>
);

/* ── Landing ───────────────────────────────────── */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const goApp = () => navigate('/auth');

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up   { animation: fadeUp 0.55s cubic-bezier(.22,.68,0,1.2) both; }
        .anim-d1 { animation-delay: 0.08s; }
        .anim-d2 { animation-delay: 0.16s; }
        .anim-d3 { animation-delay: 0.26s; }
        .anim-d4 { animation-delay: 0.36s; }
      `}</style>
      <div data-scroll style={{ height: '100vh', overflowY: 'auto', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <LandingNav onGoApp={goApp} />
        <Hero onGoApp={goApp} />
        <TrustBand />
        <Features />
        <HowItWorks />
        <CTABanner onGoApp={goApp} />
      </div>
    </>
  );
};

export default Landing;
