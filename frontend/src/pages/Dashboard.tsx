import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getMetrics } from '../services/api.ts';
import MetricsCard from '../components/MetricsCard.tsx';
import Navbar from '../components/NavBar.tsx';
import '../styles/Dashboard.css';

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
      await axios.post(
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
    <div className="dashboard-page">
      <Navbar />
      <div className="dashboard-shell">
        <div className="dashboard-card">
          <h1 className="dashboard-title">Dashboard</h1>

          <MetricsCard metrics={metrics} />
          <h2 className="dashboard-section-title">Upcoming Appointments</h2>

          {/* Google auth + event creation */}
          {eventMessage && (
            <div
              className={[
                'dashboard-alert',
                eventMessageType === 'success'
                  ? 'dashboard-alert-success'
                  : 'dashboard-alert-error',
              ].join(' ')}
            >
              {eventMessage}
            </div>
          )}

          <button
            type="button"
            className="dashboard-button dashboard-button-primary"
            style={{ marginTop: 6 }}
            onClick={handleConnectGoogle}
          >
            Connect Google Calendar
          </button>

          <form className="dashboard-form">
            <div>
              <label className="dashboard-label" htmlFor="event-title">
                Event title
              </label>
              <input
                id="event-title"
                type="text"
                className="dashboard-input"
                placeholder="Consultation with client"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="dashboard-label" htmlFor="event-description">
                Description
              </label>
              <textarea
                id="event-description"
                className="dashboard-textarea"
                rows={3}
                placeholder="Optional notes about the appointment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="dashboard-form-grid">
              <div>
                <label className="dashboard-label" htmlFor="event-date">
                  Date
                </label>
                <input
                  id="event-date"
                  type="date"
                  className="dashboard-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="dashboard-label" htmlFor="event-start">
                  Start time
                </label>
                <input
                  id="event-start"
                  type="time"
                  className="dashboard-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="dashboard-label" htmlFor="event-end">
                  End time
                </label>
                <input
                  id="event-end"
                  type="time"
                  className="dashboard-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                className="dashboard-button dashboard-button-green"
                onClick={handleCreateEvent}
              >
                Create Google Calendar Event
              </button>
            </div>
          </form>

          <ul className="dashboard-appointments">
            {Array.isArray(appointments) &&
              appointments.map((a, i) => (
                <li key={i} className="dashboard-appointment-item">
                  <div>
                    <span className="dashboard-appointment-name">{a.customer_name}</span> -{' '}
                    {a.service}
                  </div>
                  <div>
                    {a.start_time} to {a.end_time}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
