import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { RequireAuth, RequireStaff } from './components/Guards';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminMonitoringPage } from './pages/admin/AdminMonitoringPage';
import { AdminOperationsPage } from './pages/admin/AdminOperationsPage';
import { AdminSchemeDetailPage } from './pages/admin/AdminSchemeDetailPage';
import { AdminSchemeEditorPage } from './pages/admin/AdminSchemeEditorPage';
import { AdminSchemesPage } from './pages/admin/AdminSchemesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CentresPage } from './pages/CentresPage';
import { ComparePage } from './pages/ComparePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MatchesPage } from './pages/MatchesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SavedPage } from './pages/SavedPage';
import { SchemeDetailPage } from './pages/SchemeDetailPage';
import { SchemesPage } from './pages/SchemesPage';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.error('Service worker registration failed:', error);
  });
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you requested does not exist.</p>
      <Link to="/" className="btn-primary mt-6">Go to home</Link>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="schemes" element={<SchemesPage />} />
        <Route path="schemes/:slug" element={<SchemeDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="centres" element={<CentresPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<RequireAuth><Outlet /></RequireAuth>}>
          <Route path="matches" element={<MatchesPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="schemes" element={<AdminSchemesPage />} />
          <Route path="schemes/new" element={<AdminSchemeEditorPage />} />
          <Route path="schemes/:id/edit" element={<AdminSchemeEditorPage />} />
          <Route path="schemes/:id" element={<AdminSchemeDetailPage />} />
          <Route path="monitoring" element={<AdminMonitoringPage />} />
          <Route path="operations" element={<AdminOperationsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);