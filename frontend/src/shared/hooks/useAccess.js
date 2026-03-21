import { useAuth } from '../api/AuthContext';

export const useAccess = () => {
  const { user } = useAuth();

  const hasAccess = (requiredRole) => {
    if (!user) return false;
    // Simple role check logic
    return user.role === 'admin' || user.role === requiredRole;
  };

  return { hasAccess };
};
