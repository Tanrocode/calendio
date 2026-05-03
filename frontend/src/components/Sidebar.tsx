import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Ic = {
  Logo: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" fill="white"/>
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Grid: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Agent: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  ),
  Cal: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  Mic: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  ),
  Logout: () => (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'Grid', path: '/dashboard' },
  { label: 'My Agents',  icon: 'Agent', path: '/agents' },
  { label: 'Calendar',   icon: 'Cal',   path: '/calendar-demo' },
  { label: 'Voice Demo', icon: 'Mic',   path: '/voice' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [signOutHover, setSignOutHover] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      flexShrink: 0,
      background: 'white',
      borderRight: '1px solid var(--border)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '18px 16px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }} onClick={() => navigate('/')}>
        <div style={{
          width: 28, height: 28, background: 'var(--plum)', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic.Logo />
        </div>
        <span style={{
          fontFamily: 'var(--font-brand)', fontSize: 17, fontWeight: 700,
          color: 'var(--text-dark)', letterSpacing: '-0.02em',
        }}>Calendio</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-soft)',
          padding: '12px 8px 4px', opacity: 0.6,
        }}>Main</div>

        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = isActive(path);
          const IconComp = Ic[icon as keyof typeof Ic];
          return (
            <NavButton
              key={label}
              label={label}
              icon={<IconComp />}
              active={active}
              onClick={() => navigate(path)}
            />
          );
        })}

        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-soft)',
          padding: '12px 8px 4px', opacity: 0.6,
        }}>Account</div>

        <NavButton label="Settings" icon={<Ic.Settings />} active={false} onClick={() => {}} />
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 8px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--plum)',
            color: 'white', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>YB</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)' }}>Your Business</div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>Free plan</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          onMouseEnter={() => setSignOutHover(true)}
          onMouseLeave={() => setSignOutHover(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', width: '100%',
            background: signOutHover ? 'var(--lavender-bg)' : 'none',
            border: 'none', borderRadius: 8,
            fontSize: 12, color: signOutHover ? 'var(--text-dark)' : 'var(--text-soft)',
            cursor: 'pointer', fontFamily: 'var(--font-ui)',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          <Ic.Logout /> Sign out
        </button>
      </div>
    </aside>
  );
};

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ label, icon, active, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 10px', borderRadius: 8,
        fontSize: 13, fontWeight: active ? 600 : 500,
        color: active ? 'var(--plum)' : hover ? 'var(--text-dark)' : 'var(--text-soft)',
        background: active ? 'var(--lavender-mid)' : hover ? 'var(--lavender-bg)' : 'none',
        border: 'none', width: '100%', textAlign: 'left',
        cursor: 'pointer', fontFamily: 'var(--font-ui)',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6, display: 'flex' }}>{icon}</span>
      {label}
    </button>
  );
};

export default Sidebar;
