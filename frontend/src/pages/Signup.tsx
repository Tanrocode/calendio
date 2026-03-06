import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/NavBar';

const fontFamily = `'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`;

const Signup: React.FC = () => {
  const handleSignup = () => {
    // TODO: Implement real signup logic
    window.location.href = '/dashboard';
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
            Create your account
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32 }}>
            Get started with Calendio for free
          </p>

          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Business Name
          </label>
          <input
            type="text"
            placeholder="Your Business"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 15,
              marginBottom: 20,
              outline: 'none',
              fontFamily,
              boxSizing: 'border-box',
              color: '#0f172a',
            }}
          />

          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 15,
              marginBottom: 20,
              outline: 'none',
              fontFamily,
              boxSizing: 'border-box',
              color: '#0f172a',
            }}
          />

          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 15,
              marginBottom: 28,
              outline: 'none',
              fontFamily,
              boxSizing: 'border-box',
              color: '#0f172a',
            }}
          />

          <button
            onClick={handleSignup}
            style={{
              width: '100%',
              padding: '12px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              fontFamily,
              cursor: 'pointer',
              marginBottom: 20,
              transition: 'background 0.2s',
            }}
          >
            Create Account
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
