// components/Sidenav.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    HiOutlineHome,
    HiOutlineChartBar,
    HiOutlineShoppingCart,
    HiOutlineLogout,
    HiMenu,
    HiOutlineUserGroup,
    HiOutlineChartPie
} from 'react-icons/hi';
import { database } from '../services/firebase';
import {onChildAdded, onChildChanged, ref} from "firebase/database";

type SidenavProps = {
    setIsSidenavOpen: (isOpen: boolean) => void;
};

const menuItems = [
    {
        name: "Home",
        icon: <HiOutlineHome className="w-8 h-8" />,
        path: '/admin/home',
    },
    {
        name: "Dashboard",
        icon: <HiOutlineChartBar className="w-8 h-8" />,
        path: '/admin/dashboard',
    },
    {
        name: "Item Request",
        icon: <HiOutlineShoppingCart className="w-8 h-8" />,
        path: '/admin/request-form',
    },
    {
        name: "Analytics",
        icon: <HiOutlineChartPie className="w-8 h-8" />,
        path: '/admin/analytics',
    },
    {
        name: "User Management",
        icon: <HiOutlineUserGroup className="w-8 h-8" />,
        path: '/admin/user-management',
        hasNotification: true // Indicating this menu item has a notification
    },
    {
        name: "Logout",
        icon: <HiOutlineLogout className="w-8 h-8" />,
        path: '/sign-in',
    }
];

const Sidenav = ({ setIsSidenavOpen }: SidenavProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0); // State for pending notifications

    useEffect(() => {
        setIsSidenavOpen(isOpen);
    }, [isOpen, setIsSidenavOpen]);

    // Fetch users and count those requiring approval
    const fetchPendingCount = () => {
        const usersRef = ref(database, "users"); // Adjust path to your users node
        let count = 0;

        // Listen for new users and count those requiring approval
        onChildAdded(usersRef, (snapshot) => {
            const user = snapshot.val();

            // Check if user requires approval
            if (user.requiredApproval && user.status !== 'active') {
                count++;
            }

            // Update the pending count whenever a user is added
            setPendingCount(count);
        });

        // Listen for changes to existing users (if needed)
        onChildChanged(usersRef, (snapshot) => {
            const user = snapshot.val();

            // Adjust count if status changes
            if (user.requiredApproval && user.status === 'active') {
                count--;
            } else if (user.requiredApproval && user.status !== 'active') {
                count++;
            }

            setPendingCount(count);
        });
    };

    useEffect(() => {
        fetchPendingCount();
    }, []);

    return (
        <div
            className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-gray-800 text-white fixed transition-width duration-300`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <div className="flex items-center justify-center h-16 shadow-md">
                <h1 className="text-2xl font-bold">{isOpen ? 'Menu' : <HiMenu />}</h1>
            </div>
            <nav className="mt-10">
                <ul>
                    {menuItems.map((item, index) => (
                        <li key={index} className="px-6 py-2 hover:bg-gray-700 flex items-center">
                            <Link href={item.path} legacyBehavior>
                                <a className="flex items-center w-full relative"> {/* Added relative class */}
                                    {item.icon}
                                    <span className={`ml-3 ${isOpen ? 'inline' : 'hidden'}`}>{item.name}</span>
                                    {/* Show notification bubble */}
                                    {item.hasNotification && pendingCount > 0 && (
                                        <span className={`absolute ${isOpen ? 'right-0 top-1.5' : '-top-1 -right-1'} bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center`}>
                                            {pendingCount}
                                        </span>
                                    )}
                                </a>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default Sidenav;
