import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/common';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import CowList from './pages/cows/CowList';
import CowForm from './pages/cows/CowForm';
import CowDetail from './pages/cows/CowDetail';
import CycleTracker from './pages/cycles/CycleTracker';
import MilkList from './pages/milk/MilkList';
import ExpenseList from './pages/expenses/ExpenseList';
import HealthList from './pages/health/HealthList';
import Reports from './pages/reports/Reports';
import NotificationsPage from './pages/notifications/NotificationsPage';
import Settings from './pages/settings/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="cows" element={<CowList />} />
        <Route path="cows/new" element={<CowForm />} />
        <Route path="cows/:id" element={<CowDetail />} />
        <Route path="cows/:id/edit" element={<CowForm />} />
        <Route path="alerts" element={<CycleTracker />} />
        <Route path="cycles" element={<Navigate to="/alerts" replace />} />
        <Route path="milk" element={<MilkList />} />
        <Route path="expenses" element={<ExpenseList />} />
        <Route path="health" element={<HealthList />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss={false}
            draggable
            pauseOnHover
            theme="light"
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
