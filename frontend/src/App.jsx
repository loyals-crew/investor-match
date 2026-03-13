import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import InvestorOnboarding from './pages/onboarding/InvestorOnboarding';
import CompanyOnboarding from './pages/onboarding/CompanyOnboarding';
import InvestorDashboard from './pages/dashboard/InvestorDashboard';
import CompanyDashboard from './pages/dashboard/CompanyDashboard';
import EditInvestorProfile from './pages/profile/EditInvestorProfile';
import EditCompanyProfile from './pages/profile/EditCompanyProfile';
import CreateFund from './pages/funds/CreateFund';
import EditFund from './pages/funds/EditFund';
import CreateRaise from './pages/raises/CreateRaise';
import EditRaise from './pages/raises/EditRaise';

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarding_completed) {
    return <Navigate to={user.role === 'investor' ? '/onboarding/investor' : '/onboarding/company'} replace />;
  }
  return <Navigate to={user.role === 'investor' ? '/dashboard/investor' : '/dashboard/company'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/onboarding/investor" element={
            <PrivateRoute><InvestorOnboarding /></PrivateRoute>
          } />
          <Route path="/onboarding/company" element={
            <PrivateRoute><CompanyOnboarding /></PrivateRoute>
          } />

          <Route path="/dashboard/investor" element={
            <PrivateRoute><InvestorDashboard /></PrivateRoute>
          } />
          <Route path="/dashboard/company" element={
            <PrivateRoute><CompanyDashboard /></PrivateRoute>
          } />

          <Route path="/profile/investor/edit" element={
            <PrivateRoute><EditInvestorProfile /></PrivateRoute>
          } />
          <Route path="/profile/company/edit" element={
            <PrivateRoute><EditCompanyProfile /></PrivateRoute>
          } />

          <Route path="/funds/new" element={
            <PrivateRoute><CreateFund /></PrivateRoute>
          } />
          <Route path="/funds/:id/edit" element={
            <PrivateRoute><EditFund /></PrivateRoute>
          } />

          <Route path="/raises/new" element={
            <PrivateRoute><CreateRaise /></PrivateRoute>
          } />
          <Route path="/raises/:id/edit" element={
            <PrivateRoute><EditRaise /></PrivateRoute>
          } />

          <Route path="/dashboard" element={
            <PrivateRoute><DashboardRedirect /></PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
