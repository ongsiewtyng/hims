import React, { useState, useEffect } from 'react';
import {HiCheckCircle, HiOutlineMinusCircle, HiOutlinePlusCircle, HiTrash, HiXCircle} from 'react-icons/hi';
import { database } from '../services/firebase'; // Ensure this is set up correctly
import {ref, onValue, update, ref as databaseRef} from '@firebase/database';
import StockUpdate from "./StockUpdate";
import {get, getDatabase} from "firebase/database";


type StockUpdateModalProps = {
    stockUpdateModal: boolean;
    setStockUpdateModal: (value: boolean) => void;
};

type FoodItem = {
    id: string;
    foodName: string;
    stocks: number;
    vendor: string;
    unit: string;
    category: string; // Include category
};

const StockUpdateModal: React.FC<StockUpdateModalProps> = ({ stockUpdateModal, setStockUpdateModal }) => {
    const [foodItems, setFoodItems] = useState<{ [vendor: string]: FoodItem[] }>({});
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'stock' | 'upload'>('stock');
    const [editValues, setEditValues] = useState<{ itemNo: number; description: string; quantity: number; unit: string | null }[]>([]);
    const [extractedData, setExtractedData] = useState<{ itemNo: number; description: string; quantity: number; unit: string | null }[]>([]);
    const [fileUploaded, setFileUploaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (fileData : any) => {
        setPdfFile(fileData);
        setEditValues(fileData);
        setFileUploaded(true);
    }

    // Fetch food items from the Firebase Realtime Database
    useEffect(() => {
        setLoading(true);
        const foodItemsRef = ref(database, 'foodItems');
        onValue(foodItemsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const itemsByVendor: { [vendor: string]: FoodItem[] } = {};

                Object.keys(data).forEach((key) => {
                    const item = data[key];
                    if (!itemsByVendor[item.vendor]) {
                        itemsByVendor[item.vendor] = [];
                    }
                    itemsByVendor[item.vendor].push({
                        id: key,
                        foodName: item.foodName,
                        stocks: item.stocks,
                        vendor: item.vendor,
                        unit: item.unit,
                        category: item.category // Ensure category is included
                    });
                });

                setFoodItems(itemsByVendor);
                // Automatically select the first vendor if none is selected
                if (selectedVendor === null && Object.keys(itemsByVendor).length > 0) {
                    setSelectedVendor(Object.keys(itemsByVendor)[0]); // Select the first vendor
                }
            }
            setLoading(false);
        });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, vendor: string, itemId: string) => {
        const value = e.target.value;

        // Allow only numbers and empty input (to prevent invalid characters)
        if (/^\d*$/.test(value)) {
            // Update the item quantity in state (temporarily)
            setFoodItems((prevFoodItems) => ({
                ...prevFoodItems,
                [vendor]: prevFoodItems[vendor].map((item) =>
                    item.id === itemId ? { ...item, stocks: value === '' ? 0 : parseInt(value, 10) } : item
                ),
            }));
        }
    };


    // Function to update Firebase on blur event
    const updateStocksInDatabase = (vendor, itemId) => {
        const item = foodItems[vendor].find(item => item.id === itemId);

        if (item) {
            const itemRef = ref(database, `foodItems/${itemId}`);
            update(itemRef, { stocks: item.stocks })
                .then(() => {
                    setError('Stock updated successfully');
                    console.log('Stock updated successfully');
                })
                .catch((error) => {
                    console.error('Error updating stock:', error);
                });
        }
    };



    // Ensure handleQuantityChange updates Firebase and UI
    const handleQuantityChange = (vendor: string, itemId: string, change: number) => {
        const updatedItems = { ...foodItems }; // Make a copy of the existing food items
        const item = updatedItems[vendor].find(item => item.id === itemId);

        if (item) {
            const newQuantity = item.stocks + change;

            // Prevent negative stock
            if (newQuantity >= 0) {
                item.stocks = newQuantity;

                // Update in Firebase
                const itemRef = ref(database, `foodItems/${itemId}`);
                update(itemRef, { stocks: newQuantity })
                    .then(() => {
                        // Update the state to reflect the changes immediately
                        setFoodItems(updatedItems);
                    })
                    .catch((error) => {
                        console.error('Error updating stock quantity:', error);
                    });
            }
        }
    };

    const handleInputChange2 = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedValues = [...editValues];
        updatedValues[index] = {
            ...updatedValues[index],
            [name]: name === 'quantity' ? Number(value) : value
        };
        setEditValues(updatedValues);
    };

    const handleAddRow = () => {
        setEditValues([
            ...editValues,
            { itemNo: editValues.length + 1, description: '', quantity: 0, unit: null }
        ]);
    };

    const handleDeleteRow = (index: number) => {
        const updatedValues = editValues.filter((_, i) => i !== index);
        setEditValues(updatedValues);
    };

    const handleSaveStock = async (action : any) => {
        // Step 1: Set extracted data
        setExtractedData(editValues);
        console.log("Extracted data set:", editValues);

        const db = getDatabase();
        const foodItemsRef = databaseRef(db, 'foodItems');

        for (const item of editValues) {
            console.log(`Processing item: ${item.description} with quantity: ${item.quantity}`);

            try {
                // Step 2: Fetch all food items from Firebase
                const snapshot = await get(foodItemsRef);
                if (snapshot.exists()) {
                    console.log("Food items found in database.");

                    let itemUpdated = false; // Flag to check if any match is found and updated

                    // Step 3: Iterate through food items in the database
                    snapshot.forEach((childSnapshot) => {
                        const foodItemData = childSnapshot.val();

                        // Step 4: Check if the description matches the food item name in the database
                        if (foodItemData.foodName === item.description) {
                            const currentStock = parseInt(foodItemData.stocks, 10);
                            let newStock: number; // Declare newStock with a type

                            // Determine whether to add or subtract based on the action
                            if (action === 'add') {
                                newStock = currentStock + item.quantity;
                            } else if (action === 'subtract') {
                                newStock = Math.max(currentStock - item.quantity, 0); // Prevent negative stock
                            } else {
                                // If action is not recognized, you can set a default or throw an error
                                console.error(`Unrecognized action: ${action}`);
                                return; // Exit if the action is not valid
                            }

                            // Update stocks in Firebase
                            const foodItemRef = databaseRef(db, `foodItems/${childSnapshot.key}`);
                            update(foodItemRef, { stocks: newStock.toString() });
                            console.log(`Updated stock for ${item.description}: ${newStock}`);

                            itemUpdated = true; // Mark that this item was updated
                        }
                    });

                    // Check if the item had a match in the database
                    if (!itemUpdated) {
                        setError(`No match found in database for item: ${item.description}`);
                        console.log(`No match found in database for item: ${item.description}`);
                    }
                } else {
                    setError("No food items exist in the database.");
                    console.log("No food items exist in the database.");
                }
            } catch (error) {
                console.error("Error updating stock for item:", item.description, error);
            }
        }
        setError("Stock update process successfully.");
        console.log("Stock update process completed.");
        setTimeout(() => {
            setStockUpdateModal(false);
        }, 3000);
    };

    const confirmAction = (action : any) => {
        const confirmation = window.confirm(`Are you sure you want to ${action} stock?`);
        if (confirmation) {
            handleSaveStock(action);
        }
    };


    // Handle modal close
    const handleClose = () => {
        setStockUpdateModal(false);
    };

    return (
        stockUpdateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
                <div className="bg-white rounded-lg p-8 max-w-6xl w-full mx-auto relative z-50 text-black">
                    <button className="absolute top-4 right-4 text-2xl text-black cursor-pointer" onClick={handleClose}>
                        <HiXCircle/>
                    </button>
                    <h2 className="text-black text-2xl font-bold mb-4">Stock Update</h2>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div>
                            {/* Tab Navigation */}
                            <div className="mb-4">
                                <div className="flex border-b border-gray-200">
                                    <button
                                        className={`py-2 px-4 text-sm font-medium ${activeTab === 'stock' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                                        onClick={() => setActiveTab('stock')}
                                    >
                                        Stock Management
                                    </button>
                                    <button
                                        className={`py-2 px-4 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                                        onClick={() => setActiveTab('upload')}
                                    >
                                        Upload Files
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'stock' && (
                                <div>
                                    {/* Vendor Tabs */}
                                    <div className="mb-4">
                                        <div className="flex border-b border-gray-200">
                                            {Object.keys(foodItems).map((vendor) => (
                                                <button
                                                    key={vendor}
                                                    className={`py-2 px-4 text-sm font-medium ${selectedVendor === vendor ? 'border-b-2 border-blue-500' : ''}`}
                                                    onClick={() => setSelectedVendor(vendor)}
                                                >
                                                    {vendor}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Display items for the selected vendor */}
                                    {selectedVendor && (
                                        <div className="max-h-[70vh] overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item
                                                        Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                                </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                {foodItems[selectedVendor].map((item) => (
                                                    <tr key={item.id}>
                                                        {/* Display Food Name */}
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.foodName}</td>

                                                        {/* Display Category */}
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>

                                                        {/* Editable Input for Quantity */}
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {/* Decrease Button */}
                                                            <button
                                                                onClick={() => handleQuantityChange(selectedVendor, item.id, -1)}
                                                                className="px-2 py-1 bg-red-200 text-red-700 rounded mr-2"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={item.stocks}
                                                                onChange={(e) => handleInputChange(e, selectedVendor, item.id)}
                                                                onBlur={() => updateStocksInDatabase(selectedVendor, item.id)} // Update on blur
                                                                className="border rounded py-1 px-2 w-16 text-center"
                                                            />
                                                            {/* Increase Button */}
                                                            <button
                                                                onClick={() => handleQuantityChange(selectedVendor, item.id, 1)}
                                                                className="px-2 py-1 bg-green-200 text-green-700 rounded ml-2"
                                                            >
                                                                +
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PDF Upload Section */}
                            {activeTab === 'upload' && (
                                <div className="">
                                    {/* PDF Upload Component */}
                                    <StockUpdate onPDFDataChange={handleFileChange}/>

                                    {/* Conditionally Render Table Form Section */}
                                    {fileUploaded && (
                                        <div className="bg-white rounded-2xl w-full p-8 max-w-6xl mx-auto mt-4">
                                            <div className="overflow-y-auto rounded-lg border border-gray-200">
                                                <table className="min-w-full bg-white rounded-lg">
                                                    <thead>
                                                    <tr className="bg-primary text-black text-sm font-semibold uppercase">
                                                        <th className="py-3 px-6 border-b border-gray-300">No</th>
                                                        <th className="py-3 px-6 border-b border-gray-300">Description</th>
                                                        <th className="py-3 px-6 border-b border-gray-300">Quantity</th>
                                                        <th className="py-3 px-6 border-b border-gray-300">Unit</th>
                                                        <th className="py-3 px-6 border-b border-gray-300">Actions</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody className="text-gray-700 text-sm divide-y divide-gray-200">
                                                    {editValues.map((item, index) => (
                                                        <tr key={index}
                                                            className="hover:bg-gray-50 transition ease-in-out duration-150">
                                                            <td className="py-3 px-6 min-w-[100px] text-center">{item.itemNo}</td>
                                                            <td className="py-3 px-6 text-left min-w-[200px]">
                                                                <input
                                                                    type="text"
                                                                    name="description"
                                                                    value={item.description}
                                                                    onChange={(e) => handleInputChange2(index, e)}
                                                                    className="border border-gray-300 rounded-md p-1 w-full"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-6 min-w-[150px]">
                                                                <input
                                                                    type="number"
                                                                    name="quantity"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleInputChange2(index, e)}
                                                                    className="border border-gray-300 rounded-md p-1 w-full"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-6 min-w-[150px]">
                                                                <input
                                                                    type="text"
                                                                    name="unit"
                                                                    value={item.unit || ''}
                                                                    onChange={(e) => handleInputChange2(index, e)}
                                                                    className="border border-gray-300 rounded-md p-1 w-full"
                                                                />
                                                            </td>
                                                            <td className="py-3 px-6 min-w-[150px] text-center">
                                                                <button
                                                                    onClick={() => handleDeleteRow(index)}
                                                                    className="text-red-500"
                                                                >
                                                                    <HiTrash/>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div
                                                className="flex flex-col items-center pt-2 mt-2 border-gray-300">
                                                <div className="flex justify-between w-full">
                                                    {/* Add Row Button on the Left */}
                                                    <button
                                                        onClick={handleAddRow}
                                                        className="text-white bg-blue-500 p-2 rounded hover:bg-blue-600 transition"
                                                    >
                                                        + Add Row
                                                    </button>

                                                    {/* Add Stock and Subtract Stock Buttons on the Right */}
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => confirmAction('add')}
                                                            className="flex items-center text-white bg-green-500 p-3 rounded hover:bg-green-600 transition"
                                                        >
                                                            <HiOutlinePlusCircle className="mr-2"/> Add Stock
                                                        </button>
                                                        <button
                                                            onClick={() => confirmAction('subtract')}
                                                            className="flex items-center text-white bg-red-500 p-3 rounded hover:bg-red-600 transition"
                                                        >
                                                            <HiOutlineMinusCircle className="mr-2"/> Subtract Stock
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {error && (
                    <div
                        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4 z-50">
                        {error.includes('successfully') ? (
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                        )}
                        <span>{error}</span>
                    </div>
                )}
            </div>
        )
    );
}

export default StockUpdateModal;
