import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaKey, FaSave, FaUser, FaSpinner, FaImage, FaTimes, FaTachometerAlt, FaCamera } from "react-icons/fa";
import API from "../../api";
import config from "../../config";
import { useAuth } from "./auth/AuthContext";
import StudentBioData from "./Student/StudentBioData";
import PhotoCropModal from "../components/PhotoCropModal";

// Helper to convert base64 dataUrl to File
const dataURLtoFile = (dataurl, filename = "profile-photo.jpg") => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const MyProfile = () => {
  const { user: authUser, refresh } = useAuth();
  const [user, setUser] = useState({
    username: "",
    email: "",
    role: "",
    profileImage: "",
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [editImage, setEditImage] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [showBioData, setShowBioData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const backendUrl = config.backendUrl;
  const userId = authUser?.userId || authUser?.id || localStorage.getItem("userId");
  const navigate = useNavigate();

  // Helper to stringify role safely
  const getRoleString = (role) => {
    if (!role) return "";
    if (typeof role === "string") return role;
    if (typeof role === "object") return role.roleName || role.name || JSON.stringify(role);
    return String(role);
  };

  const formatImage = (img) => {
    if (!img) return `${backendUrl}/uploads/default.jpg`;
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    const cleanImg = img.startsWith("/") ? img : `/${img}`;
    return `${backendUrl}${cleanImg}`;
  };

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        if (!userId) {
          console.error("No userId found for profile fetch");
          setLoading(false);
          return;
        }

        const response = await API.get(`/get-user/${userId}`);

        if (response.data.success) {
          const userData = response.data.user;
          const roleStr = getRoleString(userData.role);

          setUser({
            username: userData.username || "",
            email: userData.email || "",
            role: roleStr,
            profileImage: formatImage(userData.profileImage),
          });
        } else {
          toast.error("Failed to fetch user details.");
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.");
          navigate("/records/login");
        } else {
          toast.error("Error fetching user details.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserDetails();
    } else {
      setLoading(false);
    }
  }, [userId, navigate, backendUrl]);

  // Handle image crop save
  const handlePhotoCropSave = (dataUrl) => {
    const file = dataURLtoFile(dataUrl, `profile_${userId || "user"}_${Date.now()}.jpg`);
    setNewImage(file);
    setPreviewImage(dataUrl);
    setEditImage(true);
    setShowCropModal(false);
  };

  const handleUpdateProfile = async () => {
    if (editPassword) {
      if (!newPassword || !confirmPassword) {
        toast.error("Please fill in both password fields!");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match!");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long!");
        return;
      }
    }

    const formData = new FormData();
    if (newImage) formData.append("image", newImage);
    if (editPassword && newPassword) formData.append("password", newPassword);

    try {
      setUpdating(true);
      const response = await API.put(`/update-profile/${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success("Profile updated successfully!");
        setEditImage(false);
        setEditPassword(false);
        setNewPassword("");
        setConfirmPassword("");
        setNewImage(null);
        setPreviewImage("");
        if (refresh) await refresh();
        if (response.data.profileImage) {
          setUser(prev => ({ ...prev, profileImage: formatImage(response.data.profileImage) }));
        }
      } else {
        toast.error(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-indigo-600">
          <FaSpinner className="animate-spin text-5xl mx-auto mb-4" />
          <p className="text-xl font-semibold">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Final safeguarding for role check
  const isStudent = user.role?.toLowerCase()?.includes("student");

  return (
    <div className="flex flex-col items-center py-10 px-4 w-full">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md text-center mb-8 border border-gray-100">

        <div className="relative w-32 h-32 mx-auto mb-4 group">
          <img
            src={previewImage || user.profileImage}
            alt="Profile"
            className="w-32 h-32 rounded-full mx-auto border-4 border-indigo-50 object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-300">
            <FaCamera size={22} className="mb-1" />
            <span className="text-[10px] font-semibold">Crop & Edit</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mb-6">
          <button
            type="button"
            className="flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-indigo-100 hover:shadow-sm cursor-pointer"
            onClick={() => setShowCropModal(true)}
          >
            <FaImage className="text-base" />
            <span>Change Profile Image</span>
          </button>
          <button
            className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border hover:shadow-sm ${editPassword
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
              }`}
            onClick={() => setEditPassword(!editPassword)}
          >
            <FaKey className="text-base" />
            <span>{editPassword ? "Close Password Form" : "Change Password"}</span>
          </button>
        </div>

        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{user.username || "User"}</h2>
          <p className="text-gray-500 font-medium">{user.email}</p>
          <div className="pt-2">
            <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block shadow-sm">
              {user.role || "MEMBER"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {isStudent ? (
            <button
              className={`flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl transition-all w-full font-bold text-white shadow-md transform active:scale-95 ${showBioData ? "bg-gray-800 hover:bg-gray-900" : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              onClick={() => setShowBioData(!showBioData)}
            >
              <FaUser className="text-white" />
              <span>{showBioData ? "Hide Details" : "Student BIO data"}</span>
            </button>
          ) : (
            <button
              className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl transition-all w-full font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md transform active:scale-95"
              onClick={() => {
                const roleLower = (user.role || "").toLowerCase();
                if (roleLower.includes("admin")) {
                  navigate("/records/admin");
                } else {
                  navigate("/records/staff");
                }
              }}
            >
              <FaTachometerAlt className="text-white" />
              <span>Go to dashboard</span>
            </button>
          )}
        </div>

        {editPassword && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-fadeIn space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">New Password</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                className="bg-white border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat password"
                className="bg-white border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        )}

        {(editImage || editPassword) && (
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => {
                setEditImage(false);
                setEditPassword(false);
                setPreviewImage("");
                setNewImage(null);
              }}
              className="flex-1 bg-gray-100 text-gray-600 font-bold px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              disabled={updating}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProfile}
              className="flex-1 bg-indigo-600 text-white font-bold px-4 py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer"
              disabled={updating}
            >
              {updating ? <FaSpinner className="animate-spin" /> : <FaSave />}
              <span>{updating ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Photo Crop Modal */}
      {showCropModal && (
        <PhotoCropModal
          title="Adjust Profile Photo"
          existingPhoto={previewImage || (user.profileImage && !user.profileImage.includes("via.placeholder.com") ? user.profileImage : null)}
          onSave={handlePhotoCropSave}
          onCancel={() => setShowCropModal(false)}
        />
      )}

      {showBioData && (
        <>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slideInRight {
              animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes fadeInBackdrop {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-fadeInBackdrop {
              animation: fadeInBackdrop 0.3s ease-out forwards;
            }
          `}</style>

          <div
            className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm animate-fadeInBackdrop"
            onClick={() => setShowBioData(false)}
          />

          <div className="fixed top-0 right-0 h-screen w-full sm:w-[90vw] lg:w-[85vw] xl:w-[80vw] bg-slate-50 shadow-[auto_auto_30px_rgba(0,0,0,0.5)] z-[100] animate-slideInRight flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 relative">
              <button
                onClick={() => setShowBioData(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white shadow-md border border-slate-200 p-3 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 z-[110] transition-all flex items-center justify-center"
                title="Close Details"
              >
                <FaTimes size={18} />
              </button>

              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 mt-16 sm:mt-0 relative">
                <StudentBioData />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MyProfile;
