import React from 'react';
import { signOut } from "firebase/auth";
import { auth, database } from '../services/firebase';
import { ref, set } from "firebase/database";
import Image from "next/image";

const Header = () => {
    const handleLogout = () => {
        signOut(auth).then(() => {
            window.location.href = '/sign-in';
        }).catch((error) => {
            console.error("Logout error", error);
        });
    };

    const handleResetDatabase = async () => {
        if (!window.confirm("⚠ Are you sure you want to delete ALL food items and requests? This cannot be undone.")) return;
        try {
            await set(ref(database, 'foodItems'), {});
            await set(ref(database, 'requests'), {});
            alert("✅ Database reset successfully!");
        } catch (error) {
            console.error("Error resetting database:", error);
            alert("❌ Failed to reset database.");
        }
    };

    return (
        <header className="w-full px-6 py-4 flex justify-between items-center">
            {/* Left: Full logo and title */}
            <div className="flex items-center space-x-4">
                <div className="w-16 h-auto">
                    <Image
                        src="/logo2.png"
                        alt="HIMS Logo"
                        width={100}
                        height={100}
                        layout="responsive"
                        objectFit="contain"
                        priority
                    />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-wide">HIMS Dashboard</h1>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center space-x-3">
                <button
                    onClick={handleResetDatabase}
                    className="flex items-center bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium px-5 py-2 rounded-full shadow-sm transition duration-150"
                >
                    <span className="mr-2">🧹</span> Reset Database
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2 rounded-full shadow-sm transition duration-150"
                >
                    <span className="mr-2">🔓</span> Logout
                </button>
            </div>
        </header>
    );
};

export default Header;
