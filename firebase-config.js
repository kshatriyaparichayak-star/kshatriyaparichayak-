import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0eEvmS3TYtFDfTjSI5mL9cfUmO3gt23I",
    authDomain: "kshatriya-parichay.firebaseapp.com",
    projectId: "kshatriya-parichay",
    storageBucket: "kshatriya-parichay.firebasestorage.app",
    messagingSenderId: "952092943473",
    appId: "1:952092943473:web:38d14a98f28df05922a7d0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
