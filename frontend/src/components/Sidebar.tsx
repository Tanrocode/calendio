import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const T = {
  b50: '#eff6ff', b500: '#3b82f6', b600: '#2563eb', v600: '#7c3aed',
  s50: '#f8fafc', s100: '#f1f5f9', s200: '#e2e8f0',
  s300: '#cbd5e1', s400: '#94a3b8', s600: '#475569', s900: '#0f172a',
};

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

const NavIcon: React.FC<{ id: string; size?: number; color?: string }> = ({ id, size = 18, color = 'currentColor' }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><polyline points="9 21 9 12 15 12 15 21" /></>,
    agents: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></>,
    voice: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[id]}
    </svg>
  );
};

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'home', path: '/dashboard' },
  { label: 'My Agents', icon: 'agents', path: '/dashboard' },
  { label: 'Calendar Demo', icon: 'calendar', path: '/calendar-demo' },
  { label: 'Voice Demo', icon: 'voice', path: '/voice' },
  { label: 'Settings', icon: 'settings', path: null },
];

const NavItem: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void }> = ({ label, icon, active, onClick }) => {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: active ? T.b50 : h ? T.s50 : 'transparent',
        color: active ? T.b600 : h ? T.s600 : T.s400,
        fontWeight: active ? 700 : 600, fontSize: 14,
        transition: 'all 0.12s',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      <NavIcon id={icon} size={18} color={active ? T.b600 : h ? T.s600 : T.s400} />
      {label}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside style={{
      width: 232, height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
      background: '#fff', borderRight: `1px solid ${T.s100}`,
      display: 'flex', flexDirection: 'column', padding: '24px 14px',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }}>
      <div style={{ padding: '4px 6px', marginBottom: 32, cursor: 'pointer' }} onClick={() => navigate('/')}>
        <Logo size={32} />
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ label, icon, path }) => (
          <NavItem
            key={label}
            label={label}
            icon={icon}
            active={!!path && location.pathname === path && label === 'Dashboard' ? location.pathname === '/dashboard' : !!path && location.pathname === path && label !== 'My Agents'}
            onClick={() => path && navigate(path)}
          />
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 12, background: T.s50 }}>
        <div style={{ width: 34, height: 34, borderRadius: 99, background: `linear-gradient(135deg,${T.b500},${T.v600})`, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.s900 }}>Your Business</div>
          <div style={{ fontSize: 11, color: T.s400 }}>Free plan</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
