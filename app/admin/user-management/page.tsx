'use client';
import React, { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from "firebase/database";
import { database } from "../../services/firebase";
import Sidenav from "../../components/Sidenav";
import {HiTrash, HiOutlineUserAdd, HiOutlineUserRemove} from "react-icons/hi";
import { auth } from "../../services/firebase";
import { get } from "@firebase/database";
import {user} from "firebase-functions/v1/auth"; // Assuming auth is set up for Firebase Authentication

interface User {
    requiredApproval: unknown;
    archived: boolean;
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
                        requiredApproval: data?.requiredApproval || false,
                        archived: false,
                        uid: user.uid,
                        email: user.email || "",
                        isSuperAdmin: data?.isSuperAdmin || false
                    });
                });
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const usersRef = ref(database, 'users'); // Reference to the 'users' node in Firebase

        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            const userList = data
                ? Object.keys(data).map((key) => ({
                    uid: key,
                    email: data[key].email,
                    isSuperAdmin: data[key].isSuperAdmin,
                    roles: data[key].roles,
                    requiredApproval: data[key].requiredApproval || false, // Default to false if not available
                    status: data[key].status || 'active', // Default status if not available
                    archived: data[key].archived || false, // Default to false if not available
                }))
                : [];

            setAllUsers(userList);

            // Update pending users list in real time
            setPendingUsers(userList.filter((user) => user.requiredApproval));
        });

        // Clean up listener when the component unmounts
        return () => unsubscribe();
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
        const confirmArchive = window.confirm('Are you sure you want to archive this user and their related requests?');
        if (confirmArchive) {
            setDeletingUsers((prev) => [...prev, uid]); // Show a loading indicator for the user
            try {
                await update(ref(database, `users/${uid}`), {
                    archived: true, // Mark the user as archived
                });

                // Archive related requests
                const requestsRef = ref(database, 'requests');
                onValue(requestsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const updates: { [key: string]: boolean } = {};
                        Object.keys(data).forEach((key) => {
                            if (data[key].userId === uid) {
                                updates[`requests/${key}/archived`] = true;
                            }
                        });
                        update(ref(database), updates);
                    }
                });

                setAlertMessage('User and related requests archived successfully!');
                setTimeout(() => setAlertMessage(null), 5000);
            } catch (error) {
                console.error('Error archiving user and related requests:', error);
                setAlertMessage('Failed to archive user and related requests. Please try again.');
                setTimeout(() => setAlertMessage(null), 5000);
            } finally {
                setDeletingUsers((prev) => prev.filter((id) => id !== uid)); // Remove loading indicator
            }
        }
    };


    // Handle Unarchive User
    const handleEnableUser = async (uid: string) => {
        const confirmUnarchive = window.confirm('Are you sure you want to unarchive this user?');
        if (confirmUnarchive) {
            try {
                await update(ref(database, `users/${uid}`), {
                    archived: false, // Unarchive the user
                });

                setAlertMessage('User unarchived successfully!');
                setTimeout(() => setAlertMessage(null), 5000);
            } catch (error) {
                console.error('Error unarchiving user:', error);
                setAlertMessage('Failed to unarchive user. Please try again.');
                setTimeout(() => setAlertMessage(null), 5000);
            }
        }
    };

    // Function to handle toggling a user's Super Admin status
    const handleToggleSuperAdmin = async (uid: string, currentStatus: boolean) => {
        const action = currentStatus ? 'revoke' : 'grant'; // Determine action based on current status
        const confirmAction = window.confirm(`Are you sure you want to ${action} this user's Super Admin role?`);
        if (confirmAction) {
            try {
                await update(ref(database, `users/${uid}`), {
                    isSuperAdmin: !currentStatus // Toggle isSuperAdmin
                });
                setAllUsers(allUsers.map(user =>
                    user.uid === uid ? { ...user, isSuperAdmin: !currentStatus } : user
                )); // Update state
                setAlertMessage(`User's Super Admin role ${action}ed successfully!`); // Set alert message
                setTimeout(() => setAlertMessage(null), 5000); // Clear alert message after 5 seconds
            } catch (error) {
                console.error(`Error trying to ${action} Super Admin role:`, error);
                setAlertMessage(`Failed to ${action} Super Admin role. Please try again.`); // Set alert message
                setTimeout(() => setAlertMessage(null), 5000); // Clear alert message after 5 seconds
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
                            currentUsers
                                .filter((user) => !user.requiredApproval)
                                .map((user) => (
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
                                        <div className="flex items-center ml-auto">
                                            {!user.archived && (
                                                <button
                                                    onClick={() => handleToggleSuperAdmin(user.uid, user.isSuperAdmin)}
                                                    className={`text-m ${user.isSuperAdmin ? 'text-yellow-500' : 'text-blue-500'} flex items-center`}
                                                >
                                                    {user.isSuperAdmin ? (
                                                        <>
                                                            <HiOutlineUserRemove className="text-xl mr-2"/>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <HiOutlineUserAdd className="text-xl mr-2"/>
                                                        </>
                                                    )}
                                                </button>

                                            )}
                                            {user.archived ? (
                                                <button
                                                    onClick={() => handleEnableUser(user.uid)}
                                                    className="text-m text-green-500 flex items-center"
                                                >
                                                    <HiOutlineUserAdd className="text-xl mr-2 cursor-pointer" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteUser(user.uid)}
                                                    className="text-m text-red-500 flex items-center"
                                                >
                                                    <HiTrash className="text-xl mr-2 cursor-pointer" />
                                                </button>
                                            )}
                                        </div>
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
