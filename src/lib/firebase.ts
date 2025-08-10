
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyDtSB855fSpikoqatfFrXJ4T7w5osPngwk",
  authDomain: "centralize-524ea.firebaseapp.com",
  databaseURL: "https://centralize-524ea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "centralize-524ea",
  storageBucket: "centralize-524ea.firebasestorage.app",
  messagingSenderId: "1029942918862",
  appId: "1:1029942918862:web:304151d28773215e72da9f",
  measurementId: "G-7PL73HVGV6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);

export { database };
