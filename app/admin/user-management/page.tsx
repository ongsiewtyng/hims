'use client';
import React, { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from "firebase/database";
import { database } from "../../services/firebase";
import Sidenav from "../../components/Sidenav";
import { HiTrash } from "react-icons/hi";
import { auth } from "../../services/firebase"; // Assuming auth is set up for Firebase Authentication

interface User {
    uid: string;
    email: string;
    isSuperAdmin: boolean;
}

const UserManagement = () => {
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [deletingUsers, setDeletingUsers] = useState<string[]>([]);
    const [deleteUserModal, setDeleteUserModal] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null); // Alert message state
    const [currentUser, setCurrentUser] = useState<User | null>(null); // Store current auth user

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;

    useEffect(() => {
        // Fetch authenticated user's data
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                const userRef = ref(database, `users/${user.uid}`);
                onValue(userRef, (snapshot) => {
                    const data = snapshot.val();
                    setCurrentUser({
                        uid: user.uid,
                        email: user.email || "",
                        isSuperAdmin: data?.isSuperAdmin || false,
                    });
                });
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const usersRef = ref(database, 'users'); // Reference to 'users' node in Firebase
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();

            const userList = data ? Object.keys(data).map((key) => ({
                uid: key,
                email: data[key].email,
                isSuperAdmin: data[key].isSuperAdmin,
                roles: data[key].roles,
                requiredApproval: data[key].requiredApproval || false, // Default to false if not available
                status: data[key].status || 'active', // Default status if not available
            })) : [];

            setAllUsers(userList);

            // Modify setPendingUsers to filter by requiredApproval instead of status
            setPendingUsers(userList.filter(user => user.requiredApproval)); // Users that need approval
        });
    }, []);

    // Handle Approve User
    const handleApproveUser = async (uid: string) => {
        try {
            await update(ref(database, `users/${uid}`), {
                requiredApproval: false, // Approve user by setting requiredApproval to false
                status: 'active' // Update status to 'active'
            });
            setPendingUsers(pendingUsers.filter(user => user.uid !== uid));
        } catch (error) {
            console.error('Error approving user:', error);
        }
    };

    // Handle Reject User
    const handleRejectUser = async (uid: string) => {
        try {
            await update(ref(database, `users/${uid}`), {
                status: 'rejected' // Update status to 'rejected'
            });
            setPendingUsers(pendingUsers.filter(user => user.uid !== uid));
        } catch (error) {
            console.error('Error rejecting user:', error);
        }
    };

    // Handle Delete User
    const handleDeleteUser = async (uid: string) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this user?');
        if (confirmDelete) {
            setDeletingUsers([...deletingUsers, uid]); // Add user to deletingUsers state
            try {
                await remove(ref(database, `users/${uid}`)); // Delete user from Firebase
                setAllUsers(allUsers.filter(user => user.uid !== uid)); // Remove user from allUsers state
                setDeletingUsers(deletingUsers.filter(user => user !== uid)); // Remove user from deletingUsers state
                setAlertMessage('User deleted successfully!'); // Set alert message
            } catch (error) {
                console.error('Error deleting user:', error);
                setDeletingUsers(deletingUsers.filter(user => user !== uid)); // Remove user from deletingUsers state
                setAlertMessage('Failed to delete user. Please try again.'); // Set alert message
            }
        }
    };

    // Calculate paginated users
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = allUsers.slice(indexOfFirstUser, indexOfLastUser);

    // Handle page change
    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen} />
            <div className={`flex-1 bg-gray-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                {/* Title and Delete Button Container */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-800">User Management</h1>
                    <button className="text-m text-red-500 flex items-center" onClick={() => setDeleteUserModal(true)}>
                        <HiTrash className="mr-2" />
                        Delete Users
                    </button>
                </div>

                {/* Alert Message */}
                {alertMessage && (
                    <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
                        {alertMessage}
                    </div>
                )}

                {/* User List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* All Users Section */}
                    <div className="bg-white shadow-lg rounded-lg p-6">
                        <h2 className="text-2xl font-medium text-gray-700 mb-4">All Users</h2>
                        {currentUsers.length > 0 ? (
                            currentUsers.map((user) => (
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

                                    {/* Delete Button */}
                                    {currentUser?.isSuperAdmin && (
                                        <button
                                            onClick={() => handleDeleteUser(user.uid)}
                                            className="text-m text-red-500 flex items-center ml-auto "
                                        >
                                            <HiTrash className="text-xl mr-2 cursor-pointer" />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No users found.</p>
                        )}

                        {/* Pagination */}
                        <div className="flex justify-center mt-4">
                            {Array.from({ length: Math.ceil(allUsers.length / usersPerPage) }, (_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => handlePageChange(i + 1)}
                                    className={`px-4 py-2 mx-1 ${currentPage === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} rounded`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
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
                                    </div>

                                    {/* Approve and Reject Buttons */}
                                    <button
                                        onClick={() => handleApproveUser(user.uid)}
                                        className="text-sm text-green-600 hover:text-green-700 ml-auto mr-4"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectUser(user.uid)}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Reject
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No users pending approval.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
