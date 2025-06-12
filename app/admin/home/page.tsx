'use client';
import React, { useEffect, useState } from 'react';
import { Chart } from 'primereact/chart';
import { getDatabase, ref, get, set, onValue } from 'firebase/database';
import Header from '../../components/Header';
import Sidenav from '../../components/Sidenav';
import {
    HiOutlineArchive,
    HiOutlineDocumentDownload,
    HiOutlineInbox,
    HiOutlinePencilAlt,
    HiOutlinePlus,
    HiOutlineShoppingCart,
    HiOutlineViewGrid,
    HiOutlineDocumentText,
    HiOutlineArrowRight,
    HiOutlineArrowLeft,
} from 'react-icons/hi';
import { motion } from 'framer-motion';

interface Activity {
    action: string;
    item: string;
    date: string;
}

interface Request {
    requester: string;
    dateCreated: string;
    status: string;
}

interface StockItem {
    label: string;
    value: number;
    vendor: string;
}

export default function Home() {
    const [vendorCount, setVendorCount] = useState(0);
    const [categoryCount, setCategoryCount] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [stockData, setStockData] = useState<StockItem[]>([]);
    const [filteredStockData, setFilteredStockData] = useState<StockItem[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [requests, setRequests] = useState<Request[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const activitiesPerPage = 5;

    // Data fetch hooks (vendor, category, items, stock, activities)
    useEffect(() => {
        const db = getDatabase();
        get(ref(db, 'vendors')).then(snapshot => {
            setVendorCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
        });
        get(ref(db, 'categories')).then(snapshot => {
            setCategoryCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
        });
        get(ref(db, 'foodItems')).then(snapshot => {
            if (snapshot.exists()) {
                const items = snapshot.val();
                setTotalItems(Object.keys(items).length);

                const filteredItems = Object.keys(items)
                    .filter(key => items[key].stocks <= 10)
                    .map(key => ({
                        label: items[key].foodName,
                        value: items[key].stocks,
                        vendor: items[key].vendor,
                    }));
                setStockData(filteredItems);
                setFilteredStockData(filteredItems);

                const uniqueVendors = Array.from(new Set(filteredItems.map(item => item.vendor)));
                setVendors(uniqueVendors);
            }
        });

        const activitiesRef = ref(db, 'activities');
        get(activitiesRef).then(snapshot => {
            if (snapshot.exists()) {
                const data = Object.values(snapshot.val()) as Activity[];
                setActivities(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
        });

        onValue(ref(db, 'requests'), snapshot => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const formatted = Object.keys(data).map(key => {
                    const request = data[key];
                    const requesterName =
                        request?.sectionA?.find((item: any) => item.header === 'Requestor')?.value || 'Unknown';
                    return { ...request, requester: toTitleCase(requesterName) };
                });
                setRequests(formatted);
            }
        });
    }, []);

    // Chart filter
    const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedVendor(val);
        setFilteredStockData(val === '' ? stockData : stockData.filter(item => item.vendor === val));
    };

    // Chart setup
    const chartData = {
        labels: filteredStockData.map(i => i.label),
        datasets: [
            {
                label: 'In Stock',
                data: filteredStockData.map(i => i.value > 0 ? i.value : null),
                backgroundColor: '#3b82f6',
            },
            {
                label: 'Out of Stock',
                data: filteredStockData.map(i => i.value === 0 ? 0 : null),
                backgroundColor: '#ef4444',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context: any) =>
                        context.dataset.label === 'Out of Stock'
                            ? 'Out of Stock'
                            : `Stock: ${context.raw}`,
                },
            },
        },
        scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true },
        },
    };

    const toTitleCase = (str: string) =>
        str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    const getStatusColor = (status: string): string => {
        const map = {
            Pending: '#f59e0b',
            'Admin Approved': '#10b981',
            'Admin Disapproved': '#ef4444',
            'Needs Editing': '#f97316',
            'Send to Vendor': '#3b82f6',
            'Quotation Received': '#9333ea',
            'Request Successfully': '#22c55e',
        };
        return map[status as keyof typeof map] || '#6b7280';
    };

    const circleStyles = (color: string) => ({
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        marginRight: 8,
        animation: 'blink 1s infinite',
    });

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
    const indexOfLast = currentPage * activitiesPerPage;
    const currentActivities = activities.slice(indexOfLast - activitiesPerPage, indexOfLast);

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen} />
            <div className={`flex-1 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'}`}>
                <Header />

                {/* Summary Stats */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {[
                        { label: 'Vendors', value: vendorCount, icon: HiOutlineShoppingCart, color: '#dbeafe', iconColor: '#3b82f6' },
                        { label: 'Categories', value: categoryCount, icon: HiOutlineViewGrid, color: '#fef3c7', iconColor: '#f59e0b' },
                        { label: 'Total Items', value: totalItems, icon: HiOutlineInbox, color: '#cffafe', iconColor: '#06b6d4' },
                        { label: 'Requests Pending', value: requests.filter(r => r.status === 'Pending').length, icon: HiOutlineDocumentDownload, color: '#ede9fe', iconColor: '#8b5cf6' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
                            <div className="flex justify-between items-center">
                                <p className="text-gray-500 font-medium">{stat.label}</p>
                                <div className="p-2 rounded-md" style={{ backgroundColor: stat.color }}>
                                    <stat.icon className="text-xl" style={{ color: stat.iconColor }} />
                                </div>
                            </div>
                            <p className="text-2xl font-semibold mt-2 text-gray-800">{stat.value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Activity Table */}
                <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="bg-white p-4 rounded-lg shadow border text-black">
                        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                        {currentActivities.length === 0 ? (
                            <p className="text-gray-500">No recent activity.</p>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                                <tr>
                                    <th className="py-2 px-4">Action</th>
                                    <th className="py-2 px-4">Item</th>
                                    <th className="py-2 px-4">Date</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentActivities.map((a, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="py-2 px-4">{a.action}</td>
                                        <td className="py-2 px-4">{a.item}</td>
                                        <td className="py-2 px-4">{new Date(a.date).toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>

                {/* Chart */}
                <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="bg-white text-black p-6 rounded-lg shadow border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Stock Chart</h2>
                            <select
                                value={selectedVendor}
                                onChange={handleVendorChange}
                                className="border px-3 py-1 rounded-md text-sm text-gray-800"
                            >
                                <option value="">All Vendors</option>
                                {vendors.map((v, i) => (
                                    <option key={i} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="h-80">
                            <Chart type="bar" data={chartData} options={chartOptions} />
                        </div>
                    </div>
                </motion.div>


                <motion.div className="p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-white text-black p-6 rounded-lg shadow border overflow-x-auto">
                        <h2 className="text-xl font-semibold mb-4">Recent Item Requests</h2>
                        {requests.length === 0 ? (
                            <p className="text-gray-500">No requests available.</p>
                        ) : (
                            <table className="min-w-full text-sm text-left table-auto">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="py-2 px-4">File</th>
                                    <th className="py-2 px-4">Requester</th>
                                    <th className="py-2 px-4">Date</th>
                                    <th className="py-2 px-4">Status</th>
                                </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                {requests
                                    .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
                                    .slice(0, 5)
                                    .map((request, index) => (
                                        <tr key={index} className="border-t hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2">
                                                <HiOutlineDocumentText className="text-xl text-gray-500" />
                                            </td>
                                            <td className="px-4 py-2">{request.requester}</td>
                                            <td className="px-4 py-2">{new Date(request.dateCreated).toLocaleString()}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center">
                                        <span
                                            className="w-2 h-2 mr-2 rounded-full animate-blink"
                                            style={{ backgroundColor: getStatusColor(request.status) }}
                                        />
                                                    <span
                                                        className="px-3 py-1 rounded-full text-xs font-medium"
                                                        style={{
                                                            backgroundColor: `${getStatusColor(request.status)}20`,
                                                            color: getStatusColor(request.status),
                                                        }}
                                                    >
                                            {request.status}
                                        </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
