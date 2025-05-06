import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate('/file-browser');
  };

  const handleLogout = () => {
    navigate('/logout');
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span className="ml-2 text-lg font-semibold text-gray-100 hidden sm:inline">Data Simulator</span>
            </div>
          </div>
          
          {/* Right side - Navigation/Actions */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden sm:flex items-center text-sm text-gray-300">
                <span className="mr-2">Logged in as: {user.displayName}</span>
              </div>
            )}
            
            {/* Show back button only when on Dashboard */}
            {location.pathname === '/dashboard' && (
              <button
                onClick={handleBack}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-sm text-gray-100 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors duration-200"
              >
                <svg className="-ml-0.5 mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Files
              </button>
            )}
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-sm text-gray-100 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors duration-200"
            >
              <svg className="-ml-0.5 mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;