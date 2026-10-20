import React, { useState, useEffect, useCallback } from "react";
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaSpinner, FaBuilding } from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import API from "../../services/api";

const StudentPlacementInfo = () => {
  const { user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryUserId = queryParams.get("userId");
  const effectiveUserId = queryUserId || user?.userId || user?.id;

  const [loading, setLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Profile fields
  const [profile, setProfile] = useState({
    career_objective: "",
    specialization: "",
    dream_company: "",
    expected_ctc: "",
  });

  // Attended companies list
  const [attendedCompanies, setAttendedCompanies] = useState([]);

  // Form states for attended company adding/editing
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [currentCompany, setCurrentCompany] = useState({
    id: "",
    company_name: "",
    rounds_cleared: 0,
    status: "Ongoing",
  });

  // Fetch placement info
  const fetchPlacementData = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const response = await API.get("/placement-info", {
        params: { userId: effectiveUserId }
      });
      if (response.data && response.data.success) {
        setProfile({
          career_objective: response.data.placementInfo?.career_objective || "",
          specialization: response.data.placementInfo?.specialization || "",
          dream_company: response.data.placementInfo?.dream_company || "",
          expected_ctc: response.data.placementInfo?.expected_ctc || "",
        });
        setAttendedCompanies(response.data.attendedCompanies || []);
      }
    } catch (error) {
      console.error("Error fetching placement data:", error);
      toast.error("Failed to load placement information.");
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchPlacementData();
  }, [fetchPlacementData]);

  // Handle profile input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle profile save
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const response = await API.put("/placement-info", {
        ...profile,
        UserId: effectiveUserId
      });
      if (response.data && response.data.success) {
        toast.success("Placement profile updated successfully!");
      }
    } catch (error) {
      console.error("Error saving placement profile:", error);
      toast.error("Failed to save placement profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle attended company form changes
  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCurrentCompany((prev) => ({
      ...prev,
      [name]: name === "rounds_cleared" ? parseInt(value) || 0 : value,
    }));
  };

  // Open add company form
  const handleAddCompanyClick = () => {
    setCurrentCompany({
      id: "",
      company_name: "",
      rounds_cleared: 0,
      status: "Ongoing",
    });
    setIsEditingCompany(true);
  };

  // Open edit company form
  const handleEditCompanyClick = (company) => {
    setCurrentCompany(company);
    setIsEditingCompany(true);
  };

  // Save/Update attended company
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    if (!currentCompany.company_name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSavingCompany(true);
    try {
      if (currentCompany.id) {
        // Update
        const response = await API.put(`/placement-info/attended-company/${currentCompany.id}`, {
          ...currentCompany,
          UserId: effectiveUserId
        });
        if (response.data && response.data.success) {
          toast.success("Attended company updated successfully!");
          fetchPlacementData();
          setIsEditingCompany(false);
        }
      } else {
        // Create
        const response = await API.post("/placement-info/attended-company", {
          ...currentCompany,
          UserId: effectiveUserId
        });
        if (response.data && response.data.success) {
          toast.success("Attended company logged successfully!");
          fetchPlacementData();
          setIsEditingCompany(false);
        }
      }
    } catch (error) {
      console.error("Error saving attended company:", error);
      toast.error("Failed to save attended company record.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Delete attended company
  const handleDeleteCompany = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      const response = await API.delete(`/placement-info/attended-company/${id}`, {
        params: { userId: effectiveUserId }
      });
      if (response.data && response.data.success) {
        toast.success("Attended company record deleted!");
        fetchPlacementData();
      }
    } catch (error) {
      console.error("Error deleting attended company:", error);
      toast.error("Failed to delete attended company record.");
    }
  };

  if (loading && attendedCompanies.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-50 rounded-lg shadow-md w-full min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center bg-gradient-to-r from-indigo-600 to-indigo-600 bg-clip-text text-transparent">
        Placement Information
      </h2>

      {/* Main Placement Info Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full p-6 bg-white rounded-lg shadow-lg mb-8"
      >
        <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Placement Profile</h3>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Specialization</label>
              <input
                type="text"
                name="specialization"
                value={profile.specialization}
                onChange={handleProfileChange}
                placeholder="e.g. Web Development, Cloud"
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Dream Company</label>
              <input
                type="text"
                name="dream_company"
                value={profile.dream_company}
                onChange={handleProfileChange}
                placeholder="e.g. Google, Microsoft"
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Expected CTC</label>
              <input
                type="text"
                name="expected_ctc"
                value={profile.expected_ctc}
                onChange={handleProfileChange}
                placeholder="e.g. 12 LPA"
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Career Objective</label>
            <textarea
              name="career_objective"
              value={profile.career_objective}
              onChange={handleProfileChange}
              rows="4"
              placeholder="Describe your career goals and objective..."
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              {isSavingProfile ? (
                <>
                  <FaSpinner className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <FaCheck /> Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Attended Companies Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full p-6 bg-white rounded-lg shadow-lg"
      >
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-semibold text-gray-800">Attended Companies</h3>
          {!isEditingCompany && (
            <button
              onClick={handleAddCompanyClick}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <FaPlus /> Log Attended Company
            </button>
          )}
        </div>

        {/* inline Add/Edit Form */}
        {isEditingCompany && (
          <form onSubmit={handleCompanySubmit} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 space-y-4">
            <h4 className="font-semibold text-gray-700">{currentCompany.id ? "Edit Attended Company" : "Log New Company Attempt"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={currentCompany.company_name}
                  onChange={handleCompanyChange}
                  placeholder="Enter company name"
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Rounds Cleared</label>
                <input
                  type="number"
                  name="rounds_cleared"
                  value={currentCompany.rounds_cleared}
                  onChange={handleCompanyChange}
                  min="0"
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Status</label>
                <select
                  name="status"
                  value={currentCompany.status}
                  onChange={handleCompanyChange}
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Placed">Placed</option>
                  <option value="Not Placed">Not Placed</option>
                  <option value="Pipelined">Pipelined</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingCompany(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
              >
                <FaTimes /> Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCompany}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                {isSavingCompany ? (
                  <>
                    <FaSpinner className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <FaCheck /> Save Record
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Companies Table */}
        {attendedCompanies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No company attempts logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gradient-to-r from-indigo-600 to-indigo-600 text-white">
                <tr>
                  <th className="border border-gray-300 p-3 text-left">Company Name</th>
                  <th className="border border-gray-300 p-3 text-left">Rounds Cleared</th>
                  <th className="border border-gray-300 p-3 text-left">Status</th>
                  <th className="border border-gray-300 p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendedCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 transition">
                    <td className="border border-gray-300 p-3 flex items-center gap-2">
                      <FaBuilding className="text-gray-400" />
                      {company.company_name}
                    </td>
                    <td className="border border-gray-300 p-3">{company.rounds_cleared}</td>
                    <td className="border border-gray-300 p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          company.status === "Placed" ? "bg-green-100 text-green-800" :
                          company.status === "Not Placed" ? "bg-red-100 text-red-800" :
                          company.status === "Ongoing" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {company.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditCompanyClick(company)}
                          className="text-indigo-600 hover:text-indigo-700 transition"
                          title="Edit"
                        >
                          <FaEdit className="text-xl" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="text-red-500 hover:text-red-700 transition"
                          title="Delete"
                        >
                          <FaTrash className="text-xl" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentPlacementInfo;
