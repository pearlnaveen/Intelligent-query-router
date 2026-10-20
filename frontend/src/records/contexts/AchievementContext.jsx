import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../../api";
import { useAuth } from "../pages/auth/AuthContext";

const AchievementContext = createContext();

export const useAchievement = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error("useAchievement must be used within an AchievementProvider");
  }
  return context;
};

export const AchievementProvider = ({ children }) => {
  const [achievements, setAchievements] = useState([]);
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const UserId = user?.userId || user?.id;

  // Fetch all achievements
  const fetchAllAchievements = useCallback(async () => {
    setAchievements([]);
  }, []);

  // Fetch user-specific achievements
  const fetchUserAchievements = useCallback(async (targetUserId) => {
    setAchievements([]);
  }, []);

  // Fetch pending achievements (admin)
  const fetchPendingAchievements = useCallback(async () => {
    setPendingAchievements([]);
  }, []);

  // Add new achievement with file upload
  const addAchievement = async (formData) => {
    return { success: true };
  };

  // Update achievement
  const updateAchievement = async (achievementId, formData) => {
    return { success: true };
  };

  // Delete achievement
  const deleteAchievement = async (achievementId) => {
    return { success: true };
  };

  // Verify achievement (admin)
  const verifyAchievement = async (achievementId, status) => {
    return { success: true };
  };

  return (
    <AchievementContext.Provider
      value={{
        achievements,
        pendingAchievements,
        loading,
        error,
        fetchAllAchievements,
        fetchUserAchievements,
        fetchPendingAchievements,
        addAchievement,
        updateAchievement,
        deleteAchievement,
        verifyAchievement,
        clearError: () => setError(null)
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
};
