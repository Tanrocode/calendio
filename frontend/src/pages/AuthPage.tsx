import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authCallbackUrl, supabase } from '../lib/supabaseClient';

const T = {
  forest:       '#1d8c63',
  forestDeep:   '#177350',
  forestSoft:   '#ecfdf5',
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
    <svg width={36} height={36} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill={T.forest} />
      <rect x="7" y="13" width="26" height="19" rx="3" stroke="white" strokeWidth="1.6" fill="none" />
      <line x1="7" y1="19" x2="33" y2="19" stroke="white" strokeWidth="1.6" />
      <path d="M14 10 L14 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26 10 L26 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="11" y="24.5" width="4" height="5.5" rx="2" fill="white" />
      <rect x="18" y="20.5" width="5" height="9.5" rx="2.5" fill="white" />
      <rect x="25.5" y="22.5" width="4" height="7.5" rx="2" fill="white" />
    </svg>
    <span style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: '-0.5px', fontFamily: font }}>
      Calendio
    </span>
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #f8faf9; -webkit-font-smoothing: antialiased; }
      `}</style>
      <div style={{
        fontFamily: font, minHeight: '100vh', background: T.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ marginBottom: 36 }}>
          <Logo />
        </div>

        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 20, padding: '44px 40px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 4px 24px rgba(25,21,16,0.08)',
        }}>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: T.ink,
            marginBottom: 8, letterSpacing: '-0.5px', marginTop: 0, fontFamily: font,
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: 15, color: T.secondary, marginBottom: 32,
            lineHeight: 1.65, marginTop: 0, fontFamily: font,
          }}>
            Sign in to manage your voice agents.
          </p>

          {error && (
            <div style={{
              background: '#fef5f5', border: '1px solid #f5c6c6', color: '#8b2020',
              borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 20, fontFamily: font,
            }}>
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
              padding: '13px',
              background: btnHover ? T.surfaceAlt : T.surface,
              color: T.ink,
              border: `1.5px solid ${btnHover ? T.borderStrong : T.border}`,
              borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: font,
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: btnHover ? '0 2px 8px rgba(25,21,16,0.08)' : 'none',
            }}
          >
            <GoogleIcon />
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: T.muted, marginBottom: 0, marginTop: 24, fontFamily: font }}>
            <span
              onClick={() => navigate('/')}
              style={{ color: T.forest, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Back to home
            </span>
          </p>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
