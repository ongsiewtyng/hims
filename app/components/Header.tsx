import React, {useCallback, useEffect, useMemo} from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from "firebase/auth";
import { auth } from '../services/firebase';
import { HiOutlineHome, HiOutlineChartBar, HiOutlineShoppingCart, HiOutlineLogout } from 'react-icons/hi';

const handleLogout = () => {
    signOut(auth).then(() => {
        // Sign-out successful.
        console.log("Logged out");

        // Redirect to login page
        return window.location.href = '/sign-in';
    }).catch((error) => {
        // An error happened.
        console.error("Logout error", error);
    });
};

const Header = () => {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const router = useRouter();

    const handleItemClick = useCallback(async (index: number, path: string) => {
        setActiveIndex(index);
        router.push(path);
    }, [router]);

    const navItems = useMemo(() => [
        { name: 'Home', path: '/', icon: <HiOutlineHome className="w-8 h-8" />, onClick: () => handleItemClick(0, '/') },
        { name: 'Dashboard', path: '/dashboard', icon: <HiOutlineChartBar className="w-8 h-8" />, onClick: () => handleItemClick(1, '/dashboard') },
        { name: 'Item Request', path: '/request-form', icon: <HiOutlineShoppingCart className="w-8 h-8" />, onClick: () => handleItemClick(2, '/request-form') },
        { name: 'Logout', path: '/sign-in', icon: <HiOutlineLogout className="w-8 h-8" />, onClick: () => { handleItemClick(3, '/sign-in'); handleLogout(); } },
    ], [handleItemClick]);

    useEffect(() => {
        const path = window.location.pathname;
        const index = navItems.findIndex(item => item.path === path);
        setActiveIndex(index);
    }, [navItems]);

    return (
        <nav className="w-full p-4 bg-white shadow-md border border-gray-200">
            <div className="container mx-auto flex justify-between items-center">
                <div className="text-black text-2xl font-bold text-primary">HIMS</div>
                <ul className="flex list-none gap-8">
                    {navItems.map((item, index) => (
                        <li
                            key={item.name}
                            className={`group relative flex items-center text-center cursor-pointer transition-colors duration-200 ease-in-out ${
                                activeIndex === index ? 'text-black' : 'text-gray-600'
                            }`}
                            onClick={item.onClick}
                        >
                            <a className="flex flex-col items-center gap-2">
                                {item.icon}
                                <span
                                    className={`absolute top-10 text-xs transition-opacity duration-200 ease-in-out opacity-0 group-hover:opacity-100 group-hover:text-center group-hover:font-semibold ${activeIndex === index ? 'text-black' : 'text-gray-400'} group-hover:bg-white group-hover:border group-hover:border-gray-400 group-hover:rounded-md group-hover:py-1 group-hover:px-2 flex justify-center items-center`}>
                                    {item.name}
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default Header;
