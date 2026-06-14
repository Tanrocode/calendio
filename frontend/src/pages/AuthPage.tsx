import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authCallbackUrl, supabase } from '../lib/supabaseClient';

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

const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 34, height: 34, background: 'var(--plum)', borderRadius: 9,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" fill="white"/>
        <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em', fontFamily: 'var(--font-brand)' }}>
      Calendio
    </span>
  </div>
);

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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: var(--page-bg); -webkit-font-smoothing: antialiased; }
      `}</style>
      <div style={{
        fontFamily: 'var(--font-ui)',
        minHeight: '100vh',
        background: 'var(--page-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ marginBottom: 28 }}>
          <Logo />
        </div>

        <div style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 4px 32px rgba(59,7,100,0.08)',
        }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-dark)',
            marginBottom: 6,
            letterSpacing: '-0.4px',
            marginTop: 0,
            fontFamily: 'var(--font-ui)',
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: 14,
            color: 'var(--text-soft)',
            marginBottom: 28,
            lineHeight: 1.6,
            marginTop: 0,
            fontFamily: 'var(--font-ui)',
          }}>
            Sign in to manage your voice agents.
          </p>

          {error && (
            <div style={{
              background: 'var(--red-light)',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 20,
              fontFamily: 'var(--font-ui)',
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
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px',
              background: btnHover ? 'var(--lavender-bg)' : 'white',
              color: 'var(--text-dark)',
              border: `1.5px solid ${btnHover ? 'var(--lavender-dark)' : 'var(--border)'}`,
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: btnHover ? '0 2px 8px rgba(59,7,100,0.08)' : 'none',
            }}
          >
            <GoogleIcon />
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-soft)', marginBottom: 0, marginTop: 22, fontFamily: 'var(--font-ui)' }}>
            <span
              onClick={() => navigate('/')}
              style={{ color: 'var(--plum-mid)', fontWeight: 600, cursor: 'pointer' }}
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
