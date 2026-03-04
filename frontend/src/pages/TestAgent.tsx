import React, { useState } from 'react';
import ChatWindow from '../components/ChatWindow.tsx';

const TestAgent: React.FC = () => {
  const [token] = useState(() => window.location.pathname.split('/').pop() || 'demo-token');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Test AI Scheduling Agent</h1>
      <ChatWindow businessId={1} token={token} />
    </div>
  );
};

export default TestAgent;
