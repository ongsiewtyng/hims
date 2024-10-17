import React, { useState, useEffect } from 'react';
import { HiXCircle } from 'react-icons/hi';
import { database } from '../services/firebase'; // Ensure this is set up correctly
import { ref, onValue, update } from '@firebase/database'; // Import Firebase functions

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

    // Function to update quantity in Firebase
    const updateQuantity = (itemId: string, newQuantity: number) => {
        const itemRef = ref(database, `foodItems/${itemId}`);
        update(itemRef, { stocks: newQuantity })
            .then(() => {
                console.log('Quantity updated successfully');
            })
            .catch((error) => {
                console.error('Error updating quantity:', error);
            });
    };

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



    // Handle modal close
    const handleClose = () => {
        setStockUpdateModal(false);
    };

    return (
        stockUpdateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
                <div className="bg-white rounded-lg p-8 w-3/4 max-w-4xl mx-auto relative z-50 text-black">
                    <button className="absolute top-4 right-4 text-2xl text-black cursor-pointer" onClick={handleClose}>
                        <HiXCircle />
                    </button>
                    <h2 className="text-black text-2xl font-bold mb-4">Stock Update</h2>

                    {loading ? (
                        <p>Loading...</p>
                    ) : (
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
                                                        disabled={item.stocks <= 0}
                                                    >
                                                        -
                                                    </button>

                                                    {/* Editable Input (as text field) */}
                                                    <input
                                                        type="text"
                                                        value={item.stocks}
                                                        onChange={(e) => handleInputChange(e, selectedVendor, item.id)}
                                                        onBlur={() => updateStocksInDatabase(selectedVendor, item.id)}
                                                        className="w-16 text-center px-2 py-1 border border-gray-300 rounded"
                                                    />

                                                    {/* Increase Button */}
                                                    <button
                                                        onClick={() => handleQuantityChange(selectedVendor, item.id, 1)}
                                                        className="px-2 py-1 bg-green-200 text-green-700 rounded ml-2"
                                                    >
                                                        +
                                                    </button>
                                                    <span className="ml-2">{item.unit}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    );
};

export default StockUpdateModal;
