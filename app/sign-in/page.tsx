'use client';
import React, { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, signOut } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { auth } from '../services/firebase';
import { HiCheckCircle, HiEye, HiEyeOff, HiXCircle } from "react-icons/hi";
import { setCookie, getCookie, deleteCookie } from 'cookies-next';
import { getDatabase, ref, get } from 'firebase/database';
import '../components/loader.css';
import Image from 'next/image';

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    // Setup token refresh & logout
    useEffect(() => {
        const checkSession = async () => {
            const expiration = getCookie('tokenExpiration');
            const now = new Date().getTime();

            if (!expiration || now > Number(expiration)) {
                await forceLogout();
                return;
            }

            // If less than 10 minutes before expiry, refresh
            if (Number(expiration) - now < 10 * 60 * 1000) {
                await refreshToken();
            }
        };

        const interval = setInterval(checkSession, 5 * 60 * 1000); // Every 5 minutes
        return () => clearInterval(interval);
    }, []);

    const forceLogout = async () => {
        await signOut(auth);
        deleteCookie('token');
        deleteCookie('tokenExpiration');
        router.push('/sign-in');
    };

    const refreshToken = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const token = await user.getIdToken(true); // Force refresh
                const expirationTime = new Date().getTime() + 3600 * 1000; // 1 hour from now
                setCookie('token', token, { maxAge: 60 * 60 * 24 });
                setCookie('tokenExpiration', expirationTime, { maxAge: 60 * 60 * 24 });
            } catch (err) {
                console.error("Token refresh failed. Logging out.");
                await forceLogout();
            }
        }
    };

    const getUserDocument = async (uid: string) => {
        const db = getDatabase();
        const userRef = ref(db, `users/${uid}`);
        const snapshot = await get(userRef);
        return snapshot.exists() ? snapshot.val() : null;
    };

    const handleSignIn = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await setPersistence(auth, browserLocalPersistence); // Keep session persistent
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user) {
                const token = await user.getIdToken();
                const expirationTime = new Date().getTime() + 3600 * 1000; // 1 hour

                // Store token for 1 day
                setCookie('token', token, { maxAge: 60 * 60 * 24 });
                setCookie('tokenExpiration', expirationTime, { maxAge: 60 * 60 * 24 });

                const userInfo = await getUserDocument(user.uid);
                if (userInfo) {
                    if (userInfo.requiredApproval) {
                        setError('Your account requires approval to log in.');
                        setLoading(false);
                        return;
                    }

                    setSuccess('Login successful! Redirecting...');
                    if (userInfo.roles === 'Admin') {
                        router.push('/admin/home');
                    } else if (userInfo.roles === 'Lecturer') {
                        router.push('/lecturer/request-form');
                    } else {
                        router.push('/sign-in');
                    }
                } else {
                    setError('User data could not be retrieved.');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Email or password is incorrect.');
        } finally {
            setLoading(false);
        }
    };

    const toggleShowPassword = () => setShowPassword(!showPassword);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="loader"></div>
                </div>
            )}
            <div className="max-w-md w-full space-y-8">
                <div className="flex justify-center">
                    <Image src="/logo2.png" alt="Logo" width={150} height={150} />
                </div>
                <h2 className="text-center text-3xl font-extrabold text-gray-900">Login</h2>
                <form className="mt-8 space-y-7" onSubmit={handleSignIn}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-700">Email address</label>
                            <input
                                type="email"
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-700">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <i onClick={toggleShowPassword} className="absolute right-3 top-2.5 cursor-pointer">
                                    {showPassword ? <HiEyeOff /> : <HiEye />}
                                </i>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                    >
                        Login
                    </button>

                    {error && (
                        <div className="mt-2 text-sm text-red-600 flex items-center">
                            <HiXCircle className="mr-1 text-red-500" /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="mt-2 text-sm text-green-600 flex items-center">
                            <HiCheckCircle className="mr-1 text-green-500" /> {success}
                        </div>
                    )}

                    <div className="text-center text-sm mt-4">
                        <a href="/sign-up" className="text-indigo-600 hover:text-indigo-500">Create an account?</a>
                        <br />
                        <a href="/forget-pwd" className="text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                    </div>
                </form>
            </div>
        </div>
    );
}
