// utils/excelTemplateGenerator.js
import XLSX from 'xlsx';

/**
 * Generates a SkillRack data Excel template
 * Can be used in Node.js backend or frontend
 */
export const generateSkillRackTemplate = () => {
  const headers = [
    'Name',
    'University Regn Number',
    'Programs Solved',
    'Last Week',
    'Code Tests',
    'Code Tracks',
    'Code Tutor',
    'DC',
    'DT',
    'Aptitude Score',
    'Points',
    'Gold',
    'Silver',
    'Bronze',
    'SkillRack Rank'
  ];

  // Create worksheet with headers only
  const ws = XLSX.utils.aoa_to_sheet([headers]);

  // Set column widths
  ws['!cols'] = [
    { wch: 22 }, // Name
    { wch: 24 }, // University Regn Number
    { wch: 18 }, // Programs Solved
    { wch: 14 }, // Last Week
    { wch: 14 }, // Code Tests
    { wch: 14 }, // Code Tracks
    { wch: 14 }, // Code Tutor
    { wch: 10 }, // DC
    { wch: 10 }, // DT
    { wch: 16 }, // Aptitude Score
    { wch: 14 }, // Points
    { wch: 10 }, // Gold
    { wch: 10 }, // Silver
    { wch: 10 }, // Bronze
    { wch: 16 }  // SkillRack Rank
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SkillRack Data');

  return wb;
};

/**
 * Download template in browser
 */
export const downloadSkillRackTemplate = () => {
  const wb = generateSkillRackTemplate();
  XLSX.writeFile(wb, 'skillrack_template.xlsx');
};

/**
 * Generate template file in Node.js (for API endpoint)
 */
export const generateSkillRackTemplateFile = (filepath) => {
  const wb = generateSkillRackTemplate();
  XLSX.writeFile(wb, filepath);
  return filepath;
};

/**
 * Backend API endpoint to download template
 */
export const downloadTemplateEndpoint = async (req, res) => {
  try {
    const wb = generateSkillRackTemplate();
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=skillrack_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ message: 'Error generating template' });
  }
};


// ==============================================================
// Add this route to your Express app
// ==============================================================

// routes/skillRackRoutes.js (add this route)
/*
import { downloadTemplateEndpoint } from '../utils/excelTemplateGenerator.js';

router.get(
  "/download-template",
  authenticate,
  authorizeRoles("staff", "admin"),
  downloadTemplateEndpoint
);
*/
