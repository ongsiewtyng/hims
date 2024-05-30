'use client';
import { Chart } from 'primereact/chart';
import React from 'react';
import Header from "@/app/components/Header";
import {HiOutlineDocumentDownload, HiOutlineInbox, HiOutlineShoppingCart, HiOutlineViewGrid} from "react-icons/hi";


export default function Home() {
    const data = {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        datasets: [
            {
                label: 'Sales',
                data: [65, 59, 80, 81, 56, 55, 40],
                fill: false,
                borderColor: '#4bc0c0'
            },
            {
                label: 'Income',
                data: [28, 48, 40, 19, 86, 27, 90],
                fill: false,
                borderColor: '#565656'
            }
        ]
    };


    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="flex justify-center">
                <div className="w-80 h-40 border border-gray-300 rounded-lg p-4 bg-white mr-5 flex flex-col justify-start">
                    <div className="flex items-start justify-between w-full">
                        <p className="text-gray-700">Vendors</p>
                        <div
                            className="flex items-center justify-center bg-blue-500 rounded-lg p-2 w-10 h-10 ml-auto">
                            <HiOutlineShoppingCart className="texttext-white"/>
                        </div>
                    </div>
                </div>

                <div
                    className="w-80 h-40 border border-gray-300 rounded-lg p-4 bg-white mr-5 flex flex-col justify-start">
                    <div className="flex items-start justify-between w-full">
                        <p className="text-gray-700">Categories</p>
                        <div
                            className="flex items-center justify-center bg-white border-gray-300 border-2 rounded-lg p-2 w-10 h-10 ml-auto">
                            <HiOutlineViewGrid className="text-xl text-gray-700"/>
                        </div>
                    </div>
                </div>
                <div
                    className="w-80 h-40 border border-gray-300 rounded-lg p-4 bg-white mr-5 flex flex-col justify-start">
                    <div className="flex items-start justify-between w-full">
                        <p className="text-gray-700">Total Items</p>
                        <div
                            className="flex items-center justify-center bg-white border-gray-300 border-2 rounded-lg p-2 w-10 h-10 ml-auto">
                            <HiOutlineInbox className="text-xl text-gray-700"/>
                        </div>
                    </div>
                </div>
                <div
                    className="w-80 h-40 border border-gray-300 rounded-lg p-4 bg-white mr-5 flex flex-col justify-start">
                    <div className="flex items-start justify-between w-full">
                        <p className="text-gray-700">Total Request</p>
                        <div
                            className="flex items-center justify-center bg-white border-gray-300 border-2 rounded-lg p-2 w-10 h-10 ml-auto">
                            <HiOutlineDocumentDownload className="text-xl text-gray-700"/>
                        </div>
                    </div>
                </div>

            </div>
            <div className="container mx-auto p-4">
                <div className="bg-white p-4 rounded-md shadow-md">
                    <Chart type="line" data={data}/>
                </div>
            </div>
        </div>

    )

}