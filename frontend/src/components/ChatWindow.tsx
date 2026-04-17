import React, { useState } from 'react';
import { sendAgentMessage } from '../services/api';

type Message = {
  sender: 'user' | 'agent';
  text: string;
};

const ChatWindow: React.FC<{ businessId: number; token: string }> = ({
  businessId: _businessId,
  token: _token,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { sender: 'user', text: input }]);
    setLoading(true);
    const res = await sendAgentMessage(input);
    setMessages((msgs) => [...msgs, { sender: 'agent', text: res.reply }]);
    setInput('');
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md border rounded p-4 bg-white">
      <div className="h-64 overflow-y-auto mb-4 bg-gray-50 p-2 rounded">
        {messages.map((m, i) => (
          <div key={i} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
            <span className={m.sender === 'user' ? 'text-blue-600' : 'text-green-600'}>
              {m.sender === 'user' ? 'You' : 'Agent'}: {m.text}
            </span>
          </div>
        ))}
        {loading && <div className="text-gray-400">Agent is typing...</div>}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={handleSend}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
