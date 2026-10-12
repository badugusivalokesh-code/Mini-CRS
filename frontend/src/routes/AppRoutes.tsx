import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RegisterPage from '@/pages/RegisterPage'
import CustomersPage from '@/pages/CustomersPage'
import CustomerDetailPage from '@/pages/CustomerDetailPage'
import DealsPage from '@/pages/DealsPage'
import TasksPage from '@/pages/TasksPage'
import LandingPage from '@/pages/LandingPage'

/**
 * Root route table.
 * /landing  — public marketing/landing page (unauthenticated)
 * /login    — sign-in page
 * /register — registration page
 * /         — protected app entry (Dashboard)
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
