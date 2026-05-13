import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'faculty' | 'student';
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Simply check if token exists in localStorage
    // The axios interceptor will handle token refresh on actual API calls
    if (!isAuthenticated()) {
      console.log('No authentication token found - redirecting to login');
      setIsAuthorized(false);
      navigate('/faculty/login');
      return;
    }
    
    console.log('Token found - user is authorized');
    setIsAuthorized(true);
  }, [navigate]);

  // Show loading while checking auth state
  if (isAuthorized === null) {
    return <div style={{ padding: '50px 20px', textAlign: 'center' }}>Checking access...</div>;
  }

  // If not authorized, don't render the component
  if (!isAuthorized) {
    return null;
  }

  // If authorized, render the protected component
  return <>{children}</>;
}
