import React from 'react';

type Metrics = {
  total_conversations: number;
  total_appointments_created: number;
};

const MetricsCard: React.FC<{ metrics: Metrics }> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e8edf3',
        borderRadius: 16,
        padding: '18px 18px',
        marginBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div
        style={{
          flex: '1 1 240px',
          border: '1px solid #e8edf3',
          background: '#fff',
          borderRadius: 14,
          padding: '14px 14px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b' }}>
          Total Conversations
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>
          {metrics.total_conversations}
        </div>
      </div>

      <div
        style={{
          flex: '1 1 240px',
          border: '1px solid #e8edf3',
          background: '#fff',
          borderRadius: 14,
          padding: '14px 14px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b' }}>
          Total Appointments
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 8 }}>
          {metrics.total_appointments_created}
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;

