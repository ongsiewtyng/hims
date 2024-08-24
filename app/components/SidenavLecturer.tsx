// components/Sidenav.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {HiOutlineHome, HiOutlineChartBar, HiOutlineShoppingCart, HiOutlineLogout, HiMenu} from 'react-icons/hi';

type SidenavProps = {
    setIsSidenavOpen: (isOpen: boolean) => void;
};

const menuItems = [
    {
        name: "Item Request",
        icon: <HiOutlineShoppingCart className="w-8 h-8" />,
        path: '/lecturer/request-form',
    },
    {
        name: "Track Request",
        icon: <HiOutlineChartBar className="w-8 h-8"/>,
        path: '/lecturer/track-progress',
    },
    {
        name: "Logout",
        icon: <HiOutlineLogout className="w-8 h-8" />,
        path: '/sign-in',
    }
];

const Sidenav = ({ setIsSidenavOpen }: SidenavProps) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsSidenavOpen(isOpen);
    }, [isOpen, setIsSidenavOpen]);

    return (
        <div
            className={`h-screen ${isOpen ? 'w-64' : 'w-20'} bg-gray-800 text-white fixed transition-width duration-300`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <div className="flex items-center justify-center h-16 shadow-md">
                <h1 className="text-2xl font-bold">{isOpen ? 'Menu' : <HiMenu/> }</h1>
            </div>
            <nav className="mt-10">
                <ul>
                    {menuItems.map((item, index) => (
                        <li key={index} className="px-6 py-2 hover:bg-gray-700 flex items-center">
                            <Link href={item.path} legacyBehavior>
                                <a className="flex items-center w-full">
                                    {item.icon}
                                    <span className={`ml-3 ${isOpen ? 'inline' : 'hidden'}`}>{item.name}</span>
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
