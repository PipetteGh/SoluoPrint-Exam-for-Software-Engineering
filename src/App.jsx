import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import PrintJobsPage from './pages/PrintJobsPage'
import JobListPage from './pages/JobListPage'
import PaymentsPage from './pages/PaymentsPage'
import ReceivablesPage from './pages/ReceivablesPage'
import ReviewsPage from './pages/ReviewsPage'
import ExpensesPage from './pages/ExpensesPage'
import RevenueReportPage from './pages/reports/RevenueReportPage'
import ExpenseReportPage from './pages/reports/ExpenseReportPage'
import ProfitLossPage from './pages/reports/ProfitLossPage'
import ServicesPage from './pages/config/ServicesPage'
import ServiceCategoriesPage from './pages/config/ServiceCategoriesPage'
import CustomerTypesPage from './pages/config/CustomerTypesPage'
import PresetSizesPage from './pages/config/PresetSizesPage'
import PaymentAccountsPage from './pages/finance/PaymentAccountsPage'
import ExpenseAccountsPage from './pages/finance/ExpenseAccountsPage'
import SettingsPage from './pages/settings/SettingsPage'
import CompanyProfilePage from './pages/settings/CompanyProfilePage'
import UserManagementPage from './pages/settings/UserManagementPage'
import RoleManagementPage from './pages/settings/RoleManagementPage'
import BillingPage from './pages/settings/BillingPage'
import PreferencesPage from './pages/settings/PreferencesPage'
import SecurityPage from './pages/settings/SecurityPage'
import SmsNotificationsPage from './pages/settings/SmsNotificationsPage'
import DataBackupPage from './pages/settings/DataBackupPage'
import PaymentIntegrationsPage from './pages/settings/PaymentIntegrationsPage'
import ConnectivityManager from './components/ui/ConnectivityManager'
import ErrorBoundary from './components/ui/ErrorBoundary'

import Preloader from './components/ui/Preloader'
import { HelmetProvider } from 'react-helmet-async'

function PrivateRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Preloader fullScreen />
  return profile ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Preloader fullScreen />
  return profile ? <Navigate to="/dashboard" replace /> : children
}

function PermissionRoute({ children, permission }) {
  const { profile, loading, hasPermission } = useAuth()
  if (loading) return <Preloader fullScreen />
  if (!profile) return <Navigate to="/login" replace />
  if (!hasPermission(permission)) return <Navigate to="/dashboard" replace />
  return children
}

import MarketingLayout from './components/layout/MarketingLayout'
import HomePage from './pages/marketing/HomePage'
import FeaturesPage from './pages/marketing/FeaturesPage'
import TourPage from './pages/marketing/TourPage'
import PricingPage from './pages/marketing/PricingPage'
import ContactPage from './pages/marketing/ContactPage'
import CustomerPortal from './pages/CustomerPortal'
import CustomerLoginPage from './pages/CustomerLoginPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Marketing Routes */}
      <Route element={<PublicRoute><MarketingLayout /></PublicRoute>}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/tour" element={<TourPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Public Auth Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Customer Login & Portal Routes (Custom Auth) */}
      <Route path="/customer-login" element={<CustomerLoginPage />} />
      <Route path="/customer" element={<CustomerPortal />} />
      
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<PermissionRoute permission="view_customers"><CustomersPage /></PermissionRoute>} />
        <Route path="jobs" element={<PermissionRoute permission="view_jobs"><PrintJobsPage /></PermissionRoute>} />
        <Route path="job-list" element={<PermissionRoute permission="view_jobs"><JobListPage /></PermissionRoute>} />
        <Route path="payments" element={<PermissionRoute permission="view_payments"><PaymentsPage /></PermissionRoute>} />
        <Route path="receivables" element={<PermissionRoute permission="view_reports"><ReceivablesPage /></PermissionRoute>} />
        <Route path="reviews" element={<PermissionRoute permission="view_reports"><ReviewsPage /></PermissionRoute>} />
        <Route path="expenses" element={<PermissionRoute permission="view_expenses"><ExpensesPage /></PermissionRoute>} />
        <Route path="reports/revenue" element={<PermissionRoute permission="view_reports"><RevenueReportPage /></PermissionRoute>} />
        <Route path="reports/expenses" element={<PermissionRoute permission="view_reports"><ExpenseReportPage /></PermissionRoute>} />
        <Route path="reports/profit-loss" element={<PermissionRoute permission="view_reports"><ProfitLossPage /></PermissionRoute>} />
        <Route path="services" element={<PermissionRoute permission="manage_settings"><ServicesPage /></PermissionRoute>} />
        <Route path="service-categories" element={<PermissionRoute permission="manage_settings"><ServiceCategoriesPage /></PermissionRoute>} />
        <Route path="customer-types" element={<PermissionRoute permission="manage_settings"><CustomerTypesPage /></PermissionRoute>} />
        <Route path="preset-sizes" element={<PermissionRoute permission="manage_settings"><PresetSizesPage /></PermissionRoute>} />
        <Route path="payment-accounts" element={<PermissionRoute permission="manage_settings"><PaymentAccountsPage /></PermissionRoute>} />
        <Route path="expense-accounts" element={<PermissionRoute permission="manage_settings"><ExpenseAccountsPage /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute permission="manage_settings"><SettingsPage /></PermissionRoute>} />
        <Route path="settings/company" element={<PermissionRoute permission="manage_settings"><CompanyProfilePage /></PermissionRoute>} />
        <Route path="settings/users" element={<PermissionRoute permission="manage_settings"><UserManagementPage /></PermissionRoute>} />
        <Route path="settings/roles" element={<PermissionRoute permission="manage_settings"><RoleManagementPage /></PermissionRoute>} />
        <Route path="settings/billing" element={<PermissionRoute permission="manage_settings"><BillingPage /></PermissionRoute>} />
        <Route path="settings/preferences" element={<PermissionRoute permission="manage_settings"><PreferencesPage /></PermissionRoute>} />
        <Route path="settings/security" element={<PermissionRoute permission="manage_settings"><SecurityPage /></PermissionRoute>} />
        <Route path="settings/payments" element={<PermissionRoute permission="manage_settings"><PaymentIntegrationsPage /></PermissionRoute>} />
        <Route path="settings/sms" element={<PermissionRoute permission="manage_settings"><SmsNotificationsPage /></PermissionRoute>} />
        <Route path="settings/backup" element={<PermissionRoute permission="manage_settings"><DataBackupPage /></PermissionRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
              <ConnectivityManager />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </HelmetProvider>
  )
}
