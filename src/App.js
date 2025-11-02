import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/SignUp';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import BookingDetails from './pages/BookingDetails';
import Activity from './pages/Activity';
import Bookings from './pages/Bookings';
import Plans from './pages/Plans';
import DashboardTeam from './pages/Team';
import MyProfile from './pages/Profile';




const Support = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Support Page</h1>
    <p className="text-gray-600">Coming Soon</p>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = () => {
    const user = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('access_token');
    return user && token;
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const isAuthenticated = () => {
    const user = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('access_token');
    return user && token;
  };

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

  
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Protected Routes - Wrapped in Dashboard Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect root to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Dashboard Routes */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/booking/:id" element={<BookingDetails />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="dashboard/individual" element={<Dashboard view="individual" />} />
          <Route path="dashboard/team" element={<DashboardTeam />} />
          
          {/* Other Routes */}
          <Route path="activity" element={<Activity />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="plans" element={<Plans />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="support" element={<Support />} />
        </Route>

        {/* Catch all - redirect to dashboard if authenticated, login if not */}
        <Route
          path="*"
          element={
            <Navigate to="/dashboard" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;