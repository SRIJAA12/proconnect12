// Faculty Login Page
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './FacultyLogin.css';

function FacultyLogin() {
  const navigate = useNavigate();
  
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password / OTP States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email' or 'otp'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!employeeId || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    const email = employeeId.includes('@') ? employeeId : `${employeeId}@psgitech.ac.in`;
    
    if (!email.endsWith('@psgitech.ac.in')) {
      setError('Please use your PSGiTech email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await authAPI.facultyLogin(email, password);
      console.log('Login successful:', response);
      window.dispatchEvent(new Event('authTokenUpdated'));
      navigate('/faculty/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      // Get error message from backend response
      const errorMsg = err.response?.data?.error || err.message || 'Login failed. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    
    if (!resetEmail) {
      setResetError('Please enter your email');
      return;
    }
    
    const email = resetEmail.includes('@') ? resetEmail : `${resetEmail}@psgitech.ac.in`;
    
    try {
      setResetLoading(true);
      await authAPI.requestPasswordReset(email);
      
      setResetMessage('✅ OTP sent! Check your email inbox (including spam folder). OTP expires in 10 minutes.');
      // Move to OTP verification step
      setTimeout(() => {
        setResetStep('otp');
        setResetMessage('');
      }, 2000);
    } catch (err: any) {
      console.error('OTP send error:', err);
      const errorMsg = err.response?.data?.error || 'Error sending OTP. Please try again.';
      setResetError(errorMsg);
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    
    if (!resetOTP) {
      setResetError('Please enter the OTP');
      return;
    }
    
    if (resetOTP.length !== 6) {
      setResetError('OTP must be 6 digits');
      return;
    }
    
    const email = resetEmail.includes('@') ? resetEmail : `${resetEmail}@psgitech.ac.in`;
    
    try {
      setResetLoading(true);
      const response = await authAPI.verifyOTP(email, resetOTP);
      
      setResetMessage('✅ OTP verified! Redirecting to password reset page...');
      
      // Redirect to reset password page with token
      setTimeout(() => {
        setShowForgotPassword(false);
        navigate('/reset-password', { state: { resetToken: response.resetToken } });
      }, 1500);
    } catch (err: any) {
      console.error('OTP verify error:', err);
      const errorMsg = err.response?.data?.error || 'Invalid OTP. Please try again.';
      setResetError(errorMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetStep('email');
    setResetEmail('');
    setResetOTP('');
    setResetMessage('');
    setResetError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <h1>Faculty Login</h1>
          <p>PSGiTech Student Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          
          {/* Employee ID / Email Input */}
          <div className="form-group">
            <label htmlFor="employeeId" className="form-label">
              Email
            </label>
            <input
              type="text"
              id="employeeId"
              className="form-input"
              placeholder="e.g name@psgitech.ac.in"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {/* Forgot Password Link */}
          <button
            type="button"
            className="forgot-password-link"
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot Password?
          </button>

          {/* Link to signup page */}
          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/faculty/signup" className="link">
                Sign Up
              </Link>
            </p>
          </div>
        </form>

        {/* Forgot Password Modal with OTP */}
        {showForgotPassword && (
          <div className="modal-overlay" onClick={handleCloseForgotPassword}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {resetStep === 'email' ? (
                <>
                  <h2>Reset Password</h2>
                  <p className="modal-subtitle">Enter your email to receive an OTP</p>
                  <form onSubmit={handleSendOTP}>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Enter your email or employee ID"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="form-input"
                        disabled={resetLoading}
                      />
                    </div>
                    {resetError && <p className="reset-error-message">{resetError}</p>}
                    {resetMessage && <p className="reset-success-message">{resetMessage}</p>}
                    <button 
                      type="submit" 
                      className="btn-reset"
                      disabled={resetLoading}
                      style={{ opacity: resetLoading ? 0.6 : 1, cursor: resetLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {resetLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-cancel"
                      onClick={handleCloseForgotPassword}
                      disabled={resetLoading}
                    >
                      Cancel
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h2>Verify OTP</h2>
                  <p className="modal-subtitle">Enter the 6-digit OTP sent to your email</p>
                  <form onSubmit={handleVerifyOTP}>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={resetOTP}
                        onChange={(e) => setResetOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="form-input"
                        disabled={resetLoading}
                        maxLength={6}
                      />
                    </div>
                    {resetError && <p className="reset-error-message">{resetError}</p>}
                    {resetMessage && <p className="reset-success-message">{resetMessage}</p>}
                    <button 
                      type="submit" 
                      className="btn-reset"
                      disabled={resetLoading || resetOTP.length !== 6}
                      style={{ opacity: resetLoading || resetOTP.length !== 6 ? 0.6 : 1, cursor: resetLoading || resetOTP.length !== 6 ? 'not-allowed' : 'pointer' }}
                    >
                      {resetLoading ? 'Verifying OTP...' : 'Verify OTP'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-cancel"
                      onClick={() => {
                        setResetStep('email');
                        setResetOTP('');
                        setResetError('');
                        setResetMessage('');
                      }}
                      disabled={resetLoading}
                    >
                      Back
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FacultyLogin;
