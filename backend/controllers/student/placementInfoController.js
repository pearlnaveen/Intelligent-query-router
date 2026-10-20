import { StudentPlacementInfo, AttendedCompany, User, CompetencyCoding } from "../../models/index.js";

// Fetch placement info and attended companies list
export const getPlacementInfo = async (req, res) => {
  try {
    const userId = req.query.userId || req.query.UserId || req.user?.Userid || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    let placementInfo = await StudentPlacementInfo.findOne({
      where: { Userid: userId }
    });

    const competency = await CompetencyCoding.findOne({
      where: { Userid: userId }
    });

    let dreamCompany = "";
    if (competency?.career_objective_details) {
      let details = competency.career_objective_details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch(e) {}
      }
      if (typeof details === 'object' && details !== null) {
        const val = details[competency.career_objectives] || details['Placement - Core'] || details['Placement - Software'] || details['Placement'] || details['Software'] || details['Core'] || '';
        dreamCompany = typeof val === 'object' && val !== null ? (val.field || val.university || val.degree || val.business_type || '') : (val || '');
      }
    }

    // Create profile if not found, populated from CompetencyCoding
    if (!placementInfo) {
      placementInfo = await StudentPlacementInfo.create({
        Userid: userId,
        career_objective: competency?.career_objectives || "",
        specialization: competency?.specialization_chosen || "",
        dream_company: dreamCompany || "",
        expected_ctc: competency?.expected_ctc || ""
      });
    } else if (competency) {
      // Direct sync from Competency Coding if present
      let needsSave = false;
      if (competency.specialization_chosen && placementInfo.specialization !== competency.specialization_chosen) {
        placementInfo.specialization = competency.specialization_chosen;
        needsSave = true;
      }
      if (dreamCompany && placementInfo.dream_company !== dreamCompany) {
        placementInfo.dream_company = dreamCompany;
        needsSave = true;
      }
      if (competency.expected_ctc && placementInfo.expected_ctc !== competency.expected_ctc) {
        placementInfo.expected_ctc = competency.expected_ctc;
        needsSave = true;
      }
      if (competency.career_objectives && placementInfo.career_objective !== competency.career_objectives) {
        placementInfo.career_objective = competency.career_objectives;
        needsSave = true;
      }
      if (needsSave) {
        await placementInfo.save();
      }
    }

    const attendedCompanies = await AttendedCompany.findAll({
      where: { Userid: userId },
      order: [["created_at", "DESC"]]
    });

    res.status(200).json({
      success: true,
      placementInfo,
      attendedCompanies
    });
  } catch (error) {
    console.error("Error fetching placement info:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create/Update main placement profile
export const updatePlacementInfo = async (req, res) => {
  try {
    const userId = req.body?.UserId || req.body?.userId || req.user?.Userid || req.user?.userId;
    const { career_objective, specialization, dream_company, expected_ctc } = req.body;

    let placementInfo = await StudentPlacementInfo.findOne({
      where: { Userid: userId }
    });

    if (!placementInfo) {
      placementInfo = await StudentPlacementInfo.create({
        Userid: userId,
        career_objective,
        specialization,
        dream_company,
        expected_ctc
      });
    } else {
      await placementInfo.update({
        career_objective,
        specialization,
        dream_company,
        expected_ctc
      });
    }

    res.status(200).json({
      success: true,
      message: "Placement info updated successfully",
      placementInfo
    });
  } catch (error) {
    console.error("Error updating placement info:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Add an attended company record
export const addAttendedCompany = async (req, res) => {
  try {
    const userId = req.body?.UserId || req.body?.userId || req.user?.Userid || req.user?.userId;
    const { company_name, rounds_cleared, status } = req.body;

    if (!company_name) {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    const attendedCompany = await AttendedCompany.create({
      Userid: userId,
      company_name,
      rounds_cleared: rounds_cleared || 0,
      status: status || 'Ongoing'
    });

    res.status(201).json({
      success: true,
      message: "Attended company added successfully",
      attendedCompany
    });
  } catch (error) {
    console.error("Error adding attended company:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update an attended company record
export const updateAttendedCompany = async (req, res) => {
  try {
    const userId = req.body?.UserId || req.body?.userId || req.user?.Userid || req.user?.userId;
    const { id } = req.params;
    const { company_name, rounds_cleared, status } = req.body;

    const attendedCompany = await AttendedCompany.findOne({
      where: { id, Userid: userId }
    });

    if (!attendedCompany) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    await attendedCompany.update({
      company_name,
      rounds_cleared,
      status
    });

    res.status(200).json({
      success: true,
      message: "Attended company updated successfully",
      attendedCompany
    });
  } catch (error) {
    console.error("Error updating attended company:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete an attended company record
export const deleteAttendedCompany = async (req, res) => {
  try {
    const userId = req.query?.UserId || req.query?.userId || req.user?.Userid || req.user?.userId;
    const { id } = req.params;

    const attendedCompany = await AttendedCompany.findOne({
      where: { id, Userid: userId }
    });

    if (!attendedCompany) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    await attendedCompany.destroy();

    res.status(200).json({
      success: true,
      message: "Attended company deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting attended company:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

