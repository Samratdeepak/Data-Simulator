import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './utils/firebase';
import Login from './components/Login';
import FileBrowser from './components/FileBrowser';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';
import Logout from './components/Logout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('user');
      }
    });

    // Check for user in localStorage on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
        <Route 
          path="/file-browser" 
          element={
            isAuthenticated ? (
              <FileBrowser user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <div className="min-h-screen bg-gray-50">
                <Navbar user={user} />
                <Dashboard />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route 
  path="/logout" 
  element={
    <Logout setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
  } 
/>
      </Routes>
    </Router>
  );
}

export default App;