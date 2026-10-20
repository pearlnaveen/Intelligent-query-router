import React, { useState, useEffect, useMemo } from "react";
import { useStaff } from "../../contexts/StaffContext";
import { useUser } from "../../contexts/UserContext";
import { FaSearch, FaUserTie, FaUndo, FaEye, FaFileExport } from "react-icons/fa";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5600/institute_management_system";

const getStaffDepartment = (staff, departments = []) => {
  if (!staff) return "N/A";

  const directAcr = staff.Deptacronym || staff.departmentAcr || (typeof staff.department === "string" ? staff.department : null);
  if (directAcr && directAcr !== "N/A" && directAcr !== "Staff") return directAcr;

  if (staff.department && typeof staff.department === "object") {
    const nestedAcr = staff.department.Deptacronym || staff.department.departmentAcr || staff.department.departmentName;
    if (nestedAcr && nestedAcr !== "N/A" && nestedAcr !== "Staff") return nestedAcr;
  }

  const staffDeptId = staff.departmentId ?? staff.Deptid;
  if (staffDeptId !== undefined && staffDeptId !== null && departments && departments.length > 0) {
    const matchedDept = departments.find(
      (dept) => String(dept.departmentId ?? dept.Deptid) === String(staffDeptId)
    );
    if (matchedDept) {
      const deptAcr = matchedDept.Deptacronym || matchedDept.departmentAcr || matchedDept.departmentName || matchedDept.Deptname;
      if (deptAcr && deptAcr !== "N/A") return deptAcr;
    }
  }

  if (staff.departmentName && staff.departmentName !== "N/A") return staff.departmentName;

  return "N/A";
};

function StaffList() {
  const { staffs, loading, departments } = useStaff();
  const { user } = useUser();
  const [filteredStaffs, setFilteredStaffs] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchStaffId, setSearchStaffId] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // Get user's department ID if logged in as Dept admin
  const userDeptId = user?.departmentId || user?.Deptid || null;

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(4);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(8);
      } else {
        setItemsPerPage(12);
      }
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);

    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  // Filter staff members based on user's department
  const baseStaffs = useMemo(() => {
    if (userDeptId !== null && userDeptId !== undefined) {
      const uDeptStr = String(userDeptId);
      return staffs.filter((staff) => String(staff.departmentId ?? staff.Deptid ?? "") === uDeptStr);
    }
    return staffs;
  }, [staffs, userDeptId]);

  // Auto-search / Live-search effect
  useEffect(() => {
    const sName = searchName.trim().toLowerCase();
    const sDept = searchDepartment.trim().toLowerCase();
    const sId = searchStaffId.trim().toLowerCase();

    const filtered = baseStaffs.filter((staff) => {
      const staffIdStr = String(staff.staffId ?? staff.id ?? "").toLowerCase();
      const nameStr = String(staff.username ?? staff.name ?? staff.fullName ?? "").toLowerCase();
      const deptStr = getStaffDepartment(staff, departments).toLowerCase();

      const staffIdMatch = !sId || staffIdStr.includes(sId);
      const nameMatch = !sName || nameStr.includes(sName);
      const departmentMatch = !sDept || deptStr.includes(sDept);

      return staffIdMatch && nameMatch && departmentMatch;
    });

    setFilteredStaffs(filtered);
    setCurrentPage(1);
  }, [searchName, searchDepartment, searchStaffId, baseStaffs, departments]);

  const handleSearch = () => {
    const sName = searchName.trim().toLowerCase();
    const sDept = searchDepartment.trim().toLowerCase();
    const sId = searchStaffId.trim().toLowerCase();

    const filtered = baseStaffs.filter((staff) => {
      const staffIdStr = String(staff.staffId ?? staff.id ?? "").toLowerCase();
      const nameStr = String(staff.username ?? staff.name ?? staff.fullName ?? "").toLowerCase();
      const deptStr = getStaffDepartment(staff, departments).toLowerCase();

      const staffIdMatch = !sId || staffIdStr.includes(sId);
      const nameMatch = !sName || nameStr.includes(sName);
      const departmentMatch = !sDept || deptStr.includes(sDept);

      return staffIdMatch && nameMatch && departmentMatch;
    });

    setFilteredStaffs(filtered);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchName("");
    setSearchDepartment("");
    setSearchStaffId("");
  };

  const handleView = (staff) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStaff(null);
  };

  const handleExportStaff = () => {
    try {
      if (!filteredStaffs || filteredStaffs.length === 0) {
        toast.info("No staff records to export");
        return;
      }

      const exportData = filteredStaffs.map((staff, index) => ({
        "S.No": index + 1,
        "Staff ID": staff.staffId || staff.id || "N/A",
        "Staff Name": staff.username || staff.name || "N/A",
        "Email": staff.email || "N/A",
        "Department": getStaffDepartment(staff, departments),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Staff List");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Staff_List_${dateStr}.xlsx`);
      toast.success("Staff list exported successfully!");
    } catch (error) {
      console.error("Error exporting staff data:", error);
      toast.error("Failed to export staff list");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStaffs.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredStaffs.length / itemsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-r from-indigo-50 to-indigo-50 p-6 ml-64 mt-16 flex flex-col overflow-hidden">
      {/* Search Section */}
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search by Staff ID"
            value={searchStaffId}
            onChange={(e) => setSearchStaffId(e.target.value)}
            className="p-2 border border-indigo-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <input
            type="text"
            placeholder="Search by name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="p-2 border border-indigo-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <input
            type="text"
            placeholder="Search by department"
            value={searchDepartment}
            onChange={(e) => setSearchDepartment(e.target.value)}
            className="p-2 border border-indigo-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <button
            onClick={handleSearch}
            className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-indigo-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
          >
            <FaSearch className="mr-1" /> Search
          </button>
          <button
            onClick={resetFilters}
            className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-indigo-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
          >
            <FaUndo className="mr-1" /> Reset
          </button>
          <button
            onClick={handleExportStaff}
            className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-500 text-white rounded-lg flex items-center justify-center hover:from-indigo-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm"
          >
            <FaFileExport className="mr-1" /> Export
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="mt-6 flex-1 overflow-hidden">
        <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="min-w-full">
              {filteredStaffs.length > 0 && (
                <thead className="bg-gradient-to-r from-indigo-500 to-indigo-500 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Image</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Staff ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length > 0 ? (
                  currentItems.map((staff, index) => {
                    const department = getStaffDepartment(staff, departments);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {staff.image ? (
                            <img
                              src={`${backendUrl}${staff.image}`}
                              alt={`${staff.username || "Unknown"}'s avatar`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <FaUserTie className="w-6 h-6 text-indigo-600" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.staffId || "N/A"}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.username || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {staff.email || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => handleView(staff)}
                            className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                          >
                            <FaEye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No staff members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-gray-50 py-4 px-6 border-t">
              <div className="flex justify-between">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Viewing Staff Details */}
      {isModalOpen && selectedStaff && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedStaff.username || "Unknown"}</h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col items-center">
              {selectedStaff.image ? (
                <img
                  src={selectedStaff.image}
                  alt={`${selectedStaff.username || "Unknown"}'s avatar`}
                  className="w-32 h-32 rounded-full object-cover mb-4"
                />
              ) : (
                <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <FaUserTie className="w-16 h-16 text-indigo-600" />
                </div>
              )}
              <div className="text-center">
                <p className="text-gray-600">Staff ID: {selectedStaff.staffId || "N/A"}</p>
                <p className="text-gray-600">Department: {getStaffDepartment(selectedStaff, departments)}</p>
                <p className="text-gray-600 mt-4">More details coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffList;
