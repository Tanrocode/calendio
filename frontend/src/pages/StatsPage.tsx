import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getAgentStats } from '../services/api';
import type { AgentStatsResponse, AgentStat } from '../services/api';

const Ic = {
  Trend: () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  Chevron: () => <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>,
};

/* ── Top aggregate tile ── */
const AggTile: React.FC<{ label: string; value: string; sub?: string; accent?: 'plum' | 'green' }> = ({ label, value, sub, accent }) => (
  <div style={{
    background: 'white', border: '1px solid var(--border)', borderRadius: 12,
    padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
  }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
    <div style={{
      fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
      color: accent === 'plum' ? 'var(--plum-mid)' : accent === 'green' ? 'var(--green)' : 'var(--text-dark)',
    }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>{sub}</div>}
  </div>
);

/* ── 7-day mini bar chart ── */
const MiniBars: React.FC<{ series: number[]; max: number }> = ({ series, max }) => {
  const safeMax = Math.max(max, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, width: 80 }}>
      {series.map((v, i) => (
        <div key={i} style={{
          flex: 1, minHeight: 2, borderRadius: 2,
          height: `${(v / safeMax) * 100}%`,
          background: v > 0 ? 'var(--plum-mid)' : 'var(--lavender-dark)',
          opacity: v > 0 ? 1 : 0.5,
        }} />
      ))}
    </div>
  );
};

/* ── Full-width week chart shown at bottom ── */
const WeekChart: React.FC<{ agents: AgentStat[]; dateLabels: string[] }> = ({ agents, dateLabels }) => {
  // Sum calls per day across all agents
  const totalsByDay = dateLabels.map((_, i) => agents.reduce((sum, a) => sum + (a.calls_7d[i] ?? 0), 0));
  const maxDay = Math.max(...totalsByDay, 1);

  const dayLabel = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 24px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Calls this week</div>
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>Last 7 days · all agents combined</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>Peak: {maxDay} calls</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
        {totalsByDay.map((v, i) => {
          const pct = (v / maxDay) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div style={{
                  width: '100%', minHeight: 4, borderRadius: '6px 6px 0 0',
                  height: `${Math.max(pct, 4)}%`,
                  background: v > 0
                    ? 'linear-gradient(180deg, var(--plum-mid) 0%, var(--plum) 100%)'
                    : 'var(--lavender-dark)',
                  opacity: v > 0 ? 1 : 0.4,
                  position: 'relative',
                  transition: 'height 0.3s',
                }}>
                  {v > 0 && (
                    <div style={{
                      position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--plum-mid)',
                    }}>{v}</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {dayLabel(dateLabels[i])}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AgentStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgentStats().then(setData).finally(() => setLoading(false));
  }, []);

  const totals = data?.totals ?? { total_calls: 0, total_bookings: 0, avg_conversion: 0, active_agents: 0 };
  const agents = data?.agents ?? [];
  const dateLabels = data?.date_labels ?? [];
  const maxAgentCalls = Math.max(...agents.map(a => Math.max(...a.calls_7d, 0)), 1);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 0', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
              <em style={{ fontFamily: 'var(--font-brand)', fontStyle: 'italic', fontWeight: 600, color: 'var(--plum-mid)' }}>Statistics</em>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>Calls, bookings, and conversion across your agents.</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 92, borderRadius: 12, background: 'var(--lavender-bg)', animation: 'pulse 1.4s ease-in-out infinite' }} />)}
              </div>
              <div style={{ height: 400, borderRadius: 12, background: 'var(--lavender-bg)', animation: 'pulse 1.4s ease-in-out infinite' }} />
            </>
          ) : (
            <>
              {/* Aggregate tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <AggTile label="Total Calls" value={String(totals.total_calls)} sub={`across ${agents.length} agent${agents.length !== 1 ? 's' : ''}`} />
                <AggTile label="Appointments Booked" value={String(totals.total_bookings)} accent="plum" />
                <AggTile label="Avg. Conversion" value={totals.total_calls ? `${totals.avg_conversion}%` : '—'} accent="green" />
                <AggTile label="Active Agents" value={`${totals.active_agents} / ${agents.length}`} />
              </div>

              {/* Per-agent table */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Per-agent breakdown</div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>Sorted by total calls</div>
                </div>

                {agents.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', opacity: 0.35 }}>No agent data yet</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 4 }}>Create an agent and start taking calls to see stats.</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Agent', 'Calls', 'Today', 'Booked', 'Conv.', 'Trend (7d)', ''].map((h, i) => (
                          <th key={i} style={{
                            fontSize: 11, fontWeight: 600, color: 'var(--text-soft)',
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                            padding: '10px 20px', textAlign: 'left',
                            background: '#FAFAFE', borderBottom: '1px solid var(--border)',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a, i) => (
                        <StatsRow
                          key={a.agent_id}
                          agent={a}
                          maxCalls={maxAgentCalls}
                          onOpen={() => navigate(`/agent/${a.agent_id}`)}
                          isLast={i === agents.length - 1}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Week chart */}
              {agents.length > 0 && <WeekChart agents={agents} dateLabels={dateLabels} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StatsRow: React.FC<{ agent: AgentStat; maxCalls: number; onOpen: () => void; isLast: boolean }> = ({ agent, maxCalls, onOpen, isLast }) => {
  const [hover, setHover] = useState(false);
  const border = isLast ? 'none' : '1px solid var(--lavender-bg)';
  const conversionColor = agent.conversion_rate >= 40 ? 'var(--green)' : agent.conversion_rate >= 20 ? 'var(--plum-mid)' : 'var(--text-soft)';
  return (
    <tr
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: hover ? '#FAFAFE' : 'white', cursor: 'pointer', transition: 'background 0.12s' }}
    >
      <td style={{ padding: '12px 20px', borderBottom: border, fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: agent.is_active ? 'var(--green)' : '#9CA3AF',
          }} />
          {agent.name}
        </div>
      </td>
      <td style={{ padding: '12px 20px', borderBottom: border, fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>{agent.total_calls}</td>
      <td style={{ padding: '12px 20px', borderBottom: border, fontSize: 13, color: agent.calls_today > 0 ? 'var(--plum-mid)' : 'var(--text-soft)', fontWeight: agent.calls_today > 0 ? 600 : 400 }}>
        {agent.calls_today > 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Ic.Trend />{agent.calls_today}
          </span>
        ) : '—'}
      </td>
      <td style={{ padding: '12px 20px', borderBottom: border, fontSize: 13, color: 'var(--text-dark)' }}>{agent.appointments_booked}</td>
      <td style={{ padding: '12px 20px', borderBottom: border, fontSize: 13, fontWeight: 600, color: conversionColor }}>
        {agent.total_calls > 0 ? `${agent.conversion_rate}%` : '—'}
      </td>
      <td style={{ padding: '12px 20px', borderBottom: border }}>
        <MiniBars series={agent.calls_7d} max={maxCalls} />
      </td>
      <td style={{ padding: '12px 20px', borderBottom: border, textAlign: 'right' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--plum-mid)' }}>
          Open <Ic.Chevron />
        </span>
      </td>
    </tr>
  );
};

export default StatsPage;
