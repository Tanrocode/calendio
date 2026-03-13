import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

/** Same hostname as the page so session cookies work (localhost vs 127.0.0.1). */
const API_BASE = `http://${window.location.hostname}:5001`;

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({ total_conversations: 0, total_appointments_created: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  const [eventMessageType, setEventMessageType] = useState<'success' | 'error' | null>(null);

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

  const handleConnectGoogle = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/url`, {
        withCredentials: true,
      });
      const authUrl = res.data.url;
      window.location.href = authUrl;
    } catch (error: any) {
      let msg = 'Failed to start Google authentication.';
      if (error.message) {
        msg = `Failed to start Google authentication: ${error.message}`;
      }
      setEventMessage(msg);
      setEventMessageType('error');
    }
  };

  const handleCreateEvent = async () => {
    if (!date || !startTime || !endTime) {
      setEventMessage('Date, start time, and end time are required.');
      setEventMessageType('error');
      return;
    }

    const start = `${date}T${startTime}`;
    const end = `${date}T${endTime}`;

    try {
      const response = await axios.post(
        `${API_BASE}/add-event`,
        {
          title,
          description,
          start,
          end,
        },
        { withCredentials: true }
      );
      setEventMessage('Event created successfully in Google Calendar.');
      setEventMessageType('success');
    } catch (error: any) {
      // If not authenticated, prompt the user to connect Google first
      if (error.response?.status === 401) {
        setEventMessage(
          'Connect Google Calendar first (same tab), then create an event.'
        );
        setEventMessageType('error');
        // Optionally start the auth flow automatically:
        // await handleConnectGoogle();
        return;
      }

      let msg = 'Failed to create event.';
      if (error.response?.data?.error) {
        msg = `Failed to create event: ${error.response.data.error}`;
      } else if (error.message) {
        msg = `Failed to create event: ${error.message}`;
      }
      setEventMessage(msg);
      setEventMessageType('error');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <MetricsCard metrics={metrics} />
      <h2 className="text-xl font-semibold mt-6 mb-2">Upcoming Appointments</h2>

      {/* Google auth + event creation */}
      {eventMessage && (
        <div
          className={`mt-4 mb-2 rounded px-3 py-2 text-sm ${
            eventMessageType === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {eventMessage}
        </div>
      )}

      <button
        type="button"
        className="mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        onClick={handleConnectGoogle}
      >
        Connect Google Calendar
      </button>

      <form className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="event-title">
            Event title
          </label>
          <input
            id="event-title"
            type="text"
            className="w-full border rounded px-3 py-2"
            placeholder="Consultation with client"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="event-description">
            Description
          </label>
          <textarea
            id="event-description"
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Optional notes about the appointment"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="event-date">
              Date
            </label>
            <input
              id="event-date"
              type="date"
              className="w-full border rounded px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="event-start">
              Start time
            </label>
            <input
              id="event-start"
              type="time"
              className="w-full border rounded px-3 py-2"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="event-end">
              End time
            </label>
            <input
              id="event-end"
              type="time"
              className="w-full border rounded px-3 py-2"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={handleCreateEvent}
          >
            Create Google Calendar Event
          </button>
        </div>
      </form>

      <ul className="space-y-2 mt-6">
        {Array.isArray(appointments) &&
          appointments.map((a, i) => (
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
