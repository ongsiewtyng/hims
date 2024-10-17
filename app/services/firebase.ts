// app/services/firebaseClient.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

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

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Function to get user role from database
export const getUserRole = async (userId: string): Promise<string> => {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        console.log("Fetched role:", snapshot.val().roles);
        return snapshot.val().roles;
    } else {
        throw new Error("User not found");
    }
};
