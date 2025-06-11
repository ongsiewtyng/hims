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
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Login</h2>
                </div>
                <form className="mt-8 space-y-7" onSubmit={handleSignIn}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="text-sm font-medium text-gray-700">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mb-4"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="mt-4">
                            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <i onClick={toggleShowPassword}
                                   className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer z-10">
                                    {showPassword ? <HiEyeOff className="h-5 w-5 text-gray-400"/> : <HiEye className="h-5 w-5 text-gray-400"/>}
                                </i>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Login
                        </button>
                    </div>
                    {error && (
                        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                            <span>{success}</span>
                        </div>
                    )}

                    <p className="mt-4 text-center text-sm text-gray-600">
                        <a href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500">Create an account?</a>
                    </p>

                    <p className="mt-2 text-center text-sm text-gray-600">
                        <a href="/forget-pwd" className="font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                    </p>
                </form>
            </div>
        </div>
    );
}