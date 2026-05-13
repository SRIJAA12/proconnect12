import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Faculty pages
import FacultyLogin from './pages/FacultyLogin';
import FacultySignup from './pages/FacultySignup';
import FacultyDashboard from './pages/FacultyDashboard';
import ResetPassword from './pages/ResetPassword';

// Student pages
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import StudentForm from './pages/StudentForm';

function App() {
  const baseUrl = import.meta.env.BASE_URL;
  const appMainStyle = {
    backgroundImage: `
      linear-gradient(135deg, rgba(232, 220, 200, 0.45), rgba(245, 241, 232, 0.45)),
      url('${baseUrl}images/bg.jpeg')
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed' as const,
  };

  // This is the main component that defines all the routes (pages) in our app
  
  return (
    <Router basename={baseUrl}>
      <div className="app-wrapper">
        <Header />
        <main className="app-main" style={appMainStyle}>
          {/* Router enables navigation between different pages */}
          <Routes>
            {/* Each Route represents a different page/URL */}
            
            {/* Default route - redirect to student login */}
            <Route path="/" element={<Navigate to="/student/login" replace />} />
            
            {/* Faculty routes */}
            <Route path="/faculty/login" element={<FacultyLogin />} />
            <Route path="/faculty/signup" element={<FacultySignup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/faculty/dashboard" 
              element={
                <ProtectedRoute requiredRole="faculty">
                  <FacultyDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Student routes - correct flow: login -> signup -> form */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/signup" element={<StudentSignup />} />
            <Route path="/student/form" element={<StudentForm />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
