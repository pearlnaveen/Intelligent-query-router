import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbService from '../services/dbService.js';
import contextService from '../services/contextService.js';
import { containsTamilText, preprocessTamilQuery, translateResponseToTamil } from '../services/translationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load precomputed knowledge base safely
const knowledgePath = path.resolve(__dirname, '../knowledge/knowledge_base.json');
let knowledgeBase = null;
function getKnowledgeBase() {
  if (!knowledgeBase || Object.keys(knowledgeBase).length === 0 || process.env.NODE_ENV === 'test') {
    try {
      knowledgeBase = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
    } catch (error) {
      console.error('Failed to load knowledge base. Generating default context...', error);
      knowledgeBase = {};
    }
  }
  return knowledgeBase;
}

/**
 * Common Tanglish marker words for language detection
 */
const TANGLISH_MARKERS = [
  'enga', 'engae', 'engga', 'epdi', 'eppadi', 'epadi', 'enna', 'ena',
  'irukku', 'iruku', 'irukka', 'yaaru', 'yaru', 'evlo', 'evalavu',
  'ethana', 'entha', 'pathi', 'patri', 'poganum', 'venum', 'venuma',
  'solunga', 'sollunga', 'vanakkam', 'vanakam', 'irukkangala', 'irukanga', 'panalaam',
  'irukaa', 'sollu', 'solluu', 'panna', 'solluga', 'sollungalen', 'peru',
  'kudunga', 'irunthu', 'solla', 'pesu', 'sol', 'velaivaaippu', 'velai',
  'katnam', 'kalvi', 'kalvithanthai', 'thavaggal'
];

/**
 * Rule-based Language Detector (English, Tamil, Tanglish, Explicit Language Requests)
 */
function detectLanguage(rawQuery) {
  if (!rawQuery) return 'en';

  const cleanQuery = rawQuery.toLowerCase();

  // 1. Explicit request for English
  if (/\b(in\s+english|english\s+version|in\s+english\s+language|explain\s+in\s+english|give\s+in\s+english)\b/.test(cleanQuery)) {
    return 'en';
  }

  // 2. Explicit request for Tamil (e.g. "tell me about nec in tamil", "in tamizh", "tamil version", "explain in tamil")
  if (/\b(in\s+tamil|in\s+tamizh|tamil\s+la|tamil\s+lo|tamil\s+version|tamil\s+text|in\s+tamil\s+language|tell\s+in\s+tamil|say\s+in\s+tamil|explain\s+in\s+tamil|give\s+in\s+tamil|tamil\s+medium|tamil\s+font|tamil\s+la\s+sollu|tamil\s+mode)\b/.test(cleanQuery)) {
    return 'ta';
  }

  // 3. Explicit Tamil Unicode characters
  if (/[\u0B80-\u0BFF]/.test(rawQuery)) return 'ta';

  // 4. Tanglish marker words
  const cleanWords = cleanQuery.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  if (cleanWords.some(w => TANGLISH_MARKERS.includes(w))) {
    return 'ta';
  }

  return 'en';
}

/**
 * Normalizes input text by removing punctuation and extra spaces while preserving Tamil characters
 */
function normalizeInput(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\blibry\b/g, 'library')
    .replace(/\bfunder\b/g, 'founder')
    .replace(/\badmision\b/g, 'admission')
    .replace(/\bplacment\b/g, 'placement')
    .replace(/\blocation\b|\blocated\b/g, 'location how_to_reach')
    .replace(/[?!.,;:]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Common English and Tanglish stop words to exclude from single keyword matching
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'who', 'what', 'where', 'when', 'why',
  'how', 'which', 'whom', 'whose', 'this', 'that', 'these', 'those', 'am',
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
  'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'now', 'you', 'your', 'me', 'my', 'we', 'our', 'tell', 'give',
  'know', 'want', 'please', 'sollu', 'solla', 'solunga', 'sollunga', 'pathu', 'pathi', 'patri'
]);

/**
 * Helper to calculate Levenshtein distance for fuzzy keyword matching
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a || !b) return (a || b).length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Priority Scoring Keyword Matcher for Knowledge Base Categories
 */
function findBestKnowledgeMatch(rawQuery, entities = {}) {
  const cleanedQuery = rawQuery.replace(/\b(in\s+tamil|in\s+tamizh|in\s+english|tamil\s+la|tamil\s+lo|in\s+tamil\s+language|in\s+english\s+language|tell\s+in\s+tamil|explain\s+in\s+tamil|give\s+in\s+tamil|tamil\s+version|tamil\s+mode)\b/gi, '');
  const translatedQuery = preprocessTamilQuery(cleanedQuery);
  const normQuery = normalizeInput(cleanedQuery);
  const normTransQuery = normalizeInput(translatedQuery);

  // Common domain filler words that should not trigger general single-word matches
  const DOMAIN_FILLERS = new Set(['nec', 'college', 'national', 'engineering', 'institution', 'campus', 'details', 'info', 'information', 'about', 'tell', 'give', 'show']);

  const words = Array.from(new Set([
    ...normQuery.split(/\s+/),
    ...normTransQuery.split(/\s+/)
  ])).filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const meaningfulWords = words.filter(w => !DOMAIN_FILLERS.has(w));

  let bestKey = null;
  let maxScore = 0;

  const kb = getKnowledgeBase();
  for (const [key, category] of Object.entries(kb)) {
    let score = 0;
    const allKeywords = [
      ...(category.keywords || []),
      ...(category.tamilKeywords || [])
    ];

    const matchedKwWords = new Set();

    for (const kw of allKeywords) {
      const normKw = normalizeInput(kw);
      if (!normKw) continue;

      if (normQuery === normKw || normTransQuery === normKw) {
        score += 100; // Exact match
      } else if (normKw.includes(' ') && (normQuery.includes(normKw) || normTransQuery.includes(normKw))) {
        score += 60; // Multi-word phrase match
      } else if (!normKw.includes(' ') && !STOP_WORDS.has(normKw) && !DOMAIN_FILLERS.has(normKw)) {
        for (const mWord of meaningfulWords) {
          if (mWord === normKw) {
            if (!matchedKwWords.has(normKw)) {
              matchedKwWords.add(normKw);
              score += 40; // Direct EXACT standalone keyword match
            }
          } else if (mWord.length > 3 && normKw.length > 3 && levenshtein(mWord, normKw) <= 2) {
            if (!matchedKwWords.has(normKw)) {
              matchedKwWords.add(normKw);
              score += 20; // Direct FUZZY standalone keyword match
            }
          }
        }
      } else {
        const kwWords = normKw.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w) && !DOMAIN_FILLERS.has(w));
        for (const kwWord of kwWords) {
          for (const mWord of meaningfulWords) {
            if (mWord === kwWord) {
              if (!matchedKwWords.has(kwWord)) {
                matchedKwWords.add(kwWord);
                score += 20; // Exact word overlap
              }
            } else if (mWord.length > 3 && kwWord.length > 3 && levenshtein(mWord, kwWord) <= 2) {
              if (!matchedKwWords.has(kwWord)) {
                matchedKwWords.add(kwWord);
                score += 10; // Fuzzy word overlap
              }
            }
          }
        }
      }
    }

    // Tie-breaker bonus if key or category title contains matched keywords
    for (const kwWord of matchedKwWords) {
      if (key.includes(kwWord) || (category.title && normalizeInput(category.title).includes(kwWord))) {
        score += 5;
      }
    }

    // Department-specific bonus when a department entity is explicitly detected
    if (entities && entities.department && key === `${entities.department.toLowerCase()}_department`) {
      score += 50;
    }

    // Penalty for general facilities categories when specific facility topic keywords are present
    if ((key === 'facilities' || key === 'other_facilities') && meaningfulWords.some(w => ['library', 'transport', 'hostel', 'canteen', 'sports', 'bus', 'food'].includes(w))) {
      score -= 40;
    }

    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    }
  }

  return { bestKey, score: maxScore };
}

/**
 * Custom Entity Extractor
 */
function extractEntities(text) {
  const normalized = text.toLowerCase();
  
  // 1. Department
  let department = null;
  if (normalized.match(/\b(cse|computer\s+science|கணினி|சிஎஸ்இ)\b/)) {
    department = 'CSE';
  } else if (normalized.match(/\b(it|information\s+technology|தகவல்\s+தொழில்நுட்பம்|ஐடி)\b/)) {
    department = 'IT';
  } else if (normalized.match(/\b(aids|ai\s*&\s*ds|artificial\s+intelligence|செயற்கை\s+நுண்ணறிவு|ஏஐடிஎஸ்)\b/)) {
    department = 'AIDS';
  } else if (normalized.match(/\b(ece|electronics|மின்னணுவியல்|ஈசிஈ)\b/)) {
    department = 'ECE';
  } else if (normalized.match(/\b(mech|mechanical|இயந்திரவியல்|மெக்கானிக்கல்)\b/)) {
    department = 'MECH';
  } else if (normalized.match(/\b(civil|சிவில்)\b/)) {
    department = 'CIVIL';
  } else if (normalized.match(/\b(eee|electrical|மின்\s+பொறியியல்|ஈஈஈ)\b/)) {
    department = 'EEE';
  } else if (normalized.match(/\b(s&h|science\s+and\s+humanities)\b/)) {
    department = 'SH';
  }

  // 2. Batch/Year
  let batch = null;
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    batch = yearMatch[1];
  }

  // 3. Company
  let company = null;
  const companies = ['zoho', 'tcs', 'accenture', 'cognizant', 'cts', 'wipro', 'infosys'];
  for (const c of companies) {
    if (normalized.includes(c)) {
      company = c === 'cts' ? 'Cognizant' : c.charAt(0).toUpperCase() + c.slice(1);
      if (company === 'Zoho') company = 'Zoho Corporation';
      break;
    }
  }

  // 4. Follow-up query detection
  const isFollowUp = !!normalized.match(/\b(what about|how about|and for|what of|what questions|questions asked|packages|difficulty|rounds|பற்றி|எப்படி)\b/);

  return { department, batch, company, isFollowUp };
}

/**
 * Direct Dynamic Intent Matching Rules (Privacy block, placement statistics, upcoming drives, interview feedback)
 */
function classifyDynamicIntent(rawQuery, entities) {
  const norm = normalizeInput(rawQuery);

  // 1. Privacy Violation Block
  const privacyKeywords = ['phone', 'email', 'mail', 'address', 'attendance', 'mark', 'marks', 'cgpa', 'gpa', 'password', 'credential', 'register', 'roll', 'personal'];
  const individualKeywords = ['student', 'staff', 'member', 'teacher', 'regno', 'user', 'profile'];
  
  if (privacyKeywords.some(kw => norm.includes(kw)) && individualKeywords.some(kw => norm.includes(kw))) {
    return 'privacy_violation';
  }

  // 2. Placement stats - Highest package
  if ((norm.includes('highest') || norm.includes('max') || norm.includes('அதிக') || norm.includes('உயர்ந்த')) && 
      (norm.includes('package') || norm.includes('salary') || norm.includes('சம்பளம்') || norm.includes('பேக்கேஜ்'))) {
    return 'placement_highest';
  }

  // 3. Placement stats - Average package
  if ((norm.includes('average') || norm.includes('avg') || norm.includes('சராசரி')) && 
      (norm.includes('package') || norm.includes('salary') || norm.includes('சம்பளம்') || norm.includes('பேக்கேஜ்'))) {
    return 'placement_average';
  }

  // 4. Placement stats - Placement percentage / rate
  if ((norm.includes('percentage') || norm.includes('rate') || norm.includes('சதவீதம்') || norm.includes('percent')) && 
      (norm.includes('placement') || norm.includes('placed') || norm.includes('வேலைவாய்ப்பு'))) {
    return 'placement_percentage';
  }

  // 5. Placement stats - How many students placed
  if ((norm.includes('how many') || norm.includes('count') || norm.includes('எத்தனை')) && 
      (norm.includes('placed') || norm.includes('recruited') || norm.includes('வேலை பெற்ற'))) {
    return 'placement_count';
  }

  // 6. Placement - recruiting companies list
  if (norm.includes('companies') || norm.includes('recruiter') || norm.includes('நிறுவனங்கள்')) {
    if (norm.includes('coming') || norm.includes('upcoming') || norm.includes('வரவிருக்கும்')) {
      return 'upcoming_drives';
    }
    if (norm.includes('placement') || norm.includes('drive') || norm.includes('visit') || norm.includes('visiting') || norm.includes('visited') || norm.includes('recruiting') || norm.includes('recruited') || norm.includes('வேலைவாய்ப்பு')) {
      return 'placement_companies';
    }
  }

  // 7. Upcoming Drives
  if (norm.includes('upcoming') || (norm.includes('coming') && norm.includes('placement'))) {
    return 'upcoming_drives';
  }

  // 8. Interview experience / feedback
  if (norm.includes('interview') || norm.includes('round') || norm.includes('difficulty') || (norm.includes('questions') && entities.company)) {
    return 'interview_feedback';
  }

  // 9. General placement query with batch/year or department filter
  if ((norm.includes('placement') || norm.includes('placements') || norm.includes('placed') || norm.includes('வேலைவாய்ப்பு') || norm.includes('ப்ளேஸ்மென்ட்') || norm.includes('பிளேஸ்மென்ட்')) &&
      (entities.batch || norm.includes('stat') || norm.includes('record') || norm.includes('report') || norm.includes('detail') || norm.includes('data'))) {
    return 'placement_percentage';
  }

  return null;
}

/**
 * Main Chat Query Handler
 */
export const handleChatQuery = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > 500) {
      return res.status(400).json({ success: false, error: 'Message is too long (maximum 500 characters)' });
    }

    // 1. Rule-based Language Detection (English vs Tamil/Tanglish)
    const userLang = detectLanguage(cleanMessage);

    // 2. Load context memory
    const sessionContext = contextService.getContext(sessionId);

    // 3. Extract Entities
    const entities = extractEntities(cleanMessage);

    // Merge entities with session memory
    const dept = entities.department || sessionContext.lastDepartment;
    const batch = entities.batch || sessionContext.lastBatch;
    const comp = entities.company || sessionContext.lastCompany;

    let reply = '';
    let sourceType = 'static';
    let intent = null;

    // 4. Check Dynamic Intents (Database queries for placements)
    let dynamicIntent = classifyDynamicIntent(cleanMessage, entities);

    // Follow-up query intent inheritance (e.g., "What about IT?" after placement query)
    if (!dynamicIntent && (entities.isFollowUp || (entities.department && sessionContext.lastIntent?.startsWith('placement_')))) {
      if (sessionContext.lastIntent && (sessionContext.lastIntent.startsWith('placement_') || sessionContext.lastIntent === 'upcoming_drives' || sessionContext.lastIntent === 'interview_feedback')) {
        dynamicIntent = sessionContext.lastIntent;
      }
    }

    if (dynamicIntent) {
      intent = dynamicIntent;
      switch (intent) {
        case 'privacy_violation': {
          sourceType = 'security';
          if (userLang === 'ta') {
            reply = "⚠️ **தனிநபர் தகவல் பாதுகாப்பு தடுக்கப்பட்டது**\nதேசிய பொறியியல் கல்லூரியின் பொது AI உதவியாளராக, மாணவர்களின் தனிப்பட்ட தகவல்கள், மதிப்பெண்கள், வருகைப்பதிவு அல்லது கடவுச்சொற்களை என்னால் வழங்க முடியாது. உங்கள் தனிப்பட்ட தகவல்களுக்கு தயவுசெய்து ERP போர்ட்டலில் லாக் இன் செய்யவும்.";
          } else {
            reply = "⚠️ **Privacy Access Blocked**\nAs a public assistant for National Engineering College, I am not allowed to retrieve personal student details, individual grades, attendance, credentials, phone numbers, or private records. If you are a student or staff member looking for your personal records, please log in to the authenticated ERP Portal.";
          }
          break;
        }

        case 'placement_percentage': {
          sourceType = 'database';
          const stats = dept ? await dbService.getDepartmentPlacementStatistics(dept, batch) : await dbService.getOverallPlacementStatistics(batch);
          if (userLang === 'ta') {
            reply = translateResponseToTamil('placement_percentage', '', { dept, batch, stats });
          } else {
            reply = `Here are the ${dept ? `placement statistics for the **${dept}** department` : 'overall placement statistics for NEC'} (Batch: **${batch}**):\n\n` +
                    `- **Placed Students**: ${stats.placedCount} unique students\n` +
                    `- **Participating Students**: ${stats.registeredCount} unique students\n` +
                    `- **Placement Rate (Participating)**: **${stats.percentParticipating}%**\n` +
                    `- **Total Intake**: ${stats.totalCount} active students\n` +
                    `- **Placement Rate (Total Intake)**: **${stats.percentTotal}%**`;
          }
          break;
        }

        case 'placement_highest': {
          sourceType = 'database';
          const highest = await dbService.getHighestPackage({ department: dept, batch: batch, company_name: comp });
          if (userLang === 'ta') {
            reply = translateResponseToTamil('placement_highest', '', { dept, batch, highest, comp });
          } else if (highest) {
            const deptText = dept ? `for the **${dept}** department` : 'overall';
            reply = `The highest salary package offered ${deptText} in the **${batch}** batch is **${highest.formattedPackage}**.\n\n` +
                    `**Placement details**:\n` +
                    highest.placements.map(p => `- Recruited by **${p.company}** for the role of **${p.role}** (${p.department} Department)`).join('\n');
          } else {
            reply = `I couldn't find any recorded placement packages matching your filters for Batch **${batch}**.`;
          }
          break;
        }

        case 'placement_average': {
          sourceType = 'database';
          const avg = await dbService.getAveragePackage({ department: dept, batch: batch });
          if (userLang === 'ta') {
            reply = translateResponseToTamil('placement_average', '', { dept, batch, avg });
          } else if (avg) {
            reply = `The average salary package offered ${dept ? `for the **${dept}** department` : 'overall'} for the **${batch}** batch is **${avg.formattedPackage}**.`;
          } else {
            reply = `I couldn't find any average package statistics for Batch **${batch}**.`;
          }
          break;
        }

        case 'placement_count': {
          sourceType = 'database';
          const stats = dept ? await dbService.getDepartmentPlacementStatistics(dept, batch) : await dbService.getOverallPlacementStatistics(batch);
          if (userLang === 'ta') {
            reply = translateResponseToTamil('placement_count', '', { dept, batch, stats });
          } else {
            reply = `In ${dept ? `the **${dept}** department` : 'all departments'} for the **${batch}** batch, a total of **${stats.placedCount}** unique students have been placed.`;
          }
          break;
        }

        case 'placement_companies': {
          sourceType = 'database';
          const companiesList = await dbService.getRecruitingCompanies({ department: dept, batch: batch });
          if (userLang === 'ta') {
            reply = translateResponseToTamil('placement_companies', '', { dept, batch, companiesList });
          } else if (companiesList.length > 0) {
            reply = `Here are the recruiting companies for the **${batch}** batch:\n\n` + companiesList.map(c => `- ${c}`).join('\n');
          } else {
            reply = `I couldn't find any recorded recruiting companies for Batch **${batch}**.`;
          }
          break;
        }

        case 'upcoming_drives': {
          sourceType = 'database';
          const drives = await dbService.getUpcomingDrives({ department: dept, batch: batch });
          if (userLang === 'ta') {
            reply = translateResponseToTamil('upcoming_drives', '', { dept, batch, drives });
          } else if (drives.length > 0) {
            reply = `Here are the upcoming placement drives at NEC (Batch: **${batch}**):\n\n` +
                    drives.map(d => `### ${d.company}\n- **Date**: ${d.date}\n- **Salary**: **${d.salary || 'Competitive'}**\n- **Roles**: ${d.roles || 'Engineer'}`).join('\n\n');
          } else {
            reply = `There are currently no upcoming placement drives scheduled for Batch **${batch}**.`;
          }
          break;
        }

        case 'interview_feedback': {
          sourceType = 'database';
          if (!comp) {
            reply = userLang === 'ta' ? 
              "எந்த நிறுவனத்தின் நேர்முகத்தேர்வு அனுபவத்தை மதிப்பாய்வு செய்ய விரும்புகிறீர்கள்? (எ.கா. \"Zoho நேர்முகத்தேர்வு பற்றி கூறவும்\")" :
              "Which company's interview experience would you like to review? (e.g. \"Tell me about Zoho interviews\")";
          } else {
            const feedback = await dbService.getCompanyInterviewFeedback(comp);
            if (userLang === 'ta') {
              reply = translateResponseToTamil('interview_feedback', '', { comp, feedback });
            } else if (feedback && feedback.experiences.length > 0) {
              reply = `## Interview Feedback for **${feedback.company}**\n\n` +
                      feedback.experiences.map((exp, idx) => `### Experience ${idx + 1}: ${exp.role}\n- **Difficulty**: **${exp.difficulty}**\n- **Rounds**: ${exp.roundsCount} rounds\n> ${exp.tips || 'Focus on Core Concepts'}`).join('\n\n');
            } else {
              reply = `I couldn't find any public interview experiences for **${comp}** in the database.`;
            }
          }
          break;
        }
      }
    }

    // 5. If not a dynamic intent, perform Priority Scoring Knowledge Base Matching
    if (!intent) {
      const { bestKey, score } = findBestKnowledgeMatch(cleanMessage, entities);

      if (bestKey && score >= 10) {
        let mapped = `${bestKey.replace(/_department$/, '_dept')}_info`;
        if (mapped === 'admissions_info') mapped = 'admission_info';
        if (mapped === 'vision_info' || mapped === 'mission_info') mapped = 'vision_mission_info';
        intent = mapped;
        const category = getKnowledgeBase()[bestKey];

        if (userLang === 'ta') {
          reply = category.tamilContent || translateResponseToTamil(bestKey, category.content);
        } else {
          reply = category.content;
        }
      }
    }

    // 6. Unknown Query Handling (Rule 16)
    if (!intent || !reply) {
      intent = 'default_fallback';
      if (userLang === 'ta') {
        reply = "மன்னிக்கவும். இந்த கேள்விக்கான தகவல் தற்போது எனது NEC அறிவுத் தரவுத்தளத்தில் இல்லை.\n\nநீங்கள் கீழ்கண்டவற்றைப் பற்றி கேட்கலாம்:\n• சேர்க்கை (Admissions)\n• படிப்புகள் (Courses)\n• துறைகள் (Departments)\n• வேலைவாய்ப்பு (Placements)\n• விடுதி (Hostel)\n• நூலகம் (Library)\n• போக்குவரத்து (Transport)\n• கட்டணம் (Fees)\n• உதவித்தொகை (Scholarships)\n• கல்லூரி வசதிகள் (Facilities)";
      } else {
        reply = "Sorry, I couldn't find that information in my NEC knowledge base.\n\nYou can ask about:\n• Admissions\n• Courses\n• Departments\n• Placements\n• Hostel\n• Library\n• Transport\n• Fees\n• Scholarships\n• Facilities";
      }
    }

    // Update session context
    contextService.updateContext(sessionId, {
      lastDepartment: dept,
      lastBatch: batch,
      lastCompany: comp,
      lastIntent: intent !== 'default_fallback' && intent !== 'privacy_violation' ? intent : sessionContext.lastIntent
    });

    return res.json({
      reply,
      sourceType,
      intent,
      language: userLang
    });

  } catch (error) {
    console.error('Chatbot Controller Error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your message.'
    });
  }
};
