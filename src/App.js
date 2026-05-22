import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import TelecallerDashboard from './pages/TelecallerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import UploadPage from './pages/UploadPage';

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
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['telecaller', 'team_leader', 'manager', 'super_admin']}>
            <TelecallerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
  path="/upload"
  element={
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
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
        path="/team-leader"
        element={
          <ProtectedRoute allowedRoles={['team_leader', 'manager', 'super_admin']}>
            <TelecallerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <TelecallerDashboard />
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
  );
}

export default App;
