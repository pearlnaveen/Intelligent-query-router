import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Mail } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "./AuthContext";
import API from "../../../api";

// Use direct public path for deployment stability
const loginImg = "/images/4583.jpg"; 

const InputField = ({ label, type = "text", value, onChange, placeholder, showPassword, setShowPassword }) => (
  <div className="space-y-1.5">
    <label className="text-[13px] font-bold text-gray-700">{label}</label>
    <div className="relative">
      <input
        type={type === "password" && showPassword ? "text" : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300 text-gray-700 bg-white shadow-sm"
      />
      {type === "password" && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  </div>
);

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, refresh, loading } = useAuth();
  const navigate = useNavigate();

  const handleRedirect = (role) => {
    if (!role) { toast.error("No role assigned."); return; }
    const r = role.toLowerCase().trim();
    if (r === "placementadmin") return navigate("/placement/admin-recruiters");
    if (r === "acadamicadmin") return navigate("/admin/dashboard");
    if (r.includes("admin")) return navigate("/records/admin");
    if (r === "student") return navigate("/records/student");
    if (r.includes("staff") || r.includes("faculty")) return navigate("/records/staff");
    navigate("/not-found");
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (!loading && user && (path === "/records/login" || path === "/login")) {
      handleRedirect(user.role);
    }
  }, [user, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await API.post("/auth/login", { identifier, password });
      const refreshedUser = await refresh();
      toast.success("Login Successful");
      if (refreshedUser?.role) handleRedirect(refreshedUser.role);
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
   <div className="min-h-screen flex items-center justify-center bg-[#f4f0ff] p-0 md:p-10">
      {/* Container */}
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-xl flex flex-col-reverse lg:flex-row overflow-hidden lg:min-h-[600px] pt-0">
        
        {/* Left Side: Form */}
        <div className="w-full lg:w-[45%] p-8 pt-4 pb-10 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="mb-8 text-left">
            <h1 className="text-4xl font-black text-gray-900 mb-2">Login</h1>
            <p className="text-sm text-gray-500 font-medium">
              Doesn't have an account yet? <span className="text-purple-600 font-bold cursor-pointer hover:underline">Sign Up</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <InputField
              label="Email Address"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
            />
            
            <div className="relative">
                <InputField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter 6 characters or more"
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                />
                <button type="button" className="absolute right-0 top-0 text-xs font-bold text-purple-600 hover:underline">
                    Forgot Password?
                </button>
            </div>

            <div className="flex items-center space-x-2">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <label htmlFor="remember" className="text-xs text-gray-500 font-bold cursor-pointer">Remember me</label>
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full bg-[#7c3aed] text-white py-4 rounded-xl font-black text-sm tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 disabled:opacity-70"
            >
              {isLoading ? "LOGGING IN..." : "LOGIN"}
            </button>

            <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold">or login with</span>
                <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <div className="flex justify-center">
                <div className="w-full flex justify-center scale-110">
                    <GoogleLogin
                        onSuccess={() => {}} 
                        onError={() => toast.error("Google login failed")}
                        theme="outline"
                        shape="pill"
                        width="250"
                    />
                </div>
            </div>
          </form>
        </div>

        {/* Right Side: Image - Removed pt-12 to eliminate the "white top bar" */}
        <div className="w-full lg:w-[55%] bg-white flex items-center justify-center p-0 md:p-12 lg:pr-16">
            <div className="relative w-full flex items-center justify-center">
                <img 
                    src={loginImg} 
                    alt="Illustration" 
                   className="w-full max-w-[300px] lg:max-w-none lg:w-[115%] h-auto object-contain transition-transform hover:scale-105 duration-500 block"
                    onError={(e) => {
                        e.target.src = "https://img.freepik.com/free-vector/login-concept-illustration_114360-739.jpg"; 
                    }}
                />
            </div>
        </div>

      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default Login;
