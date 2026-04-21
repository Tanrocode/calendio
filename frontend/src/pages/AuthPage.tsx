import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authCallbackUrl, supabase } from '../lib/supabaseClient';

const T = {
  b50: '#eff6ff', b100: '#dbeafe', b600: '#2563eb', b700: '#1d4ed8',
  s100: '#f1f5f9', s200: '#e2e8f0', s400: '#94a3b8', s500: '#64748b', s900: '#0f172a',
};

const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={36} height={36} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={T.b600} />
      <rect x="10" y="13" width="20" height="15" rx="3" fill="none" stroke="white" strokeWidth="1.6" />
      <line x1="10" y1="18" x2="30" y2="18" stroke="white" strokeWidth="1.6" />
      <line x1="15.5" y1="13" x2="15.5" y2="10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="24.5" y1="13" x2="24.5" y2="10.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15.5" cy="23" r="1.5" fill="white" />
      <circle cx="20" cy="22" r="1.5" fill="white" />
      <circle cx="24.5" cy="24" r="1.5" fill="white" />
    </svg>
    <span style={{ fontSize: 22, fontWeight: 800, color: T.s900, letterSpacing: '-0.5px' }}>Calendio</span>
  </div>
);

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [btnHover, setBtnHover] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl() },
    });
    setLoading(false);
    if (oauthError) setError(oauthError.message);
  };

  return (
    <div style={{
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      minHeight: '100vh',
      background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${T.b100} 0%, #fff 60%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ marginBottom: 40 }}>
        <Logo />
      </div>

      <div style={{
        background: '#fff', border: `1px solid ${T.s200}`,
        borderRadius: 24, padding: '44px 40px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 8px 40px rgba(15,23,42,0.08)',
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: T.s900, marginBottom: 8, letterSpacing: '-0.5px', marginTop: 0 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 15, color: T.s500, marginBottom: 32, lineHeight: 1.65, marginTop: 0 }}>
          Sign in to your Calendio account to manage your voice agents.
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogle}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px', background: btnHover ? T.s100 : '#fff', color: T.s900,
            border: `1.5px solid ${btnHover ? T.s200 : T.s200}`,
            borderRadius: 12, fontSize: 15, fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.15s',
            boxShadow: btnHover ? '0 2px 8px rgba(15,23,42,0.06)' : 'none',
          }}
        >
          <GoogleIcon />
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: T.s400, marginBottom: 0, marginTop: 24 }}>
          <span
            onClick={() => navigate('/')}
            style={{ color: T.b600, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
          >
            ← Back to home
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
