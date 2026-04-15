import React, { useEffect, useState } from 'react';
import { getMetrics, getAgents, createAgent, deleteAgent } from '../services/api';
import type { AgentConfig } from '../services/api';
import MetricsCard from '../components/MetricsCard';
import AgentCard from '../components/AgentCard';
import Navbar from '../components/NavBar';
import { persistAppUserFromSession, supabase } from '../lib/supabaseClient';
import '../styles/Dashboard.css';

type Metrics = {
  total_conversations: number;
  total_appointments_created: number;
};

const EMPTY_FORM = { name: '', services: '', business_hours: '', agent_instructions: '' };

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({ total_conversations: 0, total_appointments_created: 0 });
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/auth'; return; }
      persistAppUserFromSession(session);
      const [metricsData, agentsData] = await Promise.all([getMetrics(), getAgents()]);
      setMetrics(metricsData.metrics);
      setAgents(agentsData);
    };
    init();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Agent name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const newAgent = await createAgent({
        name: form.name.trim(),
        services: form.services || undefined,
        business_hours: form.business_hours || undefined,
        agent_instructions: form.agent_instructions || undefined,
      });
      setAgents(prev => [newAgent, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch {
      setError('Failed to create agent. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAgent(id);
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-shell">

        <MetricsCard metrics={metrics} />

        <div className="agents-section">
          <h2 className="agents-title">Your Agents</h2>
          <div className="agents-grid">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
            ))}
            <button className="agent-add-card" onClick={() => setShowModal(true)}>
              <span className="agent-add-icon">+</span>
              <span className="agent-add-label">New Agent</span>
            </button>
          </div>
        </div>

      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create Agent</h3>

            {error && <p className="modal-error">{error}</p>}

            <label className="dashboard-label">Agent name *</label>
            <input
              className="dashboard-input"
              placeholder="e.g. Booking Assistant"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />

            <label className="dashboard-label" style={{ marginTop: 14 }}>Services offered</label>
            <textarea
              className="dashboard-textarea"
              rows={3}
              placeholder="e.g. Haircut (30 min), Color treatment (90 min)"
              value={form.services}
              onChange={e => setForm(f => ({ ...f, services: e.target.value }))}
            />

            <label className="dashboard-label" style={{ marginTop: 14 }}>Business hours</label>
            <input
              className="dashboard-input"
              placeholder="e.g. Mon–Fri 9 am–6 pm, Sat 10 am–4 pm"
              value={form.business_hours}
              onChange={e => setForm(f => ({ ...f, business_hours: e.target.value }))}
            />

            <label className="dashboard-label" style={{ marginTop: 14 }}>Instructions for the agent</label>
            <textarea
              className="dashboard-textarea"
              rows={4}
              placeholder="Extra context the agent should know — tone, FAQs, policies…"
              value={form.agent_instructions}
              onChange={e => setForm(f => ({ ...f, agent_instructions: e.target.value }))}
            />

            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setError(null); }}>
                Cancel
              </button>
              <button className="modal-btn-create" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating…' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
