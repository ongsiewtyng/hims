'use client'
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useRouter } from "next/navigation";
import { auth, database } from '../services/firebase';
import bcrypt from 'bcryptjs';
import { HiOutlineCheckCircle, HiCheckCircle, HiEye, HiEyeOff, HiXCircle } from "react-icons/hi";

export default function SignUp() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState('Admin');
    const [error, setError] = useState<string | null>(null);
    const [requirements, setRequirements] = useState([
        { text: 'At least 8 characters', valid: false },
        { text: 'At least one uppercase letter', valid: false },
        { text: 'At least one lowercase letter', valid: false },
        { text: 'At least one digit', valid: false }
    ]);
    const [showPassword, setShowPassword] = useState(false);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);

        const updatedRequirements = requirements.map(req => ({
            ...req,
            valid: checkRequirement(req, newPassword)
        }));

        setRequirements(updatedRequirements);
    };

    const handleRolesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRoles(e.target.value);
    };

    const checkRequirement = (requirement: { text: string, valid: boolean }, password: string) => {
        switch (requirement.text) {
            case 'At least 8 characters':
                return password.length >= 8;
            case 'At least one uppercase letter':
                return /[A-Z]/.test(password);
            case 'At least one lowercase letter':
                return /[a-z]/.test(password);
            case 'At least one digit':
                return /[0-9]/.test(password);
            default:
                return false;
        }
    };

    const toggleShowPassword = () => {
        setShowPassword(prevShowPassword => !prevShowPassword);
    };

    async function saveUserData(userId: string, email: string, password: string, roles: string){
        //Hash the password
        const hashPwd = await bcrypt.hash(password,5);
        await set(ref(database, 'users/' + userId), {
            uid: userId,
            email:email,
            password: hashPwd,
            roles: roles
        });
    }

    const handleSignUp = async (e : React.SyntheticEvent) => {
        e.preventDefault();

        //Validate email
        if(!email.endsWith('@newinti.edu.my')){
            setError("Email must ends newinti.edu.my domain.");
            setTimeout(() => {
                setError(null); // Hide the error message after 3 seconds
            }, 3000);
            return;
        }

        //Validate password
        if(!requirements.every(req => req.valid)){
            setError("Password does not meet the requirements.");
            setTimeout(() => {
                setError(null); // Hide the error message after 3 seconds
            }, 3000);
            return;
        }

        createUserWithEmailAndPassword(auth,email, password)
        .then(async (userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log("User:", user);

            router.push('dashboard')

            //Save data
            return await saveUserData(user.uid, email, password, roles);


        })
            .catch((error) => {
                console.error('Signed up error:', error);
                setError(error.message);

            }
        );

    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">HIMS Sign Up</h2>
                </div>
                <form className="mt-8 space-y-7" onSubmit={handleSignUp}>
                    <div className="rounded-md -space-y-px">
                        <div>
                            <label htmlFor="roles" className="text-sm font-medium text-gray-700">Roles</label>
                            <select
                                id="roles"
                                name="roles"
                                value={roles}
                                required
                                onChange={handleRolesChange}
                                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mb-4"
                            >
                                <option value="Admin">Admin</option>
                                <option value="Lecturer">Lecturer</option>
                            </select>

                        </div>
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
                                placeholder="johndoe@newinti.edu.my"
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
                                    onChange={handlePasswordChange}
                                />
                                <i onClick={toggleShowPassword}
                                   className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer z-10">
                                    {showPassword ? <HiEyeOff className="h-5 w-5 text-gray-400"/> :
                                        <HiEye className="h-5 w-5 text-gray-400"/>}
                                </i>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm text-gray-700 flex items-center">
                                    Password requirements:
                                </p>
                                <ul className="mt-2 text-sm text-gray-700">
                                    {requirements.map((req, index) => (
                                        <li key={index}
                                            className={`flex items-center ${req.valid ? 'valid' : 'invalid'}`}>
                                            {req.valid ? <HiCheckCircle className="text-green-500 mr-1"/> :
                                                <HiOutlineCheckCircle className="text-black-300 mr-1"/>}
                                            <span>{req.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Sign Up
                        </button>
                    </div>
                    {error && (
                        <div
                            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                            <span>{error}</span>
                        </div>
                    )}


                    <p className="mt-2 text-center text-sm text-gray-600">
                        <a href="/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Have an account?
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
