import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@client/src/store/auth.store';

const AdminRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
