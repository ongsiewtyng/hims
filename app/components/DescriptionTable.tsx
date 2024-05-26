import React from 'react';

interface ParsedDataItem {
    id: number;
    vendorName: string;
    description: string;
    uom: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    sst: number;
    totalAmount: number;
}

interface TableComponentProps {
    parsedData: ParsedDataItem[];
}

const DescriptionTable: React.FC<TableComponentProps> = ({ parsedData }) => {
    return (
        <div className="mt-8 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SST</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {parsedData.map((item: ParsedDataItem) => (
                    <tr key={item.id}>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">{item.id}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">{item.vendorName}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">{item.description}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">{item.uom}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">{item.qty}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">RM {item.unitPrice}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">RM {item.subtotal}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">RM {item.sst}</td>
                        <td className="text-gray-600 px-6 py-4 whitespace-nowrap">RM {item.totalAmount}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default DescriptionTable;
