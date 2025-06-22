import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from './components/Signup';
import Login from './components/Login';
import MainPage from './components/MainPage';
import LandingPage from "./components/LandingPage";
import TrackingPage from './components/TrackingPage'; // ← Add this if not already
import BulkAddPage from "./components/BulkAddPage";
// import TrackPricesPage from "./components/TrackPricesPage";

function App() {
  const [userId, setUserId] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  // 1. Add loading state here
  const [loading, setLoading] = useState(true);

  // 2. Update useEffect to set loading false after checking localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      setLoggedIn(true);
    }
    setLoading(false);  // IMPORTANT: set loading false here
  }, []);

  // 3. Add this before returning your JSX
  if (loading) {
    return <div>Loading...</div>;  // or a spinner component
  }

  // 4. Your existing handlers and JSX below
  const handleLogin = (user_id) => {
    setUserId(user_id);
    setLoggedIn(true);
    localStorage.setItem('user_id', user_id);
  };

  const handleSignup = (user_id) => {
    setUserId(user_id);
    setLoggedIn(true);
    localStorage.setItem('user_id', user_id);
  };

  const handleLogout = () => {
    setUserId('');
    setLoggedIn(false);
    localStorage.removeItem('user_id');
  };

  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0',
        margin: '0'
      }}>
        <Routes>
          <Route path="/" element={loggedIn ? <LandingPage onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
          <Route 
            path="/scraper" 
            element={loggedIn ? <MainPage userId={userId} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
          <Route
  path="/tracking"
  element={loggedIn ? <TrackingPage userId={userId} /> : <Navigate to="/login" />}
/>
<Route
  path="/bulk-add"
  element={loggedIn ? <BulkAddPage /> : <Navigate to="/login" />}
/>

        </Routes>
      </div>
    </Router>
  );
}
export default App;