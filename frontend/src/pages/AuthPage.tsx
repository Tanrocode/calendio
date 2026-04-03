import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { authCallbackUrl, supabase } from '../lib/supabaseClient';

const fontFamily = `'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authCallbackUrl(),
      },
    });
    setLoading(false);
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <div style={{ fontFamily, background: '#fff', minHeight: '100vh' }}>
      <Navbar />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 65px)',
        padding: '24px',
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e8edf3',
          borderRadius: 20,
          padding: '48px 40px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 4px 32px rgba(30,41,59,0.08)',
        }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.5px' }}>
            Sign in to Calendio
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32, lineHeight: 1.6 }}>
            Use Google to create an account or sign in. One step for new and returning users.
          </p>

          {error && (
            <p style={{ color: '#991b1b', fontSize: 14, marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogle}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px',
              background: '#fff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              fontFamily,
              cursor: loading ? 'wait' : 'pointer',
              marginBottom: 20,
            }}
          >
            <GoogleIcon />
            {loading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', margin: 0 }}>
            <Link to="/" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
