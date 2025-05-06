import React from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, signInWithPopup } from "../utils/firebase";

const Login = ({ setIsAuthenticated, setUser }) => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // Use the pre-configured provider from firebase.js
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(result.user));
      navigate('/file-browser');
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Section - Contents positioned at the very top */}
      <div className="h-[40vh] w-full bg-gradient-to-r from-indigo-900 to-purple-900 flex justify-center pt-8">
        <div className="text-center px-6 max-w-2xl">
          <h2 className="text-2xl font-semibold text-white mb-4">Welcome To Data Simulator</h2>
          <p className="text-indigo-200 text-lg">
            A Configuration-Driven Synthetic Data Generator for Testing and Compliance
          </p>
        </div>
      </div>

      {/* Bottom Section - Card perfectly centered on screen */}
      <div className="flex-1 w-full flex items-center justify-center -mt-24 pb-10">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden mx-6">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 text-center">Sign in</h2>
            <p className="text-gray-600 text-center text-sm mt-1">
              Enter your credentials to continue
            </p>
          </div>

          <div className="p-6">
            <button
              onClick={handleLogin}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-200 flex items-center justify-center"
            >
              <img 
                src="https://icon2.cleanpng.com/20240216/ikb/transparent-google-logo-google-logo-with-multicolored-g-and-1710875587855.webp" 
                alt="Google logo" 
                className="h-4 w-4 mr-2"
              />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;