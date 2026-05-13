import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, isAuthenticated } from '../services/api';
import '../styles/Header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionStudentEmail, setSessionStudentEmail] = useState<string | null>(sessionStorage.getItem('studentEmail'));
  const [showDropdown, setShowDropdown] = useState(false);

  // Determine if we're on a login/signup page
  const isAuthPage = ['/faculty/login', '/faculty/signup', '/student/login', '/student/signup', '/reset-password'].includes(location.pathname);

  // Function to extract email from token
  const extractEmailFromToken = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email;
      } catch (e) {
        console.error('Failed to decode token:', e);
        return null;
      }
    }
    return null;
  };

  // Get user email from localStorage when component mounts
  useEffect(() => {
    // Clear user info on auth pages
    if (isAuthPage) {
      setUserEmail(null);
      setSessionStudentEmail(null);
      return;
    }

    const email = extractEmailFromToken();
    setUserEmail(email);
    setSessionStudentEmail(sessionStorage.getItem('studentEmail'));

    // Listen for auth token updates (happens when user logs in)
    const handleAuthTokenUpdated = () => {
      const newEmail = extractEmailFromToken();
      setUserEmail(newEmail);
      console.log('Auth token updated, new email:', newEmail);
    };

    window.addEventListener('authTokenUpdated', handleAuthTokenUpdated);
    
    // Also listen for storage changes (when login happens in another tab)
    const handleStorageChange = () => {
      const newEmail = extractEmailFromToken();
      setUserEmail(newEmail);
      setSessionStudentEmail(sessionStorage.getItem('studentEmail'));
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('authTokenUpdated', handleAuthTokenUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthPage]);

  const handleLogout = () => {
    const hasFacultyToken = !!localStorage.getItem('token');
    authAPI.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('studentEmail');
    sessionStorage.removeItem('studentRollNumber');
    setUserEmail(null); // Clear the UI immediately
    setSessionStudentEmail(null);
    setShowDropdown(false); // Close dropdown
    // Force a small delay to ensure state updates before navigation
    setTimeout(() => {
      navigate(hasFacultyToken ? '/faculty/login' : '/student/login');
    }, 100);
  };

  const menuEmail = userEmail || sessionStudentEmail;

  return (
    <header className="psg-header">
      <div className="header-container">
        <div className="header-content">
          <div className="logo-section">
            <img src="/images/logo.png" alt="PSG Institute Logo" className="psg-logo" />
          </div>
          <div className="title-section">
            <h1 className="app-title">ProConnect</h1>
            <p className="college-name">PSG INSTITUTE OF TECHNOLOGY AND APPLIED RESEARCH</p>
          </div>
          
          {/* User Menu */}
          {!isAuthPage && (isAuthenticated() || !!sessionStudentEmail) && menuEmail && (
            <div className="user-menu">
              <button 
                className="user-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className="user-email">{menuEmail}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {showDropdown && (
                <div className="dropdown-menu">
                  <button 
                    className="logout-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
