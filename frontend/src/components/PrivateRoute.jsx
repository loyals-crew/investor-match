import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bug #7: Added requiredRole prop for role-based route protection.
 * If requiredRole is specified and the user's role doesn't match,
 * redirects to /dashboard.
 */
export default function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Role-based guard
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
