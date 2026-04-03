import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Landing.css';

const fontFamily = `'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif`;

const NavButton: React.FC<{ to: string; children: React.ReactNode }> = ({
    to,
    children,
}) => {
    const [hover, setHover] = useState(false);
    return (
        <Link
            to={to}
            style={{
                padding: '9px 22px',
                background: hover ? '#1d4ed8' : '#2563eb',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontFamily,
                fontSize: 15,
                transition: 'background 0.2s',
                boxShadow: hover
                    ? '0 2px 12px rgba(37,99,235,0.18)'
                    : 'none',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {children}
        </Link>
    );
};

const Navbar: React.FC = () => (
    <nav
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 48px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            fontFamily,
        }}
    >
        <Link to="/" style={{ textDecoration: 'none' }}>
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                fontWeight: 700,
                fontSize: 22,
                color: '#1e293b',
                letterSpacing: '-0.5px',
            }}
        >
            <svg
                width="30"
                height="30"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: 9 }}
            >
                <circle cx="16" cy="16" r="16" fill="#2563eb" />
                <path
                    d="M10 16a6 6 0 1 1 12 0c0 3.314-2.686 6-6 6s-6-2.686-6-6z"
                    fill="#fff"
                />
                <rect x="14" y="10" width="4" height="8" rx="2" fill="#fff" />
            </svg>
            Calendio
        </div>
        </Link>
        <NavButton to="/login">Try Now</NavButton>
    </nav>
);

export default Navbar;



