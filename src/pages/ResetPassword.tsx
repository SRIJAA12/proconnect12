// Password Reset Page - User lands here after OTP verification
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './FacultyLogin.css';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get reset token from navigation state OR from URL query params (for email links)
  const resetToken = (location.state as any)?.resetToken || new URLSearchParams(location.search).get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  // Check if token is provided
  useEffect(() => {
    if (!resetToken) {
      setError('No reset token provided. Please use the link from your email or verify your OTP.');
      setTokenValid(false);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/faculty/login');
      }, 3000);
    }
  }, [resetToken, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!resetToken) {
      setError('Invalid reset token');
      return;
    }

    try {
      setLoading(true);
      
      // Call API to reset password
      const response = await authAPI.resetPassword(resetToken, newPassword);
      
      // Show success message
      setSuccess('✅ ' + response.message);
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/faculty/login');
      }, 2000);
      
    } catch (err: any) {
      console.error('Reset error:', err);
      const errorMsg = err.response?.data?.error || 'Error resetting password. Please try again.';
      
      if (errorMsg.includes('expired')) {
        setError('⏰ Reset link has expired. Please request a new one.');
        setTokenValid(false);
      } else if (errorMsg.includes('Invalid')) {
        setError('❌ Invalid reset link. Please request a new one.');
        setTokenValid(false);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ marginTop: '40px' }}>
        {/* Header */}
        <h1 style={{ marginBottom: '24px', color: '#2c3e50' }}>Reset Your Password</h1>
        
        {!tokenValid && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fadbd8',
            color: '#c0392b',
            borderRadius: '4px',
            marginBottom: '16px',
            border: '1px solid #e74c3c'
          }}>
            <p style={{ margin: '0 0 12px 0' }}>Your reset link is invalid or expired.</p>
            <Link 
              to="/faculty/login" 
              style={{
                color: '#c0392b',
                textDecoration: 'underline',
                fontWeight: 'bold'
              }}
            >
              Go back to login and request a new link
            </Link>
          </div>
        )}

        {tokenValid && (
          <>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
              Enter your new password below
            </p>

            {/* Reset Form */}
            <form onSubmit={handleResetPassword}>
              {/* New Password Field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2c3e50' }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    opacity: loading ? 0.6 : 1,
                  }}
                  required
                />
              </div>

              {/* Confirm Password Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2c3e50' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    opacity: loading ? 0.6 : 1,
                  }}
                  required
                />
              </div>

              {/* Error Message */}
              {error && <div className="error-message">{error}</div>}

              {/* Success Message */}
              {success && (
                <div style={{
                  color: '#27ae60',
                  padding: '12px',
                  borderRadius: '4px',
                  backgroundColor: '#d5f4e6',
                  border: '1px solid #27ae60',
                  marginBottom: '16px'
                }}>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn btn-primary btn-full"
                disabled={loading}
                style={{
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p style={{ color: '#7f8c8d', fontSize: '14px' }}>
                Remember your password?{' '}
                <Link to="/faculty/login" style={{ color: '#3498db', textDecoration: 'none', fontWeight: 'bold' }}>
                  Login here
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
