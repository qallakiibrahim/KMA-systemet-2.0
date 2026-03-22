import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './apps/auth/pages/Login';
import Register from './apps/auth/pages/Register';
import NotFound from './apps/auth/pages/NotFound';
import AvvikelseList from './apps/avvikelse/pages/AvvikelseList';
import RiskList from './apps/risk/pages/RiskList';
import CompanyList from './apps/company/pages/CompanyList';
import DokumentList from './apps/dokument/pages/DokumentList';
import ProcessList from './apps/process/pages/ProcessList';
import AdminPanel from './apps/admin/pages/AdminPanel';
import Dashboard from './apps/rapport_statistik/pages/Dashboard';
import CalendarPage from './apps/calendar/pages/CalendarPage';
import TaskDashboard from './apps/task/pages/TaskDashboard';
import AIAssistant from './apps/ai_assistent/pages/AIAssistant';
import { useAuth } from './shared/api/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Laddar...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/avvikelse" element={<ProtectedRoute><AvvikelseList /></ProtectedRoute>} />
      <Route path="/risk" element={<ProtectedRoute><RiskList /></ProtectedRoute>} />
      <Route path="/company" element={<ProtectedRoute><CompanyList /></ProtectedRoute>} />
      <Route path="/dokument" element={<ProtectedRoute><DokumentList /></ProtectedRoute>} />
      <Route path="/process" element={<ProtectedRoute><ProcessList /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/statistik" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><TaskDashboard /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/process" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
