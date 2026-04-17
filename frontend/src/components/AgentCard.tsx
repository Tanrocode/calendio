import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgentConfig } from '../services/api';

type Props = {
  agent: AgentConfig;
  onDelete: (id: number) => void;
};

const AgentCard: React.FC<Props> = ({ agent, onDelete }) => {
  const navigate = useNavigate();

  const date = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const servicesPreview = agent.services
    ? agent.services.length > 60
      ? agent.services.slice(0, 60) + '…'
      : agent.services
    : null;

  return (
    <div className="agent-card" onClick={() => navigate(`/agent/${agent.id}`)} style={{ cursor: 'pointer' }}>
      <div className="agent-card-header">
        <div className="agent-card-dot" />
        <button
          className="agent-card-delete"
          onClick={e => { e.stopPropagation(); onDelete(agent.id); }}
          title="Delete agent"
          aria-label="Delete agent"
        >
          ×
        </button>
      </div>
      <p className="agent-card-name">{agent.name}</p>
      {servicesPreview && (
        <p className="agent-card-services">{servicesPreview}</p>
      )}
      {date && <p className="agent-card-date">Created {date}</p>}
    </div>
  );
};

export default AgentCard;
