import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
};

const font = "'Bricolage Grotesque', sans-serif";

const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={32} height={32} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={T.forest} />
      <rect x="7" y="13" width="26" height="19" rx="3" stroke="white" strokeWidth="1.6" fill="none" />
      <line x1="7" y1="19" x2="33" y2="19" stroke="white" strokeWidth="1.6" />
      <path d="M14 10 L14 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 10 L26 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="11" y="24.5" width="4" height="5.5" rx="2" fill="white" />
      <rect x="18" y="20.5" width="5" height="9.5" rx="2.5" fill="white" />
      <rect x="25.5" y="22.5" width="4" height="7.5" rx="2" fill="white" />
    </svg>
    <span style={{ fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.5px', fontFamily: font }}>
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
  { label: 'Dashboard',    icon: 'home',     path: '/dashboard' },
  { label: 'My Agents',    icon: 'agents',   path: '/agents' },
  { label: 'Calendar',     icon: 'calendar', path: '/calendar-demo' },
  { label: 'Voice Demo',   icon: 'voice',    path: '/voice' },
  { label: 'Settings',     icon: 'settings', path: null },
];

const NavItem: React.FC<{ label: string; icon: string; active: boolean; onClick: () => void }> = ({
  label, icon, active, onClick,
}) => {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: active ? T.forestSoft : h ? T.surfaceAlt : 'transparent',
        color: active ? T.forest : h ? T.body : T.secondary,
        fontWeight: active ? 700 : 500, fontSize: 14,
        transition: 'all 0.12s',
        fontFamily: font,
        userSelect: 'none',
      }}
    >
      <NavIcon id={icon} size={18} color={active ? T.forest : h ? T.body : T.muted} />
      {label}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');`}</style>
      <aside style={{
        width: 228, height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
        background: T.surface, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', padding: '24px 14px',
        fontFamily: font,
      }}>
        <div style={{ padding: '4px 6px', marginBottom: 36, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Logo />
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ label, icon, path }) => (
            <NavItem
              key={label}
              label={label}
              icon={icon}
              active={!!path && location.pathname === path}
              onClick={() => path && navigate(path)}
            />
          ))}
        </nav>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12,
          background: T.surfaceAlt,
          borderTop: `1px solid ${T.border}`,
          marginTop: 8,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 99,
            background: T.forest, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: font, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Your Business
            </div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: font }}>Free plan</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
