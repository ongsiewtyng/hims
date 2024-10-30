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
    const [pieChartData, setPieChartData] = useState<any>({});
    const toastRef = useRef<Toast>(null);
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const [currentPageTable, setCurrentPageTable] = useState(1);
    const [currentPageChart, setCurrentPageChart] = useState(1);
    const itemsPerPage = 10;
    const maxPageButtons = 3;

    const showSuccess = useCallback(() => {
        if (toastRef.current) {
            toastRef.current.show({ severity: 'success', summary: 'Data Loaded', detail: 'Stock levels fetched successfully!', life: 3000 });
        }
    }, []);

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
                    showSuccess();
                } else {
                    console.log("No data available");
                }
            } catch (error) {
                console.error("Error fetching data: ", error);
            }
        };

        fetchFoodItems();
    }, [showSuccess]);

    const totalPagesTable = Math.ceil(foodItems.length / itemsPerPage);
    const totalPagesChart = Math.ceil(foodItems.length / itemsPerPage);
    const paginatedItemsTable = foodItems.slice(
        (currentPageTable - 1) * itemsPerPage,
        currentPageTable * itemsPerPage
    );
    const paginatedItemsChart = foodItems.slice(
        (currentPageChart - 1) * itemsPerPage,
        currentPageChart * itemsPerPage
    );

    const chartData = {
        labels: paginatedItemsChart.map(item => item.foodName),
        datasets: [
            {
                label: 'In Stock',
                data: paginatedItemsChart.map(item => item.stocks > 0 ? item.stocks : null),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                stack: 'stack0'
            },
            {
                label: 'Out of Stock',
                data: paginatedItemsChart.map(item => item.stocks === 0 ? 1 : null),
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
            legend: {
                display: true,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        if (context.dataset.label === 'Out of Stock') {
                            return 'Out of Stock';
                        }
                        return `${context.dataset.label}: ${context.parsed.y}`;
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
                    color: (context : any) => context.tick.value === 0 ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                },
                title: { display: true, text: 'Stock Level' },
            },
            x: {
                stacked: true,
                grid: { display: false },
                title: { display: true, text: 'Food Items' },
                ticks: {
                    color: (context : any) => chartData.datasets[0].data[context.index] === null ? 'red' : 'black',
                    font: {
                        weight: 'normal',
                    }
                },
            },
        },
    };

    const startPageTable = Math.max(1, currentPageTable - 1);
    const endPageTable = Math.min(totalPagesTable, startPageTable + maxPageButtons - 1);

    const startPageChart = Math.max(1, currentPageChart - 1);
    const endPageChart = Math.min(totalPagesChart, startPageChart + maxPageButtons - 1);

    return (
        <div className="min-h-screen flex bg-gray-100">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen} />
            <div className={`flex-1 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <Toast ref={toastRef} />
                <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Stock Level Monitoring</h2>

                <div className="bg-white shadow-lg rounded-lg p-8 mb-10 text-black">
                    <DataTable
                        value={paginatedItemsTable}
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


                    {/* Table Pagination */}
                    <div className="flex justify-center items-center mt-4 space-x-2">
                        <button
                            onClick={() => setCurrentPageTable(currentPageTable - 1)}
                            disabled={currentPageTable === 1}
                            className={`px-3 py-1 rounded-lg border ${currentPageTable === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        >
                            <HiOutlineArrowLeft className="text-xl" />
                        </button>
                        {Array.from({ length: endPageTable - startPageTable + 1 }, (_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPageTable(startPageTable + index)}
                                className={`px-3 py-1 rounded-lg border ${currentPageTable === startPageTable + index ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                            >
                                {startPageTable + index}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPageTable(currentPageTable + 1)}
                            disabled={currentPageTable === totalPagesTable}
                            className={`px-3 py-1 rounded-lg border ${currentPageTable === totalPagesTable ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        >
                            <HiOutlineArrowRight className="text-xl" />
                        </button>
                    </div>
                </div>

                <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">Stock Level Chart</h2>
                <div className="bg-white shadow-lg rounded-lg p-8 h-96">
                    <Bar data={chartData} options={chartOptions} />
                </div>

                {/* Chart Pagination */}
                <div className="flex justify-center items-center mt-4 space-x-2">
                    <button
                        onClick={() => setCurrentPageChart(currentPageChart - 1)}
                        disabled={currentPageChart === 1}
                        className={`px-3 py-1 rounded-lg border ${currentPageChart === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >
                        <HiOutlineArrowLeft className="text-xl" />
                    </button>
                    {Array.from({ length: endPageChart - startPageChart + 1 }, (_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentPageChart(startPageChart + index)}
                            className={`px-3 py-1 rounded-lg border ${currentPageChart === startPageChart + index ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                        >
                            {startPageChart + index}
                        </button>
                    ))}
                    <button
                        onClick={() => setCurrentPageChart(currentPageChart + 1)}
                        disabled={currentPageChart === totalPagesChart}
                        className={`px-3 py-1 rounded-lg border ${currentPageChart === totalPagesChart ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                    >
                        <HiOutlineArrowRight className="text-xl" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockMonitor;
