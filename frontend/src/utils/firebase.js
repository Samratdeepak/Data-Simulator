import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDwVIJGnY6__f3QE6IOx0A1jCFMTyulT-Y",
  authDomain: "hackathon-9e36a.firebaseapp.com",
  projectId: "hackathon-9e36a",
  storageBucket: "hackathon-9e36a.firebasestorage.app",
  messagingSenderId: "31965022482",
  appId: "1:31965022482:web:9863535437c34efca58bcb",
  measurementId: "G-J28J2C9X0Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create and configure the provider here
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'  // This forces account selection every time
});

export { auth, provider, GoogleAuthProvider, signInWithPopup, signOut };