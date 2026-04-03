import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { persistAppUserFromSession, supabase } from '../lib/supabaseClient';

const fontFamily = `'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`;

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error || !session) {
        setMessage(error?.message || 'Could not complete sign-in. Try again.');
        return;
      }

      persistAppUserFromSession(session);
      navigate('/dashboard', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ fontFamily, background: '#fff', minHeight: '100vh' }}>
      <Navbar />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 65px)',
          padding: '24px',
          color: '#64748b',
          fontSize: 15,
        }}
      >
        {message}
      </div>
    </div>
  );
};

export default AuthCallback;
