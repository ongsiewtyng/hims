'use client'
import React, {useEffect, useState} from 'react';
import Table from "../../components/Table";
import {database} from "../../services/firebase";
import {get, onValue, push, ref, set, update} from "@firebase/database";
import Sidenav from "../../components/Sidenav";
import {
    HiCheckCircle,
    HiXCircle,
    HiOutlineShoppingBag,
    HiOutlineUserGroup,
    HiOutlineViewGridAdd,
    HiOutlineLockClosed,
    HiOutlineTruck, HiOutlineCloudDownload, HiX
} from "react-icons/hi";
import "../styles/Homebuttons.css";
import "../styles/Homebuttons2.css";
import "../styles/Homebuttons3.css";
import StockUpdateModal from "../../components/StockUpdateModal";
import UploadItemsModal from "../../components/UploadItemsModal";
import AddNEditVendorModal from "../../components/AddNEditVendorModal";

export default function Dashboard() {
    type Vendor = {
        name: string;
        id: string;
    }
            type Category = {
                name: string;
                id: string;
                categoryId: string;
            }
    type FoodItems = {
        id: string;
        vendor: string;
        category: string;
        foodName: string;
        unit: string;
        archive: boolean;
    }
    const [addItemModal, setAddItemModal] = useState(false);
    const [isVendorsModal,setIsVendorsModal] = useState(false);
    const [vendor, setVendor] = useState<string>('');
    const [addCategoryModal, setAddCategoryModal] = useState(false);
    const [category, setCategory] = useState<string>('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [foodName, setFoodName] = useState('');
    const [unit, setUnit] = useState('');
    const [stocks, setStocks] = useState('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorId, setVendorId] = useState<string | null>(null);
    const [archiveDataModal, setArchiveDataModal] = useState(false);
    const [isUploadItemsModal, setIsUploadItemsModal] = useState(false);
    const [isStockUpdateModal, setIsStockUpdateModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [foodItems, setFoodItems] = useState<FoodItems[]>([]);
    const [activeVendor, setActiveVendor] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);

    const [uploadedData, setUploadedData] = useState<any>({header: [], data: []});
    const [headers, setHeaders] = useState<string[]>([]);
    const [extractedValues, setExtractedValues] = useState<string[]>([]);
    const [showExcelData, setShowExcelData] = useState(false);

    const addActivity = async (action: string, item: any) => {
        try {
            const activitiesRef = ref(database, 'activities');
            const newActivity = {
                action,
                item,
                date: new Date().toISOString(),
            };
            await push(activitiesRef, newActivity);
            console.log('Activity logged successfully!');
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }


    async function addFoodItem(vendor: string, category: string, foodName: string, unit: string, archive: boolean = false, stocks: string) {
        // Add food item to database
        try {
            const newItemRef = push(ref(database, 'foodItems/'));
            const newItem = {
                vendor,
                category,
                foodName,
                unit,
                archive,
                stocks,
                dateCreated: new Date().toISOString()
            };
            await set(newItemRef, newItem);
            console.log('Food item added successfully!');
            setError("Food item added successfully!");
            setTimeout(() => {
                setError(null);
                setAddItemModal(false);
            }, 3000);

            // Reset the food item state
            setVendor('');
            setCategory('');
            setFoodName('');
            setUnit('');
            setStocks('');

            // Log the activity
            await addActivity('add', foodName);

        } catch (error) {
            console.error('Error adding food item:', error);
            setError("Failed to add food item. Please try again.");
            setTimeout(() => setError(null), 3000);
            // Handle error
        }
    }

    async function getVendorId(vendor: string): Promise<string | null> {
        try {
            const vendorsRef = await get(ref(database, 'vendors'));
            const vendorsData = vendorsRef.val();
            if (vendorsData) {
                for (const [vendorId, vendorData] of Object.entries<{ name: string }>(vendorsData)) {
                    if (vendorData.name === vendor) {
                        return vendorId;
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting vendor ID:', error);
            return null;
        }
    }

    async function addCategory(vendor: string, name: string) {
        try {
            const vendorId = await getVendorId(vendor);
            if (!vendorId) {
                console.error('Vendor not found:', vendor);
                setError('Vendor not found. Please try again.');
                return;
            }
            const newCategoryRef = push(ref(database, `categories/${vendorId}`)); // Generate a unique reference for the new category
            const categoryId = newCategoryRef.key; // Get the unique ID generated by Firebase
            await set(newCategoryRef, { // Save the category data with the unique ID
                vendor: vendor,
                name: name,
                id: categoryId, // Save the unique ID along with the category data
                dateCreated: new Date().toISOString()
            });

            console.log('Category added successfully!');
            setError("Category added successfully!");
            setTimeout(() => {
                setError(null);
                setAddCategoryModal(false);

                //Reset the category state
                setCategory('');
            }, 3000);
            await addActivity('add', category);
        } catch (error) {
            console.error('Error adding category:', error);
            setError('Failed to add category. Please try again.');
        }

    }


    useEffect(() => {
        let isMounted = true;
        if ((addCategoryModal || addItemModal) && isMounted) {
            const vendorsRef = ref(database, 'vendors');
            onValue(vendorsRef, (snapshot) => {
                const vendorsData = snapshot.val();
                if (vendorsData) {
                    const vendorList = Object.keys(vendorsData).map(key => vendorsData[key]);
                    setVendors(vendorList);
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [addCategoryModal, addItemModal]);


    useEffect(() => {
        if (addItemModal && vendorId) {
            const categoriesRef = ref(database, 'categories');
            onValue(categoriesRef, (snapshot) => {
                const categoriesData = snapshot.val() as Category[]
                if (categoriesData) {
                    const vendorCategories = Object.values(categoriesData).filter((category: any) => category.vendor === vendor);
                    setCategories(vendorCategories);
                } else {
                    setCategories([]);
                }
            });
        } else {
            setCategories([]);
        }
    }, [addItemModal, vendorId, vendor]);



    useEffect(() => {
        if (archiveDataModal) {
            const foodItemsRef = ref(database, 'foodItems');
            const unsubscribe = onValue(foodItemsRef, (snapshot) => {
                const foodItemsData = snapshot.val();
                if (foodItemsData) {
                    const foodItemsList: FoodItems[] = Object.keys(foodItemsData).map(key => ({id: key, ...foodItemsData[key]}));
                    setFoodItems(foodItemsList);
                    if (foodItemsList.length > 0) {
                        setActiveVendor(foodItemsList[0].vendor); // Set default active vendor
                    }
                }
            });

            // Clean up the listener when the component unmounts or archiveDataModal changes
            return () => {
                unsubscribe();
                setFoodItems([]);
            };
        }
    }, [archiveDataModal]);

    const handleToggleArchive = async (itemId: string) => {
        setFoodItems(prevFoodItems => {
            return prevFoodItems.map(foodItem => {
                if (foodItem.id === itemId) {
                    return {...foodItem, archive: !foodItem.archive};
                }
                return foodItem;
            });
        });

        // Update the archive status in the database
        const itemRef = ref(database, `foodItems/${itemId}`);
        const snapshot = await get(itemRef);
        if (snapshot.exists()) {
            const itemData = snapshot.val();
            await update(itemRef, {archive: !itemData.archive});
            await addActivity('archive', itemData.foodName);
        }
    };

    const groupedItems = foodItems.reduce((acc, item) => {
        if (!acc[item.vendor]) {
            acc[item.vendor] = [];
        }
        acc[item.vendor].push(item);
        return acc;
    }, {} as Record<string, FoodItems[]>);


    const handleOpenStockUpdateModal = () => {
        setIsStockUpdateModal(true);
    }

    // Function to handle opening the upload items modal
    const handleOpenUploadItemsModal = () => {
        setIsUploadItemsModal(true);
    };

    const handleTabChange = (vendor: string) => {
        setActiveVendor(vendor);
    };

    const handleOpenVendorsModal = () => {
        setIsVendorsModal(true);
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen}/>
            <div className={`flex-1 bg-gray-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-black text-3xl font-bold mb-4">Inventory Dashboard</h1>
                    <div className="rounded-lg overflow-hidden p-4"> {/* Added padding here */}
                        <div className="flex justify-between py-4">

                            {/* Left Aligned Buttons */}
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setAddItemModal(true)}
                                    className="custom-button"
                                >
                                    <HiOutlineShoppingBag size={20}/>
                                    <span>Add Item</span>
                                </button>
                                <button
                                    onClick={handleOpenVendorsModal}
                                    className="custom-button"
                                >
                                    <HiOutlineUserGroup size={20}/>
                                    <span>Add/Edit Vendor</span>
                                </button>
                                {/* Vendors Modal */}
                                {isVendorsModal && (
                                    <AddNEditVendorModal
                                        vendorsModal = {isVendorsModal}
                                        setVendorsModal = {setIsVendorsModal}
                                    />
                                )}
                                <button
                                    onClick={() => setAddCategoryModal(true)}
                                    className="custom-button"
                                >
                                    <HiOutlineViewGridAdd size={20}/>
                                    <span>Add Category</span>
                                </button>
                                <button
                                    onClick={() => setArchiveDataModal(true)}
                                    className="custom-button"
                                >
                                    <HiOutlineLockClosed size={20}/>
                                    <span>Inactive Item</span>
                                </button>
                            </div>

                            {/* Right Aligned Buttons */}
                            <div className="flex space-x-4">
                                <button
                                    onClick={handleOpenStockUpdateModal}
                                    className="custom-button2"
                                >
                                    <HiOutlineTruck size={20}/>
                                </button>
                                {/* Stock Update Modal */}
                                {isStockUpdateModal && (
                                    <StockUpdateModal
                                        stockUpdateModal={isStockUpdateModal}
                                        setStockUpdateModal={setIsStockUpdateModal}
                                    />
                                )}

                                <button
                                    onClick={handleOpenUploadItemsModal}
                                    className="custom-button3"
                                >
                                    <HiOutlineCloudDownload size={20}/>
                                </button>
                                {/* Items Modal */}
                                {isUploadItemsModal && (
                                    <UploadItemsModal
                                        uploadItemsModal={isUploadItemsModal}
                                        setUploadItemsModal={setIsUploadItemsModal}

                                    />
                                )}
                            </div>
                        </div>

                        {/* Your table to display food items */}
                        <Table vendors={vendor}/>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {addItemModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="bg-white rounded-lg p-8 w-1/2">
                        <h2 className="text-black text-2xl font-bold mb-4">Add Item</h2>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendor">
                                Vendor
                            </label>
                            <select
                                value={vendor}
                                onChange={e => {
                                    setVendor(e.target.value);
                                    const selectedVendor = vendors.find(v => v.name === e.target.value);
                                    setVendorId(selectedVendor ? selectedVendor.id : null);
                                }}
                                className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                required
                                onInvalid={(e) => e.currentTarget.setCustomValidity('Please select a vendor')}
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map((vendor: Vendor) => (
                                    <option key={vendor.id} value={vendor.name}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                                Category
                            </label>
                            {categories.length === 1 ? (
                                <input
                                    id="category"
                                    type="text"
                                    value={categories[0].name}
                                    readOnly
                                    className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                    placeholder="Category"
                                />
                            ) : (
                                <select
                                    id="category"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                    required
                                    onInvalid={(e) => e.currentTarget.setCustomValidity('Please select a category')}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="foodName">
                                Item Name
                            </label>
                            <input
                                id="foodName"
                                type="text"
                                value={foodName}
                                onChange={e => setFoodName(e.target.value)}
                                className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                placeholder="Item Name"
                                required
                                onInvalid={(e) => e.currentTarget.setCustomValidity('Please enter the item name')}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stocks">
                                Stocks
                            </label>
                            <input
                                id="stocks"
                                type="text"
                                value={stocks}
                                onChange={e => setStocks(e.target.value)}
                                className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                placeholder="Stocks"
                                required
                                onInvalid={(e) => e.currentTarget.setCustomValidity('Please enter the stocks')}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unit">
                                Unit
                            </label>
                            <select
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                required
                                onInvalid={(e) => e.currentTarget.setCustomValidity('Please select a unit')}
                            >
                                <option value="">Select Unit</option>
                                <option value="kg">kg</option>
                                <option value="nos">nos</option>
                                <option value="pkt">pkt</option>
                                <option value="btl">btl</option>
                                <option value="pcs">pcs</option>
                                <option value="newUnit">New Unit</option>
                            </select>
                            {unit === 'newUnit' && (
                                <input
                                    type="text"
                                    className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full mt-2"
                                    placeholder="Enter New Unit"
                                    required
                                    onInvalid={(e) => e.currentTarget.setCustomValidity('Please enter the unit')}
                                />
                            )}
                        </div>
                        <div className="flex justify-between">
                            <button
                                onClick={() => {
                                    if (!vendor || !category || !foodName || !stocks || !unit) {
                                        setError('Please fill out all required fields');
                                        setTimeout(() => setError(null), 2000);
                                        return;
                                    }
                                    addFoodItem(vendor, category, foodName, unit, false, stocks);
                                    setError('Item added successfully');
                                }}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Add Item
                            </button>
                            <button
                                onClick={() => setAddItemModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                        {error && (
                            <div
                                className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                                {error.includes('successfully') ? (
                                    <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                                ) : (
                                    <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                                )}
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {addCategoryModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="bg-white rounded-lg p-8 w-1/2">
                        <h2 className="text-black text-2xl font-bold mb-4">Add Category</h2>
                        <div className="mb-4">
                            <label className={"block text-gray-700 text-sm font-bold mb-2"} htmlFor="vendor">
                                Vendor
                            </label>
                            <select
                                value={vendor}
                                onChange={e => setVendor(e.target.value)}
                                className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                required
                                onInvalid={(e) => e.currentTarget.setCustomValidity('Please select a vendor')}
                                onInput={(e) => e.currentTarget.setCustomValidity('')}
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map((vendor, index) => (
                                    <option key={index} value={vendor.name}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className={"block text-gray-700 text-sm font-bold mb-2"} htmlFor="category">
                                Category
                            </label>
                            <input
                                id="category"
                                type="text"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                                placeholder="Category Name"
                                required
                                onInvalid={(e) => e.currentTarget.setCustomValidity('Please enter the category name')}
                            />
                        </div>
                        <div className="flex justify-between">
                            <button
                                onClick={() => {
                                    if (!vendor || !category) {
                                        setError('Please fill out all required fields');
                                        setTimeout(() => setError(null), 2000);
                                        return;
                                    }
                                    addCategory(vendor, category);
                                    setError('Category added successfully');
                                }}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                Add Category
                            </button>
                            <button
                                onClick={() => setAddCategoryModal(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                        {error && (
                            <div
                                className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                                {error.includes('successfully') ? (
                                    <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                                ) : (
                                    <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                                )}
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/*{Archive Data Modal}*/}
            {archiveDataModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="relative bg-white rounded-lg p-8 w-3/4 max-h-[80vh] flex flex-col text-black">
                        {/* Close Button */}
                        <button
                            onClick={() => setArchiveDataModal(false)}
                            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
                        >
                            <HiX className="h-6 w-6"/>
                        </button>

                        {/* Tab Navigation */}
                        <div className="flex space-x-4 border-b border-gray-300 mb-4">
                            {Object.keys(groupedItems).map(vendor => (
                                <button
                                    key={vendor}
                                    className={`py-2 px-4 rounded-t-lg ${activeVendor === vendor ? 'bg-gray-200 font-bold' : 'hover:bg-gray-100'}`}
                                    onClick={() => handleTabChange(vendor)}
                                >
                                    {vendor}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto">
                            <h2 className="text-black text-2xl font-bold mb-4">Archive Items</h2>
                            <div className="mb-4">
                                {activeVendor && groupedItems[activeVendor] && groupedItems[activeVendor].map(item => (
                                    <div key={item.id} className="flex items-center justify-between mb-2">
                                        <span className="ml-3 text-black text-lg">{item.foodName}</span>
                                        <label className="flex items-center cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => handleToggleArchive(item.id)}
                                                />
                                                <div className="block rounded-full w-7 h-4"
                                                     style={{backgroundColor: item.archive ? 'red' : 'green'}}></div>
                                                <div
                                                    className={`dot absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition ${item.archive ? 'transform translate-x-full' : ''}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div
                                className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                                {error.includes('successfully') ? (
                                    <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                                ) : (
                                    <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                                )}
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}