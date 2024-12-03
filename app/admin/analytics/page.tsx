'use client'
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { database } from "../../services/firebase";
import { ref, get } from 'firebase/database';
import Sidenav from "../../components/Sidenav";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi';

ChartJS.register(LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend, ArcElement);

type FoodItem = {
    id: string;
    foodName: string;
    stocks: number;
    unit: string;
    vendor: string;
};

const StockMonitor = () => {
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pieChartData, setPieChartData] = useState<any>({
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: [
                '#FF6384',
                '#36A2EB',
                '#FFCE56',
                '#FF5733',
                '#33FF57',
                '#3357FF',
                '#FFC300',
            ],
        }],
    });
    const [dataFetched, setDataFetched] = useState(false);
    const toastRef = useRef<Toast>(null);
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const [currentPageTable, setCurrentPageTable] = useState(1);
    const [currentPageChart, setCurrentPageChart] = useState(1);
    const itemsPerPage = 10;
    const maxPageButtons = 3;

    useEffect(() => {
        const fetchFoodItems = async () => {
            try {
                const snapshot = await get(ref(database, 'foodItems'));
                if (snapshot.exists()) {
                    const items = snapshot.val();
                    const formattedItems = Object.keys(items).map(key => ({
                        id: key,
                        foodName: items[key].foodName,
                        stocks: Number(items[key].stocks),
                        unit: items[key].unit,
                        vendor: items[key].vendor,
                    }));
                    setFoodItems(formattedItems);
                } else {
                    console.log("No data available");
                }
            } catch (error) {
                console.error("Error fetching data: ", error);
            }
        };

        fetchFoodItems();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (dataFetched) return;
            try {
                const snapshot = await get(ref(database, 'requests'));
                const requests = snapshot.val();

                if (!requests) return;

                const purchasesByMonth: { [key: string]: number } = {};

                for (const key in requests) {
                    const request = requests[key];
                    const purchaseDate = new Date(request.dateCreated);
                    if (isNaN(purchaseDate.getTime())) continue;

                    const month = purchaseDate.toLocaleString('default', { month: 'long' });
                    purchasesByMonth[month] = (purchasesByMonth[month] || 0) + 1;
                }

                const months = Object.keys(purchasesByMonth);
                const counts = Object.values(purchasesByMonth);

                setPieChartData({
                    labels: months,
                    datasets: [{
                        data: counts,
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#FF5733',
                            '#33FF57',
                            '#3357FF',
                            '#FFC300',
                        ],
                    }],
                });

                setDataFetched(true);
            } catch (error) {
                console.error("Error fetching data from Firebase:", error);
            }
        };

        fetchData();
    }, [dataFetched]);

    const chartData = {
        labels: foodItems.slice((currentPageChart - 1) * itemsPerPage, currentPageChart * itemsPerPage).map(item => item.foodName),
        datasets: [
            {
                label: 'In Stock',
                data: foodItems.slice((currentPageChart - 1) * itemsPerPage, currentPageChart * itemsPerPage).map(item => item.stocks > 0 ? item.stocks : null),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                stack: 'stack0'
            },
            {
                label: 'Out of Stock',
                data: foodItems.slice((currentPageChart - 1) * itemsPerPage, currentPageChart * itemsPerPage).map(item => item.stocks === 0 ? 1 : null),
                backgroundColor: 'rgba(255, 0, 0, 0.6)',
                borderColor: 'rgb(220, 0, 0)',
                borderWidth: 1,
                stack: 'stack0'
            }
        ],
    };

    const chartOptions = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
            legend: { display: true },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return context.dataset.label === 'Out of Stock' ? 'Out of Stock' : `${context.dataset.label}: ${context.parsed.y}`;
                    }
                },
                enabled: true,
                backgroundColor: '#333',
                titleFont: { size: 16 },
                bodyFont: { size: 14 },
            },
        },
        scales: {
            y: {
                stacked: true,
                beginAtZero: true,
                grid: {
                    color: (context: any) => context.tick.value === 0 ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                },
                title: { display: true, text: 'Stock Level' },
            },
            x: {
                stacked: true,
                grid: { display: false },
                title: { display: true, text: 'Food Items' },
                ticks: {
                    color: (context: any) => chartData.datasets[0].data[context.index] === null ? 'red' : 'black',
                    font: { weight: 'normal' }
                },
            },
        },
    };

    const renderPagination = (currentPage: number, totalPages: number, setCurrentPage: (page: number) => void) => {
        const startPage = Math.max(1, currentPage - 1);
        const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

        return (
            <div className="flex justify-center items-center mt-4 space-x-2">
                <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg border ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                    <HiOutlineArrowLeft className="text-xl" />
                </button>
                {Array.from({ length: endPage - startPage + 1 }, (_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentPage(startPage + index)}
                        className={`px-3 py-1 rounded-lg border ${currentPage === startPage + index ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >
                        {startPage + index}
                    </button>
                ))}
                <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-lg border ${currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                    <HiOutlineArrowRight className="text-xl" />
                </button>
            </div>
        );
    };

    const filteredFoodItems = foodItems.filter(item =>
        item.foodName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen flex bg-gray-100">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen} />
            <div className={`flex-1 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <Toast ref={toastRef} />
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Stock Level Monitoring</h2>

                <div className="bg-white shadow-lg rounded-lg p-8 mb-10 text-black">
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search food items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <DataTable
                        value={filteredFoodItems.slice((currentPageTable - 1) * itemsPerPage, currentPageTable * itemsPerPage)}
                        className="p-datatable-gridlines mb-6"
                        style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}
                    >
                        <Column
                            field="foodName"
                            header="Food Item"
                            sortable
                            bodyClassName="border-b border-gray-200 p-3"
                            headerClassName="bg-gray-100 text-gray-700 border-b border-gray-200 p-3"
                        />
                        <Column
                            field="stocks"
                            header="Stock Level"
                            sortable
                            bodyClassName="border-b border-gray-200 p-3"
                            headerClassName="bg-gray-100 text-gray-700 border-b border-gray-200 p-3"
                        />
                        <Column
                            field="unit"
                            header="Unit"
                            sortable
                            bodyClassName="border-b border-gray-200 p-3"
                            headerClassName="bg-gray-100 text-gray-700 border-b border-gray-200 p-3"
                        />
                        <Column
                            field="vendor"
                            header="Vendor"
                            sortable
                            bodyClassName="border-b border-gray-200 p-3"
                            headerClassName="bg-gray-100 text-gray-700 border-b border-gray-200 p-3"
                        />
                    </DataTable>
                    {renderPagination(currentPageTable, Math.ceil(filteredFoodItems.length / itemsPerPage), setCurrentPageTable)}
                </div>

                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Stock Level Chart</h2>
                <div className="bg-white shadow-lg rounded-lg p-8 h-96">
                    <Bar data={chartData} options={chartOptions} />
                </div>
                {renderPagination(currentPageChart, Math.ceil(foodItems.length / itemsPerPage), setCurrentPageChart)}

                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 mt-5">Purchase History</h2>
                <div className="bg-white shadow-lg rounded-lg p-8 h-96 flex">
                    <div className="w-1/2 flex items-center justify-center">
                        {pieChartData.labels.length > 0 ? (
                            <Pie data={pieChartData} options={{
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Monthly Purchase Distribution',
                                        font: { size: 18, weight: 'normal' },
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (tooltipItem: any) => {
                                                const dataValue = tooltipItem.raw;
                                                const total = pieChartData.datasets[0].data.reduce((acc: number, val: number) => acc + val, 0);
                                                const percentage = ((dataValue / total) * 100).toFixed(2);
                                                return `${tooltipItem.label}: ${dataValue} (${percentage}%)`;
                                            },
                                        },
                                    },
                                    legend: { display: true, position: 'right' },
                                    datalabels: {
                                        color: '#fff',
                                        formatter: (value: number, context: any) => {
                                            const total = context.dataset.data.reduce((acc: number, val: number) => acc + val, 0);
                                            const percentage = ((value / total) * 100).toFixed(1);
                                            return `${percentage}%`;
                                        },
                                    },
                                },
                            }} />
                        ) : (
                            <p>No data available for the pie chart.</p>
                        )}
                    </div>
                    <div className="w-1/2 p-4">
                        <h3 className="text-lg font-medium text-gray-700 mb-4">Monthly Purchases</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-300">
                                    <th className="py-2 px-4 text-gray-600 font-semibold">Month</th>
                                    <th className="py-2 px-4 text-gray-600 font-semibold">Purchases</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pieChartData.labels.length > 0 ? (
                                    pieChartData.labels.map((month:any, index:any) => (
                                        <tr key={month} className="border-b">
                                            <td className="py-2 px-4 text-gray-700">{month}</td>
                                            <td className="py-2 px-4 text-gray-700">{pieChartData.datasets[0].data[index]}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="py-2 px-4 text-gray-700 text-center">No data available.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockMonitor;