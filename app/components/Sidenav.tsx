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
import { onChildAdded, onChildChanged, onChildRemoved, ref } from 'firebase/database';

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

    useEffect(() => {
        const usersRef = ref(database, "users");

        // Attach listeners
        const unsubscribeAdd = onChildAdded(usersRef, (snapshot) => {
            const user = snapshot.val();
            if (user.requiredApproval === true && !user.status) {
                setPendingCount((prevCount) => prevCount + 1);
            }
        });

        const unsubscribeChange = onChildChanged(usersRef, (snapshot) => {
            const user = snapshot.val();
            setPendingCount((prevCount) => {
                if (user.requiredApproval === false && user.status === 'active') {
                    return Math.max(0, prevCount - 1);
                }
                return prevCount;
            });
        });

        const unsubscribeRemove = onChildRemoved(usersRef, (snapshot) => {
            const user = snapshot.val();
            if (user.requiredApproval === true && !user.status) {
                setPendingCount((prevCount) => Math.max(0, prevCount - 1));
            }
        });

        // Cleanup listeners on unmount
        return () => {
            unsubscribeAdd();
            unsubscribeChange();
            unsubscribeRemove();
        };
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