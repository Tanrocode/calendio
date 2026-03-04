import React from 'react';

const Login: React.FC = () => {
  const handleLogin = () => {
    // Mock login: store fake user in localStorage
    localStorage.setItem('user', JSON.stringify({ id: 1, business_id: 1, email: 'demo@calendio.com' }));
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Calendio Login</h1>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleLogin}
      >
        Mock Login
      </button>
    </div>
  );
};

export default Login;
