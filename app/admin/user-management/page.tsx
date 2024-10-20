'use client'
import React, {useEffect, useState} from 'react';
import { ref, onValue, get} from "firebase/database";
import { database, secondaryAuth } from "../../services/firebase";
import Sidenav from "../../components/Sidenav";
import { deleteUser, signInWithEmailAndPassword } from "firebase/auth";
import {HiTrash} from "react-icons/hi";

interface User {
    uid: string;
    email: string;
}

const UserManagement = () => {
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [deletingUsers, setDeletingUsers] = useState<string[]>([]);
    const [deleteUserModal, setDeleteUserModal] = useState(false);

    useEffect(() => {
        const usersRef = ref(database, 'users'); // Reference to 'users' node in Firebase
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            const userList = data ? Object.keys(data).map((key) => ({
                uid: key,
                email: data[key].email,
                status: data[key].status || 'active', // Default status if not available
            })) : [];

            setAllUsers(userList);
            setPendingUsers(userList.filter(user => user.status === 'pending')); // Filter users with 'pending' status
        });
    }, []);

    // const handleDeleteUser = async (uid: string) => {
    //     setDeletingUsers([...deletingUsers, uid]);
    //     try {
    //         await deleteUser(secondaryAuth, uid);
    //         setAllUsers(allUsers.filter(user => user.uid !== uid));
    //         setPendingUsers(pendingUsers.filter(user => user.uid !== uid));
    //     } catch (error) {
    //         console.error('Error deleting user:', error);
    //     } finally {
    //         setDeletingUsers(deletingUsers.filter(id => id !== uid));
    //     }
    // };


    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen}/>
            <div className={`flex-1 bg-gray-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>

                {/* Title and Delete Button Container */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-800">User Management</h1>
                    <button className="text-m text-red-500 flex items-center" onClick={() => setDeleteUserModal(true)}>
                        <HiTrash className="mr-2"/>
                        Delete Users
                    </button>
                </div>

                {/* User List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* All Users Section */}
                    <div className="bg-white shadow-lg rounded-lg p-6">
                        <h2 className="text-2xl font-medium text-gray-700 mb-4">All Users</h2>
                        {allUsers.length > 0 ? (
                            allUsers.map((user) => (
                                <div key={user.uid}
                                     className="flex items-center bg-gray-50 hover:bg-gray-100 p-4 rounded-lg mb-4">
                                    {/* User Icon */}
                                    <div
                                        className="w-12 h-12 flex items-center justify-center bg-blue-500 text-white rounded-full text-xl font-bold">
                                        {user.email.charAt(0).toUpperCase()}
                                    </div>

                                    {/* User Info */}
                                    <div className="ml-4">
                                        <p className="text-lg font-medium text-gray-700">{user.email}</p>
                                        <p className="text-sm text-gray-500">UID: {user.uid}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No users found.</p>
                        )}
                    </div>

                    {/* Approval Needed Section */}
                    <div className="bg-white shadow-lg rounded-lg p-6">
                        <h2 className="text-2xl font-medium text-gray-700 mb-4">Approval Needed</h2>
                        {pendingUsers.length > 0 ? (
                            pendingUsers.map((user) => (
                                <div key={user.uid}
                                     className="flex items-center bg-gray-50 hover:bg-gray-100 p-4 rounded-lg mb-4">
                                    {/* User Icon */}
                                    <div
                                        className="w-12 h-12 flex items-center justify-center bg-yellow-500 text-white rounded-full text-xl font-bold">
                                        {user.email.charAt(0).toUpperCase()}
                                    </div>

                                    {/* User Info */}
                                    <div className="ml-4">
                                        <p className="text-lg font-medium text-gray-700">{user.email}</p>
                                        <p className="text-sm text-gray-500">UID: {user.uid}</p>
                                        <p className="text-sm text-red-500">Status: Pending Approval</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No users need approval.</p>
                        )}
                    </div>
                </div>

                {/*{deleteUserModal && (*/}
                {/*    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">*/}
                {/*        <div className="bg-white p-6 rounded-lg w-96">*/}
                {/*            <h2 className="text-xl font-semibold text-gray-800 mb-4">Delete User</h2>*/}
                {/*            <p className="text-gray-600 mb-6">Are you sure you want to all users?</p>*/}
                {/*            <div className="flex justify-end gap-4">*/}
                {/*                <button*/}
                {/*                    className="text-sm text-red-500"*/}
                {/*                    onClick={() => setDeleteUserModal(false)}*/}
                {/*                >*/}
                {/*                    Cancel*/}
                {/*                </button>*/}
                {/*                <button*/}
                {/*                    className="text-sm text-white bg-red-500 px-4 py-2 rounded-md"*/}
                {/*                    onClick={() => handleDeleteUser('USER_ID')}*/}
                {/*                >*/}
                {/*                    Delete*/}
                {/*                </button>*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*)}*/}

            </div>
        </div>
    );
};

export default UserManagement;

