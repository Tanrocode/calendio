import React, { useEffect, useState } from 'react';
import { getMetrics } from '../services/api.ts';
import MetricsCard from '../components/MetricsCard.tsx';

type Appointment = {
  customer_name: string;
  service: string;
  start_time: string;
  end_time: string;
};

type Metrics = {
  total_conversations: number;
  total_appointments_created: number;
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({ total_conversations: 0, total_appointments_created: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.business_id) {
      window.location.href = '/login';
      return;
    }
    getMetrics(user.business_id).then((data) => {
      setMetrics(data.metrics);
      setAppointments(data.upcoming_appointments);
    });
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <MetricsCard metrics={metrics} />
      <h2 className="text-xl font-semibold mt-6 mb-2">Upcoming Appointments</h2>
      <ul className="space-y-2">
        {appointments.map((a, i) => (
          <li key={i} className="border rounded p-2">
            <div><b>{a.customer_name}</b> — {a.service}</div>
            <div>{a.start_time} to {a.end_time}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
