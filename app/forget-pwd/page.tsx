'use client'
import React, { useState } from 'react';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../services/firebase';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleResetPassword = async () => {
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Password reset email sent. Check your inbox.');
            setError('');
        } catch (error) {
            const err = error as Error;
            console.error('Password reset error:', err.message);
            setMessage('');
            setError('Failed to send password reset email. Please try again.');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Forgot Password</h2>
                </div>
                <form className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="appearance-none block w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Reset Password
                        </button>
                    </div>
                    {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                    <p className="mt-2 text-center text-sm text-gray-600">
                        <a href="/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">Got an account?</a>
                    </p>
                </form>
            </div>
        </div>
    );
}
