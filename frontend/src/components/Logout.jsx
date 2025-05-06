import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { signOut } from 'firebase/auth';

const Logout = ({ setIsAuthenticated, setUser }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Sign out from Firebase
        await signOut(auth);
        
        // Clear local state and storage
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('user');
        
        // Show logout message for 2 seconds before redirecting
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (error) {
        console.error('Logout error:', error);
        navigate('/');
      }
    };

    performLogout();
  }, [navigate, setIsAuthenticated, setUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md mx-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Logging Out</h2>
        <p className="text-gray-600">You're being securely logged out...</p>
      </div>
    </div>
  );
};

export default Logout;