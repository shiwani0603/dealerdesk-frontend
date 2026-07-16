import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import TelecallerDashboard from './pages/TelecallerDashboard';
import TeamLeaderDashboard from './pages/TeamLeaderDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import UploadPage from './pages/UploadPage';
import UserManagement from './pages/UserManagement';
import DailyCallReport from './pages/DailyCallReport';
import AdvancedSearch from './pages/AdvancedSearch';
import SettingsPage from './pages/SettingsPage';
import AdminPanel from './pages/AdminPanel';
import ServiceIntervalMaster from './pages/ServiceIntervalMaster';
import ReportsPage from './pages/ReportsPage';
import CampaignsPage from './pages/CampaignsPage';
import AdminOverview from './pages/AdminOverview';
import AdminUploadSetupPage from './pages/AdminUploadSetupPage';
import ChangePassword from './pages/ChangePassword';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('App error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
            <p className="text-4xl mb-4">⚠️</p>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-5">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for auth state to resolve before rendering anything
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Intercept: force password change before anything else
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Routes><Route path="*" element={<Navigate to="/change-password" replace />} /></Routes>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/change-password" element={user ? <ChangePassword forced={user.mustChangePassword} /> : <Navigate to="/login" replace />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['telecaller', 'team_leader', 'manager', 'super_manager', 'super_admin']}>
            {user?.role === 'team_leader' ? <TeamLeaderDashboard /> :
             (user?.role === 'manager' || user?.role === 'super_manager') ? <ManagerDashboard /> :
             <TelecallerDashboard />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute allowedRoles={['manager', 'super_manager', 'team_leader', 'super_admin']}>
            <UploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager-dashboard"
        element={
          <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['manager', 'super_manager', 'super_admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/team-leader"
        element={
          <ProtectedRoute allowedRoles={['team_leader', 'manager', 'super_admin']}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/overview"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminOverview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/service-intervals"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <ServiceIntervalMaster />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/upload-setup"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminUploadSetupPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports/daily-calls"
        element={
          <ProtectedRoute allowedRoles={['manager', 'team_leader', 'super_admin', 'super_manager']}>
            <DailyCallReport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['manager', 'team_leader', 'super_admin', 'super_manager']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns"
        element={
          <ProtectedRoute allowedRoles={['manager', 'team_leader', 'super_admin', 'super_manager']}>
            <CampaignsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/search/advanced"
        element={
          <ProtectedRoute allowedRoles={['manager', 'team_leader', 'super_admin']}>
            <AdvancedSearch />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['manager', 'team_leader', 'super_admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '10px', background: '#333', color: '#fff' },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
