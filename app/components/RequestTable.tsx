import React, { useEffect, useState } from 'react';
import {ref} from "@firebase/database";
import {database} from "../services/firebase";
import {onValue} from "firebase/database";
import {HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineSearch} from "react-icons/hi";
import Modal from "../components/requestModal";

interface Request {
    dateCreated: string;
    requester: string;
    picContact: string;
    department: string;
    entity: string;
    status: string;
    downloadLink: string | null;
}


const ProgressTracker = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const formatDate = (date: string) => {
        const options: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          year: 'numeric',
          minute: '2-digit',
          hour12: true
        };
        return new Date(date).toLocaleString('en-US', options);
      };

    const toTitleCase = (str: string): string => str
          .toLowerCase()
          .replace(/\b\w/g, char => char.toUpperCase());

    const statusColors = {
        Pending: '#f59e0b', // Yellow
        'admin approved': '#10b981', // Green
        'admin disapproved': '#ef4444', // Red
        'editing process': '#f97316', // Orange
        'send to vendor': '#3b82f6', // Blue
        'quotation received': '#9333ea', // Purple
        'request successfully': '#22c55e', // Light Green
    };

      // CSS for the blinking circle
    const circleStyles = (color: string) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        marginRight: '8px',
        animation: 'blink 1.3s infinite',
      });

    useEffect(() => {
        const requestsRef = ref(database, 'requests');
        onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedData = Object.keys(data).map(key => ({
                    dateCreated: formatDate(data[key].dateCreated),
                    requester: toTitleCase(data[key].sectionA['2'][5]),
                    picContact: data[key].sectionA['3'][5],
                    department: data[key].sectionA['4'][5],
                    entity: data[key].sectionA['5'][5],
                    status: data[key].status,
                    downloadLink: data[key].downloadLink || null,
                    excelData: data[key].excelData || [],
                    sectionA: data[key].sectionA || [],
                }));
                    setRequests(formattedData);
            } else {
                setRequests([]); // Handle case where there is no data
            }
        });
        }, []);

    const filteredRequests = requests.filter(request => {
        const query = searchQuery.toLowerCase();
        return (
            request.dateCreated.toLowerCase().includes(query) ||
            request.requester.toLowerCase().includes(query) ||
            request.picContact.toLowerCase().includes(query) ||
            request.department.toLowerCase().includes(query) ||
            request.entity.toLowerCase().includes(query) ||
            request.status.toLowerCase().includes(query)
        );
    });

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRequests = filteredRequests.slice(indexOfFirstRow, indexOfLastRow);

    const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };


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
          {filteredRequests.length > 0 ? (
              <>
              <table className="bg-white p-8 rounded-2xl shadow-2xl w-full">
                  <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Submission
                          Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Requester</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">PIC &
                          Contact Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Download</th>
                  </tr>
                  </thead>
                  <tbody>
                  {currentRequests.map((request, index) => (
                      <tr key={index} className="cursor-pointer" onClick={() => setSelectedRequest(request)}>
                          <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.dateCreated}</td>
                          <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.requester}</td>
                          <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.picContact}</td>
                          <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.department}</td>
                          <td
                              className="text-gray-600 px-6 py-4 whitespace-nowrap border"
                              style={{color: statusColors[request.status] || '#6b7280'}} // Default color if status not found
                          >
                              <span style={circleStyles(statusColors[request.status])}></span>
                              {request.status}
                          </td>
                          <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">
                            {request.downloadLink ? (
                              <a href={request.downloadLink} className="text-blue-500">Download</a>
                          ) : (
                          'N/A'
                          )}
                          </td>
                      </tr>
                  ))}
                  </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                  <div className="flex justify-center items-center mt-4">
                      <button
                          className="focus:outline-none"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                      >
                          <HiOutlineArrowLeft
                              className="text-gray-500 text-xl hover:text-gray-700 transition-colors"/>
                      </button>
                  <div className="flex space-x-2 mx-4">
                      {[...Array(totalPages)].map((_, index) => (
                          <div
                              key={index}
                              onClick={() => handlePageChange(index + 1)}className={`w-6 h-6 flex items-center justify-center cursor-pointer rounded-full transition-transform ${
                              currentPage === index + 1 ? 'bg-blue-500 text-white transform scale-125' : 'bg-gray-300 text-black'
                          }`}
                          >
                              {index + 1}
                          </div>
                      ))}
                      <button
                          className="focus:outline-none"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                      >
                          <HiOutlineArrowRight
                              className="text-gray-500 text-xl hover:text-gray-700 transition-colors"/>
                      </button>
                  </div>
              </div>
              )}

              {selectedRequest && (
                  <Modal
                      isOpen={!!selectedRequest}
                      onClose={() => setSelectedRequest(null)}
                      request={selectedRequest}
                  />
              )}
          </>
        ) : (
            <div className="text-center text-gray-500 mt-4">No requests at the moment</div>
        )}
    </div>
    );
};

export default ProgressTracker;
