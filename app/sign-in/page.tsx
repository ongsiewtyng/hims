'use client'
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { auth } from '../services/firebase';
import {HiEye, HiEyeOff} from "react-icons/hi";

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSignIn = async (e : React.SyntheticEvent) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth,email, password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log("User:", user);
            router.push('/dashboard');
        })
            .catch((error) => {
                console.error('Signed up error:', error);
                setError(error.message);
            }
        );
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
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

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
