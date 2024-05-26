'use client'
import RequestForm from '../components/RequestForm';
import Header from "@/app/components/Header";
import {useState} from "react";
import {database} from "../services/firebase";
import {get, ref} from "firebase/database";
import DescriptionTable from "../components/DescriptionTable";

type ParsedDataItem = {
    id: number;
    vendorName: string;
    description: string;
    uom: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    sst: number;
    totalAmount: number;
};

export default function ItemRequest() {
    // fields for form
    const [date, setDate] = useState('');
    const [project, setProject] = useState('');
    const [name, setName] = useState('');
    const [PIC, setPIC] = useState('');
    const [department, setDepartment] = useState('');
    const [campus, setCampus] = useState('');
    const [description, setDescription] = useState('');
    const [parsedData, setParsedData] = useState<ParsedDataItem[]>([]);

    async function getVendorName() {
        const vendorRef = ref(database, 'vendors/');
        const snapshot = await get(vendorRef);
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const vendorName = childSnapshot.val().name;
                console.log(vendorName);
            });
        } else {
            console.log('No vendors available');
        }
        return null; // Return a value to satisfy the type system
    }

    const uomMapping: { [key: string]: string } = {
        'nos': 'nos',
        'kg': 'kg',
        'pkt': 'pkt',
        'btl': 'btl',
        'pcs': 'pcs',
        // Add more mappings as needed
    };


    return (
        <div className="min-h-screen bg-gray-50">
            <Header/>
            <div className="bg-white min-h-screen flex flex-col items-center justify-center">
                <RequestForm onExcelDataChange={async (data) => {
                    // Assuming each row of the sheet contains a different field
                    setDate(data[15]);
                    setProject(data[21]);
                    setName(data[27]);
                    setPIC(data[33]);
                    setDepartment(data[39]);
                    setCampus(data[45]);
                    // Extract description from data[67] to data[229]
                    let description = '';
                    for (let i = 67; i <= 229; i++) {
                        if (data[i]) {
                            description += data[i] + ' ';
                        }
                    }
                    setDescription(description.trim()); // Remove extra spaces

                    // Create an array of objects for the parsed data
                    const parsedData = [];
                    // const vendorId = data[65] || '';
                    const vendorName = await getVendorName();
                    const uom = uomMapping[data[59]] || 'nos';
                    for (let i = 64 ; i < data.length; i+=7) {
                        parsedData.push({
                            id: parsedData.length + 1, // Assign a unique ID or use the index of the array
                            vendorName: data[i] || '', // Extract vendor name from data[65] or use default value ''
                            description: data[i + 1] || '', // Extract description from data[i]
                            uom: data[i + 2] || '', // Extract UOM from data[59] or use default value 'nos'
                            qty: parseFloat(data[i + 3]) || 0, // Extract Qty from data[60] or use default value 0
                            unitPrice: 0.00, // Extract Unit Price from data[61] or use default value 0.00
                            subtotal: 0.00, // Extract Subtotal from data[62] or use default value 0.00
                            sst: 0.00, // Extract SST from data[63] or use default value 0.00
                            totalAmount: 0.00 // Extract Total Amount from data[64] or use default value 0.00
                        });
                    }


                    // Set the parsed data array to state or pass it to the table component
                    setParsedData(parsedData);

                }} />
                <form className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col max-w-xl w-full mt-8">
                    <div className="rounded-lg bg-gray-100 p-4 mb-4">
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
                                Delivery Date:
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="date"
                                type="text"
                                value={date}
                                readOnly
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="project">
                                Project / Product / Services to be Purchased
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="project"
                                type="text"
                                value={project}
                                readOnly
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                                Requester
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="name"
                                type="text"
                                value={name}
                                readOnly
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="pic">
                                PIC Name & Contact Number
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="pic"
                                type="text"
                                value={PIC}
                                readOnly
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="department">
                                Department
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="department"
                                type="text"
                                value={department}
                                readOnly
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="campus">
                                Entity/Company/Campus
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="campus"
                                type="text"
                                value={campus}
                                readOnly
                            />
                        </div>
                    </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                                Description
                            </label>
                            <DescriptionTable parsedData={parsedData}/>
                        </div>
                </form>
            </div>
        </div>
);
}