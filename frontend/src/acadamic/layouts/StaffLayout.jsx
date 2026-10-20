import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../records/components/Sidebar";
import { useSidebar } from "../../records/contexts/SidebarContext";

const StaffLayout = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className={`${isCollapsed ? "ml-[70px]" : "ml-64"} flex-1 min-h-screen p-8 transition-all duration-300`}>
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default StaffLayout;
