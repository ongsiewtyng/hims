import React from 'react';
import { signOut } from "firebase/auth";
import { auth } from '../services/firebase';

const Header = () => {
    return (
        <header className="800 p-4 flex justify-between items-center">
            <h1 className="text-white text-2xl font-bold">HIMS</h1>
            <button
                className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={handleLogout}>Logout
            </button>
        </header>
    );
}

const handleLogout = () => {
    signOut(auth).then(() => {
        // Sign-out successful.
        console.log("Logged out");

        // Redirect to login page
        return window.location.href = '/sign-in';
    }).catch((error) => {
        // An error happened.
        console.error("Logout error", error);
    });
};

export default Header;
