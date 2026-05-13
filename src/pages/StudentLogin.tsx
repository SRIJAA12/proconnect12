// Student Login Page
import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { studentAPI } from '../services/api';
import './FacultyLogin.css'; // Reuse styling

function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState(() => sessionStorage.getItem('studentEmail') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetRollNumber, setResetRollNumber] = useState('');
  const [resetOTP, setResetOTP] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'otp' | 'password'>('request');
  const [studentResetToken, setStudentResetToken] = useState('');

  useEffect(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email;
    if (stateEmail) {
      setEmail(stateEmail);
    }
  }, [location.state]);

  // Function that runs when user clicks "Login" button
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError('');
    
    // Validation: Check required fields
    if (!email || !password) {
      setError('Please fill in email and password');
      return;
    }
    
    // Start loading state
    setLoading(true);
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('Attempting to authenticate student with email:', normalizedEmail);
      
      // Authenticate via backend API
      const response = await studentAPI.authenticate(normalizedEmail, password);
      
      console.log('Login successful:', response);
      
      const rollNumber = response.student?.rollNumber || '';
      
      // Store login session
      sessionStorage.setItem('studentEmail', normalizedEmail);
      sessionStorage.setItem('studentRollNumber', rollNumber);
      
      navigate('/student/form');
      
    } catch (err: any) {
      console.error('Student login error:', err);
      
      const status = err.response?.status;
      const apiError = err.response?.data?.error;

      if (status === 404) {
        setError('No student account found. Please sign up first.');
      } else if (status === 401) {
        setError(apiError || 'Incorrect password. Please try again.');
      } else if (status === 400) {
        setError(apiError || 'Invalid request. Please check your credentials.');
      } else if (!err.response) {
        // Network error — fall back to localStorage for offline usage
        console.log('Backend unreachable, falling back to localStorage');
        const accounts = JSON.parse(localStorage.getItem('studentAccounts') || '[]');
        const account = accounts.find((acc: any) => acc.email.toLowerCase() === email.toLowerCase().trim());
        if (!account) {
          setError('Cannot reach server and no offline account found. Please try again later.');
        } else if (account.password !== password) {
          setError('Incorrect password. Please try again.');
        } else {
          sessionStorage.setItem('studentEmail', email.toLowerCase().trim());
          sessionStorage.setItem('studentRollNumber', account.rollNumber);
          navigate('/student/form');
        }
      } else {
        setError(apiError || 'Login failed. Please try again.');
      }
    } finally {
      // Stop loading state
      setLoading(false);
    }
  };


  const handleSendStudentOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!resetEmail || !resetRollNumber) {
      setResetError('Please enter your email and roll number');
      return;
    }

    try {
      setResetLoading(true);
      const response = await studentAPI.requestPasswordReset(resetEmail, resetRollNumber);
      setResetMessage(response.message || 'OTP sent to your email.');
      setResetStep('otp');
    } catch (err: any) {
      console.error('Student OTP send error:', err);
      setResetError(err.response?.data?.error || 'Unable to send OTP. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyStudentOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!resetOTP) {
      setResetError('Please enter the OTP');
      return;
    }

    try {
      setResetLoading(true);
      const response = await studentAPI.verifyPasswordResetOTP(resetEmail, resetRollNumber, resetOTP);
      setStudentResetToken(response.resetToken || '');
      setResetMessage('OTP verified. You can now set a new password.');
      setResetStep('password');
    } catch (err: any) {
      console.error('Student OTP verify error:', err);
      setResetError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!studentResetToken) {
      setResetError('Please verify the OTP first');
      return;
    }

    if (!resetPassword || !resetConfirmPassword) {
      setResetError('Please fill all password fields');
      return;
    }

    if (resetPassword.length < 6) {
      setResetError('New password must be at least 6 characters');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    const accounts = JSON.parse(localStorage.getItem('studentAccounts') || '[]');
    const index = accounts.findIndex(
      (acc: any) => acc.email.toLowerCase() === resetEmail.toLowerCase() && acc.rollNumber === resetRollNumber
    );

    if (index === -1) {
      setResetError('No matching student account found for this email and roll number');
      return;
    }

    accounts[index].password = resetPassword;
    localStorage.setItem('studentAccounts', JSON.stringify(accounts));
    setResetMessage('Password reset successful. Please login with your new password.');

    setTimeout(() => {
      setShowForgotPassword(false);
      setPassword('');
      setResetEmail('');
      setResetRollNumber('');
      setResetOTP('');
      setResetPassword('');
      setResetConfirmPassword('');
      setResetMessage('');
      setResetError('');
      setStudentResetToken('');
      setResetStep('request');
    }, 1200);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <h1>Student Login</h1>
          <p>PSGiTech Student Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

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

          {/* Continue Button */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Sign up link */}
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/student/signup" className="auth-link">
            Sign up here
          </Link>
        </p>

        <p className="auth-footer">
          <button
            type="button"
            className="auth-link"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            onClick={() => {
              setResetEmail(email);
              setResetRollNumber('');
              setResetOTP('');
              setResetPassword('');
              setResetConfirmPassword('');
              setResetMessage('');
              setResetError('');
              setStudentResetToken('');
              setResetStep('request');
              setShowForgotPassword(true);
            }}
          >
            Forgot Password?
          </button>
        </p>

        {showForgotPassword && (
          <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {resetStep === 'request' && (
                <>
                  <h2>Reset Student Password</h2>
                  <p className="modal-subtitle">Enter your email and roll number to receive an OTP</p>

                  <form onSubmit={handleSendStudentOTP}>
                    <div className="form-group">
                      <input
                        type="email"
                        placeholder="Student email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="form-input"
                        disabled={resetLoading}
                      />
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Roll number"
                        value={resetRollNumber}
                        onChange={(e) => setResetRollNumber(e.target.value)}
                        className="form-input"
                        disabled={resetLoading}
                      />
                    </div>

                    {resetError && <p className="reset-error-message">{resetError}</p>}
                    {resetMessage && <p className="reset-success-message">{resetMessage}</p>}

                    <button type="submit" className="btn-reset" disabled={resetLoading}>
                      {resetLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                    <button type="button" className="btn-cancel" onClick={() => setShowForgotPassword(false)} disabled={resetLoading}>
                      Cancel
                    </button>
                  </form>
                </>
              )}

              {resetStep === 'otp' && (
                <>
                  <h2>Verify OTP</h2>
                  <p className="modal-subtitle">We sent an OTP to {resetEmail}. Enter it below.</p>

                  <form onSubmit={handleVerifyStudentOTP}>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        value={resetOTP}
                        onChange={(e) => setResetOTP(e.target.value)}
                        className="form-input"
                        disabled={resetLoading}
                      />
                    </div>

                    {resetError && <p className="reset-error-message">{resetError}</p>}
                    {resetMessage && <p className="reset-success-message">{resetMessage}</p>}

                    <button type="submit" className="btn-reset" disabled={resetLoading}>
                      {resetLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button type="button" className="btn-cancel" onClick={() => setShowForgotPassword(false)} disabled={resetLoading}>
                      Cancel
                    </button>
                  </form>
                </>
              )}

              {resetStep === 'password' && (
                <>
                  <h2>Set New Password</h2>
                  <p className="modal-subtitle">Create a new password for your student account.</p>

                  <form onSubmit={handleResetPassword}>
                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="New password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="form-input"
                        disabled={resetLoading}
                      />
                    </div>

                    <div className="form-group">
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="form-input"
                        disabled={resetLoading}
                      />
                    </div>

                    {resetError && <p className="reset-error-message">{resetError}</p>}
                    {resetMessage && <p className="reset-success-message">{resetMessage}</p>}

                    <button type="submit" className="btn-reset" disabled={resetLoading}>
                      Reset Password
                    </button>
                    <button type="button" className="btn-cancel" onClick={() => setShowForgotPassword(false)} disabled={resetLoading}>
                      Cancel
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

export default StudentLogin;
