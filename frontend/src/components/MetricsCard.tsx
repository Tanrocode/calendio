import React from 'react';

type Metrics = {
  total_conversations: number;
  total_appointments_created: number;
};

const MetricsCard: React.FC<{ metrics: Metrics }> = ({ metrics }) => (
  <div className="border rounded p-4 mb-4 bg-gray-50">
    <div className="font-semibold">Total Conversations: {metrics.total_conversations}</div>
    <div className="font-semibold">Total Appointments: {metrics.total_appointments_created}</div>
  </div>
);

export default MetricsCard;
