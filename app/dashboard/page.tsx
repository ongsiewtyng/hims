'use client'
import { useState, useEffect } from 'react';
import { getDatabase } from "@firebase/database";
import Header from "../components/Header";

export default function Dashboard() {
    const [inventory, setInventory] = useState([]);

    useEffect(() => {
        // Fetch inventory data from Firestore
        const fetchInventory = async () => {
            try {
                const inventoryRef = firebase.firestore().collection('inventory');
                const snapshot = await inventoryRef.get();
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInventory(data);
            } catch (error) {
                console.error('Error fetching inventory:', error);
            }
        };

        fetchInventory();
    }, []);

    return (
        <div className="container mx-auto px-4 py-8">
            <Header />
            <h1 className="text-3xl font-bold mb-4">Inventory Dashboard</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {inventory.map(item => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.foodName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{item.vendor}</div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
