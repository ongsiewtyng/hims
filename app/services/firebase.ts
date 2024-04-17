// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "@firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdce8Ns72pVkt0R2Q54jq6Jk7GgflXFeI",
    authDomain: "hims-8187e.firebaseapp.com",
    projectId: "hims-8187e",
    storageBucket: "hims-8187e.appspot.com",
    messagingSenderId: "542623781907",
    appId: "1:542623781907:web:b6bc2e5b3ea5edd58d1be6",
    databaseURL: "https://hims-8187e-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);