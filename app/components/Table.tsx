'use client'
import React, {useEffect} from 'react';
import {get, ref, update, onValue, push} from '@firebase/database';
import { database } from '../services/firebase';
import { FiEdit3} from "react-icons/fi";
import { IoStorefrontOutline } from "react-icons/io5";
import {HiCheckCircle, HiOutlineSearch, HiXCircle} from "react-icons/hi";
import {getDatabase} from "@firebase/database";

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

const Table: React.FC= () => {
    const [data, setData] = React.useState<Vendors[]>([]);
    const [vendors, setVendors] = React.useState<Vendors[]>([]);
    const [editDataModal, setEditDataModal] = React.useState<Vendors | null>(null);
    const [message, setMessage] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState<string>('');

    useEffect(() => {
        const dataRef = ref(database, 'foodItems/');
        onValue(dataRef, (snapshot) => {
            if (snapshot.exists()) {
                const items = snapshot.val();
                const itemsArray: Vendors[] = [];
                for (const [id, item] of Object.entries(items)) {
                    if (typeof item === 'object' && item !== null) {
                        itemsArray.push({ ...item as Vendors, id });
                    }
                }
                setData(itemsArray);
            } else {
                console.log("No data available");
            }
        });

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
                setVendors(itemsArray);
            } else {
                console.log("No data available");
            }
        });
    }
    , []);

    async function editData(id: string, category: string, foodName: string,stocks:string, unit: string) {
        try {
            const dataRef = ref(database, `foodItems/${id}`);
            const snapshot = await get(dataRef);
            if (snapshot.exists()) {
                const foodItem = snapshot.val() as Vendors;
                // Check if the new values are different from the existing ones
                if (foodItem.category !== category || foodItem.foodName !== foodName || foodItem.stocks !== stocks ||foodItem.unit !== unit) {
                    const currentDate = new Date().toISOString(); // Get the current date and time
                    const updatedItem = {
                        ...foodItem,
                        category,
                        foodName,
                        stocks,
                        unit,
                        dateUpdated: currentDate // Update the dateUpdated field
                    };
                    // Update the specific item under `foodItems/${keyName}/` path
                    await update(dataRef, updatedItem);

                    // Log the activity
                    await addActivity('edit', updatedItem);

                    // Update the local state
                    setData(prevData => prevData.map(item => item.id === editDataModal?.id ? updatedItem : item));
                    setMessage("Item updated successfully");
                    setTimeout(() => {
                        setMessage(null);
                        setEditDataModal(null); // Close the modal after 3 seconds
                    }, 2000);
                }
            } else {
                console.log("No data available");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setMessage("Error updating item");
            setTimeout(() => setMessage(null), 3000);
        }
    }

    const addActivity = async (action: string, item: any) => {
        const db = getDatabase();
        const activitiesRef = ref(db, 'activities');
        const currentDate = new Date().toISOString();
        await push(activitiesRef, {
            action,
            item: item.foodName,
            date: currentDate
        });
    };


    // Filter vendors and data based on the search query
    const filteredVendors = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredData = data.filter(item =>
        !item.archive &&
        (item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Combine filtered vendors and data
    const combinedData = filteredVendors.length > 0
        ? filteredVendors.map(vendor => ({
            ...vendor,
            items: data.filter(item => item.vendor === vendor.name && !item.archive)
        }))
        : vendors.map(vendor => ({
            ...vendor,
            items: filteredData.filter(item => item.vendor === vendor.name && !item.archive)
        }));


    return (
        <div>
            {/* Search bar */}
            <div className="mb-4 relative max-w-full"> {/* Ensure the width matches the table */}
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-black border border-gray-300 rounded-md py-2 px-4 pr-10 w-full focus:outline-none focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <HiOutlineSearch className="h-5 w-5 text-gray-400" /> {/* Search icon */}
                </div>
            </div>
            {combinedData.map((vendor, index) => (
                <div key={index} className="mb-8">
                    <div className="shadow-lg rounded-lg overflow-hidden bg-white">
                        <div className="px-6 py-4 bg-gray-200 flex items-center justify-between">
                            <div className="flex items-center">
                                <IoStorefrontOutline className="text-lg text-gray-900"/>
                                <h3 className="text-lg font-bold text-gray-700 ml-2">{vendor.name}</h3>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Item Name
                                    </th>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stocks
                                    </th>
                                    <th scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unit
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {vendor.items.length > 0 ? (
                                        vendor.items.map((item, index) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{item.category}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{item.foodName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{item.stocks}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{item.unit}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button onClick={() => setEditDataModal(item)}>
                                                        <FiEdit3 className="h-5 w-5 text-gray-500 hover:text-gray-700"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">No items available for this vendor
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
            {/*edit data modal*/}
            {editDataModal && (
                <div className="fixed z-10 inset-0 overflow-y-auto">
                    <div
                        className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"
                              aria-hidden="true">&#8203;</span>
                        <div
                            className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                            role="dialog" aria-modal="true" aria-labelledby="modal-headline">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                                            Edit Item
                                        </h3>
                                        <div className="mt-2">
                                            <form>
                                                <input
                                                    type="hidden"
                                                    value={editDataModal.id}
                                                    onChange={(e) => setEditDataModal({
                                                        ...editDataModal,
                                                        id: e.target.value
                                                    })}
                                                />
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2"
                                                           htmlFor="category">
                                                        Category
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editDataModal.category}
                                                        onChange={(e) => setEditDataModal({
                                                            ...editDataModal,
                                                            category: e.target.value
                                                        })}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        id="category"
                                                        placeholder="Category"
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2"
                                                           htmlFor="foodName">
                                                        Item Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editDataModal.foodName}
                                                        onChange={(e) => setEditDataModal({
                                                            ...editDataModal,
                                                            foodName: e.target.value
                                                        })}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        id="foodName"
                                                        placeholder="Item Name"
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2"
                                                           htmlFor="stocks">
                                                        Stocks
                                                    </label>
                                                    <input
                                                        type="text"
                                                        onChange={(e) => setEditDataModal({
                                                            ...editDataModal,
                                                            stocks: e.target.value
                                                        })}
                                                        value={editDataModal.stocks}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        id="stocks"
                                                        placeholder="Stocks"
                                                    />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2"
                                                           htmlFor="unit">
                                                        Unit
                                                    </label>
                                                    <input
                                                        type="text"
                                                        onChange={(e) => setEditDataModal({
                                                            ...editDataModal,
                                                            unit: e.target.value
                                                        })}
                                                        value={editDataModal.unit}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        id="unit"
                                                        placeholder="Unit"
                                                    />
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="button"
                                        onClick={() => editData(editDataModal.id, editDataModal.category, editDataModal.foodName,editDataModal.stocks, editDataModal.unit)}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm">
                                    Save
                                </button>
                                <button type="button" onClick={() => setEditDataModal(null)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                    Cancel
                                </button>
                            </div>
                        </div>
                        {message && (
                            <div
                                className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                                {message.includes('successfully') ? (
                                    <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                                ) : (
                                    <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                                )}
                                <span>{message}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

export default Table;