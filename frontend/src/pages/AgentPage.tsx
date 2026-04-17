import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAgent } from '../services/api';
import type { AgentConfig } from '../services/api';
import Navbar from '../components/NavBar';
import '../styles/AgentPage.css';

const AgentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAgent(Number(id))
      .then(setAgent)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="agent-page">
      <Navbar />
      <div className="agent-page-shell">
        <p className="agent-page-loading">Loading…</p>
      </div>
    </div>
  );

  if (error || !agent) return (
    <div className="agent-page">
      <Navbar />
      <div className="agent-page-shell">
        <p className="agent-page-loading">Agent not found.</p>
        <button className="agent-page-back" onClick={() => navigate('/dashboard')}>← Back</button>
      </div>
    </div>
  );

  return (
    <div className="agent-page">
      <Navbar />
      <div className="agent-page-shell">

        <button className="agent-page-back" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>

        <div className="agent-page-header">
          <div className="agent-page-title-row">
            <h1 className="agent-page-name">{agent.name}</h1>
            <span className={`agent-status-badge ${agent.is_active ? 'active' : 'inactive'}`}>
              <span className="agent-status-dot" />
              {agent.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {agent.created_at && (
            <p className="agent-page-created">
              Created {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="agent-info-grid">
          {agent.services && (
            <div className="agent-info-card">
              <p className="agent-info-label">Services</p>
              <p className="agent-info-value">{agent.services}</p>
            </div>
          )}
          {agent.business_hours && (
            <div className="agent-info-card">
              <p className="agent-info-label">Business Hours</p>
              <p className="agent-info-value">{agent.business_hours}</p>
            </div>
          )}
          {agent.agent_instructions && (
            <div className="agent-info-card agent-info-card--full">
              <p className="agent-info-label">Agent Instructions</p>
              <p className="agent-info-value">{agent.agent_instructions}</p>
            </div>
          )}
        </div>

        <div className="agent-page-cta">
          <button className="agent-talk-btn" onClick={() => navigate(`/agent/${agent.id}/call`)}>
            <span className="agent-talk-icon">🎙</span>
            Talk to Agent
          </button>
          <p className="agent-talk-hint">Start a voice session with this agent</p>
        </div>

      </div>
    </div>
  );
};

export default AgentPage;
