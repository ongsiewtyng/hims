'use client'
import React, { useEffect, useState } from 'react';
import { get, ref, update, onValue, push } from '@firebase/database';
import { database } from '../services/firebase';
import { FiEdit3 } from "react-icons/fi";
import { IoStorefrontOutline } from "react-icons/io5";
import { HiCheckCircle, HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineSearch, HiXCircle } from "react-icons/hi";
import { getDatabase } from "@firebase/database";
import '../components/shake.css';
import { TfiAlert } from "react-icons/tfi";

interface Vendors {
    id: string;
    vendor: string;
    name: string;
    category: string;
    foodName: string;
    stocks: string;
    unit: string;
    archive: boolean;
}

const ITEMS_PER_PAGE = 10;

const Table: React.FC = () => {
    const [data, setData] = useState<Vendors[]>([]);
    const [vendors, setVendors] = useState<Vendors[]>([]);
    const [editDataModal, setEditDataModal] = useState<Vendors | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [vendorPage, setVendorPage] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const dataRef = ref(database, 'foodItems/');
        const unsubscribe = onValue(dataRef, (snapshot) => {
            if (snapshot.exists()) {
                const items = snapshot.val();
                const itemsArray: Vendors[] = [];
                for (const [id, item] of Object.entries(items)) {
                    if (typeof item === 'object' && item !== null) {
                        itemsArray.push({ ...item as Vendors, id });
                    }
                }
                setData(itemsArray);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const dataRef = ref(database, 'vendors/');
        onValue(dataRef, (snapshot) => {
            if (snapshot.exists()) {
                const items = snapshot.val();
                const itemsArray: Vendors[] = [];
                for (const [id, item] of Object.entries(items)) {
                    if (typeof item === 'object' && item !== null) {
                        itemsArray.push({ ...item as Vendors, id });
                    }
                }
                itemsArray.sort((a, b) => a.name.localeCompare(b.name));
                setVendors(itemsArray);
            }
        });
    }, []);

    async function editData(id: string, category: string, foodName: string, stocks: string, unit: string) {
        try {
            const dataRef = ref(database, `foodItems/${id}`);
            const snapshot = await get(dataRef);
            if (snapshot.exists()) {
                const foodItem = snapshot.val() as Vendors;
                if (foodItem.category !== category || foodItem.foodName !== foodName || foodItem.stocks !== stocks || foodItem.unit !== unit) {
                    const currentDate = new Date().toISOString();
                    const updatedItem = { ...foodItem, category, foodName, stocks, unit, dateUpdated: currentDate };
                    await update(dataRef, updatedItem);
                    await addActivity('edit', updatedItem);
                    const updatedSnapshot = await get(dataRef);
                    if (updatedSnapshot.exists()) {
                        const updatedData = updatedSnapshot.val() as Vendors;
                        setData(prev => prev.map(item => item.id === id ? { ...updatedData, id } : item));
                        setMessage("Item updated successfully");
                        setTimeout(() => { setMessage(null); setEditDataModal(null); }, 2000);
                    } else {
                        setMessage("Error finding updated item");
                        setTimeout(() => setMessage(null), 2000);
                    }
                } else {
                    setMessage("No changes made");
                    setTimeout(() => setMessage(null), 2000);
                }
            } else {
                setMessage("Item not found");
                setTimeout(() => setMessage(null), 2000);
            }
        } catch {
            setMessage("Error updating item");
            setTimeout(() => setMessage(null), 3000);
        }
    }

    const addActivity = async (action: string, item: any) => {
        const db = getDatabase();
        const activitiesRef = ref(db, 'activities');
        await push(activitiesRef, { action, item: item.foodName, date: new Date().toISOString() });
    };

    const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredData = data.filter(item => !item.archive && (
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.foodName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unit?.toLowerCase().includes(searchQuery.toLowerCase())
    ));

    const combinedData = (filteredVendors.length > 0 ? filteredVendors : vendors).map(vendor => ({
        ...vendor,
        items: filteredData.filter(item => item.vendor === vendor.name)
    }));

    const handlePageChange = (vendorName: string, page: number) => {
        setVendorPage(prev => ({ ...prev, [vendorName]: page }));
    };

    const getPaginationRange = (current: number, total: number) => {
        const range = [];
        for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
            range.push(i);
        }
        return range;
    };

    return (
        <div>
            <div className="mb-4 relative max-w-full">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-black border border-gray-300 rounded-md py-2 px-4 pr-10 w-full focus:outline-none focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <HiOutlineSearch className="h-5 w-5 text-gray-400" />
                </div>
            </div>

            {combinedData.length > 0 ? (
                combinedData.map((vendor, vendorIndex) => {
                    const currentPage = vendorPage[vendor.name] || 1;
                    const totalPages = Math.ceil(vendor.items.length / ITEMS_PER_PAGE);
                    const currentItems = vendor.items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
                    const paginationRange = getPaginationRange(currentPage, totalPages);

                    return (
                        <div key={vendorIndex} className="mb-8">
                            <div className="shadow-lg rounded-lg overflow-hidden bg-white">
                                <div className="px-6 py-4 bg-gray-200">
                                    <div className="flex items-center">
                                        <IoStorefrontOutline className="text-lg text-gray-900 mr-2" />
                                        <h3 className="text-lg font-bold text-gray-700">{vendor.name}</h3>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
                                        <thead className="bg-gray-50">
                                        <tr>
                                            <th className="w-1/2 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                            <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stocks</th>
                                            <th className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                            <th className="w-12"></th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                        {currentItems.length > 0 ? currentItems.map((item, index) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.foodName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">{item.stocks}{parseInt(item.stocks) < 3 && (<TfiAlert className="shake text-red-500 ml-2" />)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.unit}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button onClick={() => setEditDataModal(item)} className="text-blue-500 hover:text-blue-700">
                                                        <FiEdit3 className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No items found</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 flex items-center justify-between">
                                    <button onClick={() => handlePageChange(vendor.name, Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="text-blue-500 hover:text-blue-700 disabled:text-gray-300">
                                        <HiOutlineArrowLeft className="h-5 w-5" />
                                    </button>
                                    <div className="flex items-center space-x-2">
                                        {paginationRange.map(page => (
                                            <button key={page} onClick={() => handlePageChange(vendor.name, page)} className={`px-3 py-1 border rounded-md ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'}`}>{page}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => handlePageChange(vendor.name, Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="text-blue-500 hover:text-blue-700 disabled:text-gray-300">
                                        <HiOutlineArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center text-gray-500">No data available</div>
            )}

            {editDataModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50">
                    <div className="text-black bg-white rounded-lg shadow-lg w-full max-w-lg">
                        <div className="px-4 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-bold">Edit Item</h3>
                        </div>
                        <div className="px-4 py-4">
                            {['category', 'foodName', 'stocks', 'unit'].map((field, i) => (
                                <div key={field} className="mb-4">
                                    <label htmlFor={field} className="block text-sm font-medium text-gray-700">
                                        {field.charAt(0).toUpperCase() + field.slice(1)}
                                    </label>
                                    <input
                                        id={field}
                                        type="text"
                                        defaultValue={editDataModal[field as keyof Vendors] as string}
                                        className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                        onChange={(e) => setEditDataModal(prev => prev ? { ...prev, [field]: e.target.value } : null)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="px-4 py-4 border-t border-gray-200 flex justify-end">
                            <button onClick={() => setEditDataModal(null)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-md mr-2">
                                <HiXCircle className="inline-block mr-2" /> Cancel
                            </button>
                            <button onClick={() => editData(editDataModal.id, editDataModal.category, editDataModal.foodName, editDataModal.stocks, editDataModal.unit)} className="bg-blue-500 text-white px-4 py-2 rounded-md">
                                <HiCheckCircle className="inline-block mr-2" /> Save
                            </button>
                        </div>
                    </div>
                    {message && (
                        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                            {message.includes('successfully') ? (
                                <HiCheckCircle className="h-6 w-6 mr-2 text-green-500" />
                            ) : (
                                <HiXCircle className="h-6 w-6 mr-2 text-red-500" />
                            )}
                            <span>{message}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Table;
