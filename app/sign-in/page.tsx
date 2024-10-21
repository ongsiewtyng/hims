'use client'
import React, {useEffect, useState} from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { auth,getUserRole } from '../services/firebase';
import {HiEye, HiEyeOff, HiXCircle} from "react-icons/hi";
import { setCookie, getCookie } from 'cookies-next';

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const interval = setInterval(refreshToken, 5 * 60 * 1000); // Check every 5 minutes
        return () => clearInterval(interval);
    }, []);

    const refreshToken = async () => {
        const tokenExpiration = getCookie('tokenExpiration');
        if (tokenExpiration && new Date().getTime() > Number(tokenExpiration) - 5 * 60 * 1000) { // 5 minutes before expiration
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken(true); // Force refresh
                const expirationTime = new Date().getTime() + 3600 * 1000; // 1 hour from now
                setCookie('token', token, { maxAge: 60 * 60 * 24 }); // Store for 1 day
                setCookie('tokenExpiration', expirationTime, { maxAge: 60 * 60 * 24 }); // Store for 1 day
            }
        }
    }

    const handleSignIn = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user) {
                // Get the user's ID token and store it in a cookie
                const token = await user.getIdToken();
                const expirationTime = new Date().getTime() + 3600 * 1000; // 1 hour from now
                setCookie('token', token, { maxAge: 60 * 60 * 24 }); // Store for 1 day
                setCookie('tokenExpiration', expirationTime, { maxAge: 60 * 60 * 24 }); // Store for 1 day

                // Fetch the user's role
                const role = await getUserRole(user.uid);
                console.log('Fetched Role:', role);

                // Redirect based on role
                if (role === 'Super Admin' || 'Admin') {
                    router.push('/admin/home');
                } else if (role === 'Lecturer') {
                    router.push('/lecturer/request-form');
                } else {
                    router.push('/sign-in');
                }
            }
        } catch (error) {
            console.error('Sign in error:', error);
            setError('Email or password is incorrect. Please try again.');
            setTimeout(() => setError(null), 5000);
        }
    }

    const toggleShowPassword = () => {
        setShowPassword(prevShowPassword => !prevShowPassword);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">HIMS Login</h2>
                </div>
                <form className="mt-8 space-y-7" onSubmit={handleSignIn}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="text-sm font-medium text-gray-700">Email
                                address</label>
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
                                    {showPassword ? <HiEyeOff className="h-5 w-5 text-gray-400"/> :
                                        <HiEye className="h-5 w-5 text-gray-400"/>}
                                </i>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Login
                        </button>
                    </div>
                    {error && (
                        <div
                            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                            <span>{error}</span>
                        </div>
                    )}

                    <p className="mt-4 text-center text-sm text-gray-600">
                        <a href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500">Create
                        an account?</a>
                    </p>

                    <p className="mt-2 text-center text-sm text-gray-600">
                        <a href="/forget-pwd" className="font-medium text-indigo-600 hover:text-indigo-500">Forgot
                        password?</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
