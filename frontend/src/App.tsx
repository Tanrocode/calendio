import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import CalendarDemo from './pages/CalendarDemo';
import AgentPage from './pages/AgentPage';
import AgentsPage from './pages/AgentsPage';
import StatsPage from './pages/StatsPage';
import TestAgent from './pages/TestAgent';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/auth" replace />} />
        <Route path="/auth/v1/callback" element={<AuthCallback />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/statistics" element={<StatsPage />} />
          <Route path="/calendar-demo" element={<CalendarDemo />} />
          <Route path="/agent/:id" element={<AgentPage />} />
          <Route path="/test/:token" element={<TestAgent />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
