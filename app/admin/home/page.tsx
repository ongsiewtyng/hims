'use client';
import { Chart } from 'primereact/chart';
import React, {useEffect, useState} from 'react';
import Header from "../../components/Header";
import Sidenav from "../../components/Sidenav";
import {
    HiOutlineArchive,
    HiOutlineDocumentDownload,
    HiOutlineInbox,
    HiOutlinePencilAlt,
    HiOutlinePlus,
    HiOutlineShoppingCart,
    HiOutlineViewGrid,
    HiOutlineDocumentText, HiOutlineArrowRight, HiOutlineArrowLeft, HiChevronRight, HiChevronLeft
} from "react-icons/hi";
import { getDatabase, ref, get, set } from "@firebase/database";
import {onValue} from "firebase/database";
import {database} from "../../services/firebase";

type Activity = {
    action: string;
    item: string;
    date: string;
};

// Define the Request interface
interface Request {
    requester: string;
    dateCreated: string;
    status: string;
    // Add other properties if needed
}

interface StockItem {
    label: string;
    value: number;
    vendor: string;
}


export default function Home() {
    const [vendorCount, setVendorCount] = React.useState(0);
    const [categoryCount, setCategoryCount] = React.useState(0);
    const [totalItems, setTotalItems] = React.useState(0);
    const [stockData, setStockData] = React.useState<StockItem[]>([]);
    const [filteredStockData, setFilteredStockData] = React.useState<StockItem[]>([]);
    const [vendors, setVendors] = React.useState<string[]>([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [requests, setRequests] = useState<Request[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const activitiesPerPage = 5;

    useEffect(() => {
        async function fetchVendorCount() {
            const db = getDatabase();
            const vendorRef = ref(db, 'vendors');
            const snapshot = await get(vendorRef);
            if (snapshot.exists()) {
                const vendors = snapshot.val();
                setVendorCount(Object.keys(vendors).length);
            } else {
                setVendorCount(0);
            }
        }
        fetchVendorCount();
    }, []);

    useEffect(() => {
        async function fetchCategoryCount() {
            const db = getDatabase();
            const categoryRef = ref(db, 'categories');
            const snapshot = await get(categoryRef);
            if (snapshot.exists()) {
                const categories = snapshot.val();
                setCategoryCount(Object.keys(categories).length);
            } else {
                setCategoryCount(0);
            }
        }
        fetchCategoryCount();
    }, []);

    useEffect(() => {
        async function fetchTotalItems() {
            const db = getDatabase();
            const itemsRef = ref(db, 'foodItems');
            const snapshot = await get(itemsRef);
            if (snapshot.exists()) {
                const items = snapshot.val();
                setTotalItems(Object.keys(items).length);
            } else {
                setTotalItems(0);
            }
        }
        fetchTotalItems();
    }, []);

    useEffect(() => {
        async function fetchActivities() {
            const db = getDatabase();
            const activitiesRef = ref(db, 'activities');
            const snapshot = await get(activitiesRef);
            if (snapshot.exists()) {
                const activities = snapshot.val();
                const sortedActivities = Object.keys(activities)
                    .map(key => activities[key])
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setActivities(sortedActivities);
            } else {
                setActivities([]);
            }
        }

        // Check if a week has passed since the last reset
        const lastReset = localStorage.getItem('lastReset');
        const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (!lastReset || now - parseInt(lastReset, 10) > oneWeekInMilliseconds) {
            resetActivities();
            localStorage.setItem('lastReset', now.toString());
        } else {
            fetchActivities();
        }
    }, []);

    // Function to reset activities
    const resetActivities = async () => {
        const db = getDatabase();
        const activitiesRef = ref(db, 'activities');
        await set(activitiesRef, {}); // Clear all activities
        setActivities([]); // Update state to reflect the cleared activities
    };

    const indexOfLastActivity = currentPage * activitiesPerPage;
    const indexOfFirstActivity = indexOfLastActivity - activitiesPerPage;
    const currentActivities = activities.slice(indexOfFirstActivity, indexOfLastActivity);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);


    const getIcon = (action) => {
        switch (action) {
            case 'add':
                return (
                    <div className="flex items-center">
                        <HiOutlinePlus className="text-green-500" />
                        <span className="ml-2">Added</span>
                    </div>
                );
            case 'edit':
                return (
                    <div className="flex items-center">
                        <HiOutlinePencilAlt className="text-yellow-500" />
                        <span className="ml-2">Edited</span>
                    </div>
                );
            case 'archive':
                return (
                    <div className="flex items-center">
                        <HiOutlineArchive className="text-red-500" />
                        <span className="ml-2">Archived</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const formatDate = (date: string) => {
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            year: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return new Date(date).toLocaleString('en-US', options);
    };

    useEffect(() => {
        async function fetchStockData() {
            const db = getDatabase();
            const itemsRef = ref(db, 'foodItems');
            const snapshot = await get(itemsRef);
            if (snapshot.exists()) {
                const items = snapshot.val();
                const filteredItems = Object.keys(items)
                    .filter(key => items[key].stocks <= 10)
                    .map(key => ({
                        label: items[key].foodName,
                        value: items[key].stocks,
                        vendor: items[key].vendor
                    }));
                setStockData(filteredItems);
                setFilteredStockData(filteredItems);

                // Extract unique vendors
                const uniqueVendorsSet = new Set(filteredItems.map(item => item.vendor));
                const uniqueVendors = Array.from(uniqueVendorsSet); // Convert Set to Array
                setVendors(uniqueVendors);
            } else {
                setStockData([]);
                setFilteredStockData([]);
                setVendors([]);
            }
        }
        fetchStockData();
    }, []);

    const handleVendorChange = (event : React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = event.target;
        setSelectedVendor(value);
        const filtered = value === '' ? stockData : stockData.filter(stock => stock.vendor === value);
        setFilteredStockData(filtered);
    };

    const chartData = {
        labels: filteredStockData.map(item => item.label),
        datasets: [
            {
                label: 'Stocks',
                data: filteredStockData.map(item => item.value),
                backgroundColor: filteredStockData.map(item => item.value === 0 ? 'rgba(255, 0, 0, 0.2)' : 'rgba(75, 192, 192, 0.2)'),
                borderColor: filteredStockData.map(item => item.value === 0 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
                borderWidth: 1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true
            },
            tooltip: {
                callbacks: {
                    label: function(context : any) {
                        return context.raw === 0 ? 'Out of Stock' : context.raw;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: (context : any) => {
                        const value = chartData.datasets[0].data[context.index];
                        return value === 0 ? 'red' : 'black';
                    }
                }
            }
        }
    };

    const toTitleCase = (str: string): string => str
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    const statusColors = {
        Pending: '#f59e0b', // Yellow
        'admin approved': '#10b981', // Green
        'admin disapproved': '#ef4444', // Red
        'editing process': '#f97316', // Orange
        'Edit Requested': '#f59e0b', // Yellow
        'send to vendor': '#3b82f6', // Blue
        'quotation received': '#9333ea', // Purple
        'request successfully': '#22c55e', // Light Green
    };

    // CSS for the blinking circle
    const circleStyles = (color: string) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        marginRight: '8px',
        animation: 'blink 1.3s infinite',
    });

    // CSS keyframes for the blink animation
    const blinkKeyframes = `
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
    }`;

    useEffect(() => {
        const requestsRef = ref(database, 'requests');
        onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const requestsArray = Object.keys(data).map(key => {
                    const requestData = data[key];
                    const requesterName = requestData.sectionA?.[2]?.[5] || 'Unknown';
                    return {
                        id: key,
                        ...requestData,
                        requester: toTitleCase(requesterName)
                    };
                });
                setRequests(requestsArray);
            }
        });
    }, []);


    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen}/>
            <div className= {`flex-1 bg-gray-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <Header/>
                <div className="container mx-auto p-4">
                    <div className="flex justify-between mb-4">
                        <div className="flex-1 flex flex-wrap justify-between">
                            <div className="w-full sm:w-1/2 md:w-1/4 p-2">
                                <div className="w-full h-40 border border-gray-300 rounded-lg bg-white flex flex-col justify-start p-4">
                                    <div className="flex items-start justify-between w-full">
                                        <p className="text-neutral-500 font-medium">Vendors</p>
                                        <div
                                            className="flex items-center justify-center rounded-lg p-2 w-10 h-10"
                                            style={{ backgroundColor: '#d0e1fd' }}>
                                            <HiOutlineShoppingCart className="text-xl" style={{ color: '#3b82f6' }} />
                                        </div>
                                    </div>
                                    <p className="text-gray-900 font-medium text-xl mt-0.5">{vendorCount}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-1/2 md:w-1/4 p-2">
                                <div className="w-full h-40 border border-gray-300 rounded-lg bg-white flex flex-col justify-start p-4">
                                    <div className="flex items-start justify-between w-full">
                                        <p className="text-gray-700">Categories</p>
                                        <div
                                            className="flex items-center justify-center rounded-lg p-2 w-10 h-10"
                                            style={{ backgroundColor: '#feddc7' }}>
                                            <HiOutlineViewGrid className="text-xl" style={{ color: '#f97316' }} />
                                        </div>
                                    </div>
                                    <p className="text-gray-900 font-medium text-xl mt-0.5">{categoryCount}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-1/2 md:w-1/4 p-2">
                                <div className="w-full h-40 border border-gray-300 rounded-lg bg-white flex flex-col justify-start p-4">
                                    <div className="flex items-start justify-between w-full">
                                        <p className="text-gray-700">Total Items</p>
                                        <div
                                            className="flex items-center justify-center rounded-lg p-2 w-10 h-10"
                                            style={{ backgroundColor: '#c3edf5' }}>
                                            <HiOutlineInbox className="text-xl" style={{ color: '#4b5563' }} />
                                        </div>
                                    </div>
                                    <p className="text-gray-900 font-medium text-xl mt-0.5">{totalItems}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-1/2 md:w-1/4 p-2">
                                <div className="w-full h-40 border border-gray-300 rounded-lg bg-white flex flex-col justify-start p-4">
                                    <div className="flex items-start justify-between w-full">
                                        <p className="text-gray-700">Total Request</p>
                                        <div
                                            className="flex items-center justify-center rounded-lg p-2 w-10 h-10"
                                            style={{ backgroundColor: '#ead6fd' }}>
                                            <HiOutlineDocumentDownload className="text-xl" style={{ color: '#a855f7' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="container mx-auto p-4 flex flex-col space-y-4">
                    <div className="flex w-full space-x-4">
                        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-md w-full">
                            <h2 className="text-xl font-bold mb-4" style={{color: '#111827'}}>Recent Activity</h2>
                            {activities.length === 0 ? (
                                <div className="text-gray-600">No recent activity available.</div>
                            ) : (
                                <>
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider"></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Date/Time</th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                        {currentActivities.map((activity, index) => (
                                            <tr key={index}>
                                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                                                    {getIcon(activity.action)}
                                                </td>
                                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                                                    {`${activity.item} has been ${activity.action}ed`}
                                                </td>
                                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                                                    {formatDate(activity.date)}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-center items-center mt-4">
                                        <button
                                            onClick={() => paginate(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="focus:outline-none"
                                        >
                                            <HiOutlineArrowLeft
                                                className="text-gray-500 text-xl hover:text-gray-700 transition-colors"/>
                                        </button>
                                        <div className="flex space-x-2 mx-4">
                                            {Array.from({length: Math.ceil(activities.length / activitiesPerPage)}, (_, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => paginate(index + 1)}
                                                    className={`w-6 h-6 flex items-center justify-center cursor-pointer rounded-full transition-transform ${
                                                        currentPage === index + 1 ? 'bg-blue-500 text-white transform scale-125' : 'bg-gray-300 text-black'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => paginate(currentPage + 1)}
                                            disabled={currentPage === Math.ceil(activities.length / activitiesPerPage)}
                                            className="focus:outline-none"
                                        >
                                            <HiOutlineArrowRight
                                                className="text-gray-500 text-xl hover:text-gray-700 transition-colors"/>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-md w-full mt-4">
                        <h2 className="text-xl font-bold mb-4" style={{color: '#111827'}}>Stock Chart</h2>
                        <select
                            value={selectedVendor}
                            onChange={handleVendorChange}
                            className="text-black mb-4 p-2 border border-gray-300 rounded"
                        >
                            <option value="">All Vendors</option>
                            {vendors.map((vendor, index) => (
                                <option key={index} value={vendor}>{vendor}</option>
                            ))}
                        </select>
                        <Chart type="bar" data={chartData} options={chartOptions}/>
                    </div>
                    <style>{blinkKeyframes}</style>
                    <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-md w-full mt-4">
                        <h2 className="text-xl font-bold mb-4" style={{color: '#111827'}}>Item Requests</h2>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">File</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Requester</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((request, index) => (
                                <tr key={index}>
                                    <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                                        <HiOutlineDocumentText className="text-gray-500"/>
                                    </td>
                                    <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                                        {request.requester}
                                    </td>
                                    <td className="text-gray-600 px-6 py-4 whitespace-nowrap">
                                        {formatDate(request.dateCreated)}
                                    </td>
                                    <td
                                        className="text-gray-600 px-6 py-4 whitespace-nowrap"
                                        style={{color: statusColors[request.status] || '#6b7280'}} // Default color if status not found
                                    >
                                        <span style={circleStyles(statusColors[request.status])}></span>
                                        {request.status}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

