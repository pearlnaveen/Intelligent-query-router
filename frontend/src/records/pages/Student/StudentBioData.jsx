import { getCareerObjectiveDescription, getCareerObjectiveLabel } from "../../utils/careerObjective";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronUp, User, Calendar, FileText, Award, Briefcase,
  GraduationCap, Users, Building, Code, Globe, Trophy, Laptop,
  Shield, BookOpen, AlertCircle, FileCheck, CheckCircle2, Clipboard,
  Heart, Landmark, HelpCircle, Activity, ExternalLink, Github
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import API from "../../services/api";
import config from "../../../config";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";

// Presentation-Ready Collapsible Section Component
const CollapsibleSection = ({ title, icon: Icon, count, isExpanded, onToggle, children }) => {
  return (
    <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-md hover:shadow-xl transition-all duration-300 mb-8 overflow-hidden">
      <div
        className="flex items-center justify-between p-5 sm:p-6 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 cursor-pointer hover:from-indigo-50/60 hover:to-indigo-50/40 transition-all border-b-2 border-slate-300 gap-4"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm shrink-0">
            <Icon size={24} className="stroke-[2.5]" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase break-words">{title}</h2>
          {count !== undefined && count !== null && (
            <span className="bg-indigo-600 text-white px-3.5 py-1 rounded-full text-base font-black shadow-xs shrink-0">
              {count}
            </span>
          )}
        </div>
        <div className="p-2 hover:bg-slate-200/70 rounded-xl transition-colors shrink-0">
          {isExpanded ? (
            <ChevronUp className="text-slate-700" size={26} />
          ) : (
            <ChevronDown className="text-slate-700" size={26} />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="p-6 sm:p-8 bg-white animate-fadeIn space-y-6">
          {children}
        </div>
      )}
    </div>
  );
};

const StudentBioData = ({ userId: propUserId = undefined }) => {
  const { userId: urlUserId } = useParams();
  const [user, setUser] = useState({
    username: "",
    email: "",
    role: "",
    profileImage: "",
  });
  const [student, setStudent] = useState(null);
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [education, setEducation] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [extracurricular, setExtracurricular] = useState([]);
  const [projects, setProjects] = useState([]);
  const [publications, setPublications] = useState([]);
  const [competencyRecord, setCompetencyRecord] = useState(null);
  const [competencyCoding, setCompetencyCoding] = useState([]);
  const [placementInfo, setPlacementInfo] = useState(null);
  const [attendedCompanies, setAttendedCompanies] = useState([]);
  const [skillrackStats, setSkillrackStats] = useState(null);
  const [nonCgpaRecords, setNonCgpaRecords] = useState([]);
  const [categoryCourses, setCategoryCourses] = useState([]);
  const [nptelSummary, setNptelSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Collapsible section states (Expanded by default for full presentation visibility)
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    education: true,
    placement: true,
    completedCourses: true,
    nptelDetails: true,
    courses: true,
    internships: true,
    projects: true,
    events: true,
    organizedEvents: true,
    publications: true,
    hackathons: true,
    skillrack: true,
    otherPlatforms: true,
    competency: true,
    extracurricular: true,
    noncgpa: true,
    scholarships: true,
    leaves: true,
    certifications: true,
  });

  const { user: authUser } = useAuth();
  const backendUrl = config.backendUrl;
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper to resolve document/certificate URLs safely without broken routes
  const resolveFileUrl = (filePath, defaultSubdir = "certificates") => {
    if (!filePath) return "";
    const cleanStr = String(filePath).trim().replace(/\\/g, "/");
    if (cleanStr.startsWith("http://") || cleanStr.startsWith("https://")) {
      return cleanStr;
    }
    const cleanBase = (backendUrl || "").replace(/\/+$/, "");
    const stripped = cleanStr.replace(/^\/+/, "");

    // If path already starts with uploads/ or Uploads/
    if (/^uploads\//i.test(stripped)) {
      return `${cleanBase}/${stripped}`;
    }

    // If path already starts with institute_management_system/
    if (stripped.startsWith("institute_management_system/")) {
      const origin = cleanBase.replace(/\/institute_management_system.*$/, "");
      return `${origin}/${stripped}`;
    }

    // Bare filename: prepend uploads/{defaultSubdir}/
    const filename = stripped.split("/").pop();
    if (defaultSubdir) {
      return `${cleanBase}/uploads/${defaultSubdir}/${filename}`;
    }
    return `${cleanBase}/uploads/${filename}`;
  };

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const effectiveUserId = propUserId || urlUserId || authUser?.userId || authUser?.id;

        if (!effectiveUserId) {
          setError("User ID not found.");
          setLoading(false);
          return;
        }

        // Helper to safely fetch data
        const safeFetch = (request, name = "unknown") =>
          request.then(res => {
            return res;
          }).catch(err => {
            console.error(`API error for ${name}:`, err.response?.config?.url, err.message);
            return { data: null };
          });

        // Helper to SAFELY extract an array from various typical API response structures
        const extractArray = (responseData) => {
          if (!responseData) return [];
          if (Array.isArray(responseData)) return responseData;

          if (typeof responseData === 'object') {
            const possibleKeys = ['data', 'events', 'records', 'certificates', 'projects', 'activities', 'enrollments', 'courses'];
            for (let key of possibleKeys) {
              if (Array.isArray(responseData[key])) {
                return responseData[key];
              }
            }
          }
          return [];
        };

        // Fetch student biodata
        const studentRes = await safeFetch(API.get(`/biodata/${effectiveUserId}`), "biodata");
        setStudent(studentRes.data);

        // Fetch user details
        const userRes = await safeFetch(API.get(`/auth/get-user/${effectiveUserId}`), "user_details");
        if (userRes.data && userRes.data.success) {
          setUser({
            username: userRes.data.user.username,
            email: userRes.data.user.email,
            role: userRes.data.user.role,
            profileImage: userRes.data.user.profileImage
              ? `${backendUrl}${userRes.data.user.profileImage}`
              : "https://via.placeholder.com/150",
          });
        }

        // Fetch events attended
        const eventsRes = await safeFetch(API.get(`/approved-events/${effectiveUserId}`), "events_attended");
        setEvents(extractArray(eventsRes.data));

        // Fetch courses
        const coursesRes = await safeFetch(API.get(`/user-courses/${effectiveUserId}`), "online_courses");
        setCourses(extractArray(coursesRes.data));

        // Fetch organized events
        const organizedRes = await safeFetch(API.get(`/approved-events-organized/${effectiveUserId}`), "events_organized");
        setOrganizedEvents(extractArray(organizedRes.data));

        // Fetch internships
        const internshipsRes = await safeFetch(API.get(`/approved-internships/${effectiveUserId}`), "internships");
        setInternships(extractArray(internshipsRes.data));

        // Fetch scholarships
        const scholarshipsRes = await safeFetch(API.get(`/fetch-scholarships/${effectiveUserId}`), "scholarships");
        setScholarships(extractArray(scholarshipsRes.data));

        // Fetch leaves
        const leavesRes = await safeFetch(API.get(`/fetch-leaves/${effectiveUserId}`), "leaves");
        setApprovedLeaves(extractArray(leavesRes.data));

        // Fetch certifications & uploaded certificates
        const studentCertRes = await safeFetch(
          API.get(`/student-certificate/list`, { params: { userId: effectiveUserId, UserId: effectiveUserId } }),
          "student_certificates"
        );
        const staffCertRes = await safeFetch(
          API.get(`/certifications/my-certificates`, { params: { userId: effectiveUserId, UserId: effectiveUserId } }),
          "certifications"
        );
        const studentCerts = extractArray(studentCertRes.data);
        const staffCerts = extractArray(staffCertRes.data);
        setCertifications([...studentCerts, ...staffCerts]);

        // Fetch hackathons
        const hackRes = await safeFetch(API.get(`/hackathon/my-events`, { params: { userId: effectiveUserId } }), "hackathons");
        setHackathons(extractArray(hackRes.data));

        // Fetch extracurricular records
        const extraRes = await safeFetch(API.get(`/extracurricular/my-activities`, { params: { userId: effectiveUserId } }), "extracurricular");
        setExtracurricular(extractArray(extraRes.data));

        // Fetch projects
        const projRes = await safeFetch(API.get(`/projects/my-projects`, { params: { userId: effectiveUserId } }), "projects");
        setProjects(extractArray(projRes.data));

        // Fetch publications
        const pubRes = await safeFetch(API.get(`/publications/my-publications`, { params: { UserId: effectiveUserId } }), "publications");
        setPublications(pubRes.data?.publications || extractArray(pubRes.data));

        // Fetch competency & coding
        const compRes = await safeFetch(API.get(`/competency-coding/my-record`, { params: { userId: effectiveUserId } }), "competency");
        if (compRes.data && compRes.data.success && compRes.data.competency) {
          setCompetencyRecord(compRes.data.competency);
          let platforms = compRes.data.competency.other_platforms || [];
          if (typeof platforms === 'string') {
            try {
              platforms = JSON.parse(platforms);
            } catch (e) {
              platforms = [];
            }
          }
          setCompetencyCoding(platforms);
        } else {
          setCompetencyRecord(null);
          setCompetencyCoding([]);
        }

        // Fetch placement info
        const placementRes = await safeFetch(API.get(`/placement-info`, { params: { userId: effectiveUserId } }), "placement_info");
        if (placementRes.data && placementRes.data.success) {
          setPlacementInfo(placementRes.data.placementInfo);
          setAttendedCompanies(placementRes.data.attendedCompanies || []);
        } else {
          setPlacementInfo(null);
          setAttendedCompanies([]);
        }

        // Fetch skillrack stats
        const srRes = await safeFetch(API.get(`/skillrack/my-stats`, { params: { userId: effectiveUserId } }), "skillrack_stats");
        const stats = srRes.data?.stats || null;
        if (stats && (stats.rank !== null || (stats.medals ?? 0) > 0 || (stats.totalPrograms ?? 0) > 0 || stats.levelDetails || stats.levelProgress)) {
          setSkillrackStats(stats);
        } else {
          try {
            const srRecRes = await safeFetch(API.get(`/skillrack/my-record`, { params: { userId: effectiveUserId } }), "skillrack_record");
            const rec = srRecRes.data?.data || null;
            if (rec) {
              setSkillrackStats(rec);
            } else {
              setSkillrackStats(stats || null);
            }
          } catch (srFallbackErr) {
            setSkillrackStats(stats || null);
          }
        }

        // Fetch Non-CGPA records
        const noncgpaRes = await safeFetch(API.get(`/noncgpa/my-records`, { params: { userId: effectiveUserId } }), "noncgpa");
        setNonCgpaRecords(extractArray(noncgpaRes.data));

        // Fetch education summary
        const eduRes = await safeFetch(
          API.get('/student-education/my-record', {
            params: {
              userId: effectiveUserId,
              regno: studentRes.data?.registerNumber,
            },
          }),
          "education"
        );
        setEducation(eduRes.data?.education || null);

        // Fetch category-wise completed courses
        const catCoursesRes = await safeFetch(
          API.get('/student/completed-courses-category', {
            params: {
              userId: effectiveUserId,
              regno: studentRes.data?.registerNumber
            }
          }),
          "category_completed_courses"
        );
        setCategoryCourses(extractArray(catCoursesRes.data));

        // Fetch NPTEL summary (completed count, transferred quota, course details)
        const nptelSummaryRes = await safeFetch(
          API.get('/student/nptel-summary', {
            params: {
              userId: effectiveUserId,
              regno: studentRes.data?.registerNumber
            }
          }),
          "nptel_summary"
        );
        setNptelSummary(nptelSummaryRes.data?.data || null);

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load student details.");
      } finally {
        setLoading(false);
      }
    };

    if (propUserId || urlUserId || authUser) {
      fetchAllData();
    }
  }, [urlUserId, propUserId, authUser, backendUrl]);

  // Unified SkillRack Data Normalizer
  const getNormalizedSkillRack = () => {
    if (!skillrackStats) return null;

    let rawLevelDetails = skillrackStats.levelDetails || skillrackStats.level_details || {};
    if (typeof rawLevelDetails === 'string') {
      try {
        rawLevelDetails = JSON.parse(rawLevelDetails);
      } catch (e) {
        rawLevelDetails = {};
      }
    }

    const cCount = Number(rawLevelDetails.level1?.c ?? skillrackStats.languageDistribution?.c ?? skillrackStats.c_programs ?? 0);
    const cppCount = Number(rawLevelDetails.level1?.cpp ?? skillrackStats.languageDistribution?.cpp ?? skillrackStats.cpp_programs ?? 0);
    const javaCount = Number(rawLevelDetails.level1?.java ?? skillrackStats.languageDistribution?.java ?? skillrackStats.java_programs ?? 0);
    const pythonCount = Number(rawLevelDetails.level1?.python ?? skillrackStats.languageDistribution?.python ?? skillrackStats.python_programs ?? 0);
    const mysqlCount = Number(rawLevelDetails.level1?.mysql ?? skillrackStats.languageDistribution?.sql ?? skillrackStats.sql_programs ?? 0);
    const dsCCount = Number(rawLevelDetails.level1?.ds_c ?? 0);
    const dsJavaCount = Number(rawLevelDetails.level1?.ds_java ?? 0);

    const kickstartCount = Number(rawLevelDetails.level2?.kickstart ?? skillrackStats.levelProgress?.level_2 ?? skillrackStats.level_2 ?? 0);

    const ctsCount = Number(rawLevelDetails.level3?.cts ?? 0);
    const infytqCount = Number(rawLevelDetails.level3?.infytq ?? 0);
    const otherMncsCount = Number(rawLevelDetails.level3?.other_mncs ?? skillrackStats.companyProgress?.mnc ?? skillrackStats.mnc_companies ?? 0);

    const stackCount = Number(rawLevelDetails.level4?.stack ?? 0);
    const heapCount = Number(rawLevelDetails.level4?.heap ?? 0);
    const queueCount = Number(rawLevelDetails.level4?.queue ?? 0);
    const binaryTreeCount = Number(rawLevelDetails.level4?.binary_tree ?? 0);
    const searchingCount = Number(rawLevelDetails.level4?.searching ?? 0);
    const sortingCount = Number(rawLevelDetails.level4?.sorting ?? 0);

    const productCount = Number(rawLevelDetails.level5?.product_companies ?? skillrackStats.companyProgress?.product ?? skillrackStats.product_companies ?? skillrackStats.levelProgress?.level_5 ?? skillrackStats.level_5 ?? 0);

    const miniProjectCount = Number(rawLevelDetails.level6?.mini_project ?? 0);
    const stringsCount = Number(rawLevelDetails.level6?.strings ?? 0);
    const greedyCount = Number(rawLevelDetails.level6?.greedy ?? 0);
    const combPermCount = Number(rawLevelDetails.level6?.comb_perm ?? 0);
    const backtrackingCount = Number(rawLevelDetails.level6?.backtracking ?? 0);
    const dpCount = Number(rawLevelDetails.level6?.dp ?? 0);
    const graphCount = Number(rawLevelDetails.level6?.graph ?? 0);
    const regexCount = Number(rawLevelDetails.level6?.regex ?? 0);

    const resolvedLevelDetails = {
      level1: { c: cCount, cpp: cppCount, java: javaCount, python: pythonCount, mysql: mysqlCount, ds_c: dsCCount, ds_java: dsJavaCount },
      level2: { kickstart: kickstartCount },
      level3: { cts: ctsCount, infytq: infytqCount, other_mncs: otherMncsCount },
      level4: { stack: stackCount, heap: heapCount, queue: queueCount, binary_tree: binaryTreeCount, searching: searchingCount, sorting: sortingCount },
      level5: { product_companies: productCount },
      level6: { mini_project: miniProjectCount, strings: stringsCount, greedy: greedyCount, comb_perm: combPermCount, backtracking: backtrackingCount, dp: dpCount, graph: graphCount, regex: regexCount },
    };

    const l1Sum = cCount + cppCount + javaCount + pythonCount + mysqlCount + dsCCount + dsJavaCount;
    const l2Sum = kickstartCount;
    const l3Sum = ctsCount + infytqCount + otherMncsCount;
    const l4Sum = stackCount + heapCount + queueCount + binaryTreeCount + searchingCount + sortingCount;
    const l5Sum = productCount;
    const l6Sum = miniProjectCount + stringsCount + greedyCount + combPermCount + backtrackingCount + dpCount + graphCount + regexCount;

    if ('levelProgress' in skillrackStats) {
      return {
        totalPrograms: skillrackStats.totalPrograms || (l1Sum + l2Sum + l3Sum + l4Sum + l5Sum + l6Sum) || 0,
        level_1: skillrackStats.levelProgress?.level_1 || l1Sum || 0,
        level_2: skillrackStats.levelProgress?.level_2 || l2Sum || 0,
        level_3: skillrackStats.levelProgress?.level_3 || l3Sum || 0,
        level_4: skillrackStats.levelProgress?.level_4 || l4Sum || 0,
        level_5: skillrackStats.levelProgress?.level_5 || l5Sum || 0,
        level_6: skillrackStats.levelProgress?.level_6 || l6Sum || 0,
        levelDetails: resolvedLevelDetails,
        codeTests: skillrackStats.testsAndTracks?.codeTests || 0,
        codeTracks: skillrackStats.testsAndTracks?.codeTracks || 0,
        codeTutorial: skillrackStats.testsAndTracks?.codeTutor || skillrackStats.testsAndTracks?.codeTutorial || 0,
        dailyChallenge: skillrackStats.testsAndTracks?.dc || skillrackStats.testsAndTracks?.dailyChallenge || 0,
        dailyTest: skillrackStats.testsAndTracks?.dt || skillrackStats.testsAndTracks?.dailyTest || 0,
        aptitudeTest: skillrackStats.aptitudeScore ?? skillrackStats.aptitude_score ?? skillrackStats.aptitude_test ?? 0,
        dataStructurePrograms: skillrackStats.dataStructurePrograms || (l4Sum + dsCCount + dsJavaCount) || 0,
        mncCompanies: skillrackStats.companyProgress?.mnc || l3Sum || 0,
        productCompanies: skillrackStats.companyProgress?.product || l5Sum || 0,
        dreamCompanies: skillrackStats.companyProgress?.dream || l6Sum || 0,
        cPrograms: cCount,
        cppPrograms: cppCount,
        javaPrograms: javaCount,
        pythonPrograms: pythonCount,
        sqlPrograms: mysqlCount,
        medals: skillrackStats.bronzeMedals ?? skillrackStats.medals ?? 0,
        goldMedals: skillrackStats.goldMedals ?? 0,
        silverMedals: skillrackStats.silverMedals ?? 0,
        bronzeMedals: skillrackStats.bronzeMedals ?? skillrackStats.medals ?? 0,
        points: skillrackStats.points || 0,
        rank: skillrackStats.rank || null,
        lastUpdated: skillrackStats.lastUpdated || null,
        profileUrl: skillrackStats.profileUrl || null,
      };
    }
    return {
      totalPrograms: skillrackStats.total_programs_solved || (l1Sum + l2Sum + l3Sum + l4Sum + l5Sum + l6Sum) || 0,
      level_1: skillrackStats.level_1 || l1Sum || 0,
      level_2: skillrackStats.level_2 || l2Sum || 0,
      level_3: skillrackStats.level_3 || l3Sum || 0,
      level_4: skillrackStats.level_4 || l4Sum || 0,
      level_5: skillrackStats.level_5 || l5Sum || 0,
      level_6: skillrackStats.level_6 || l6Sum || 0,
      levelDetails: resolvedLevelDetails,
      codeTests: skillrackStats.code_tests || 0,
      codeTracks: skillrackStats.code_tracks || 0,
      codeTutorial: skillrackStats.code_tutor || skillrackStats.code_tutorial || 0,
      dailyChallenge: skillrackStats.dc || skillrackStats.daily_challenge || 0,
      dailyTest: skillrackStats.dt || skillrackStats.daily_test || 0,
      aptitudeTest: skillrackStats.aptitude_score ?? skillrackStats.aptitude_test ?? 0,
      dataStructurePrograms: skillrackStats.data_structure_programs || (l4Sum + dsCCount + dsJavaCount) || 0,
      mncCompanies: skillrackStats.mnc_companies || l3Sum || 0,
      productCompanies: skillrackStats.product_companies || l5Sum || 0,
      dreamCompanies: skillrackStats.dream_product_companies || l6Sum || 0,
      cPrograms: cCount,
      cppPrograms: cppCount,
      javaPrograms: javaCount,
      pythonPrograms: pythonCount,
      sqlPrograms: mysqlCount,
      medals: skillrackStats.bronze_medals || 0,
      goldMedals: skillrackStats.gold_medals || 0,
      silverMedals: skillrackStats.silver_medals || 0,
      bronzeMedals: skillrackStats.bronze_medals || 0,
      points: skillrackStats.points || 0,
      rank: skillrackStats.skillrack_rank || null,
      lastUpdated: skillrackStats.last_updated || null,
      profileUrl: skillrackStats.profile_url || skillrackStats.profile || null,
    };
  };

  const skillRackNormalized = getNormalizedSkillRack();

  // OEC & PEC Elective Progress calculation
  const nptelCourses = Array.isArray(nptelSummary?.courses) ? nptelSummary.courses : [];

  let oecNptelCredits = 0;
  let oecNptelCount = 0;
  let pecNptelCredits = 0;
  let pecNptelCount = 0;

  nptelCourses.forEach((c) => {
    const isTransferred = c.studentStatus === 'accepted' || c.transferStatus === 'accepted';
    const credits = Number(c.credits) || 0;
    if (isTransferred) {
      if (c.creditType === 'OEC') {
        oecNptelCredits += credits;
        oecNptelCount += 1;
      } else if (c.creditType === 'PEC') {
        pecNptelCredits += credits;
        pecNptelCount += 1;
      }
    }
  });

  // OEC credits
  const oecTransferredCredits = Number(nptelSummary?.oec?.nptelTransferredCredits ?? oecNptelCredits);
  const oecCollegeCredits = Number(nptelSummary?.oec?.collegeCredits ?? 0);
  const oecTotalCompletedCredits = Number(nptelSummary?.oec?.completedCredits ?? (oecTransferredCredits + oecCollegeCredits));
  const oecMaxCredits = Number(nptelSummary?.oec?.maxCredits ?? 9);
  const oecRemainingCredits = Math.max(0, oecMaxCredits - oecTotalCompletedCredits);
  const oecTransferredCount = Number(nptelSummary?.oec?.nptelCount ?? oecNptelCount);
  const oecCollegeCount = Number(nptelSummary?.oec?.collegeCount ?? 0);

  // PEC credits
  const pecTransferredCredits = Number(nptelSummary?.pec?.nptelTransferredCredits ?? pecNptelCredits);
  const pecCollegeCredits = Number(nptelSummary?.pec?.collegeCredits ?? 0);
  const pecTotalCompletedCredits = Number(nptelSummary?.pec?.completedCredits ?? (pecTransferredCredits + pecCollegeCredits));
  const pecMaxCredits = Number(nptelSummary?.pec?.maxCredits ?? 18);
  const pecRemainingCredits = Math.max(0, pecMaxCredits - pecTotalCompletedCredits);
  const pecTransferredCount = Number(nptelSummary?.pec?.nptelCount ?? pecNptelCount);
  const pecCollegeCount = Number(nptelSummary?.pec?.collegeCount ?? 0);

  // Calculate 12th cutoff (Maths + Physics/2 + Chemistry/2 out of 200)
  const calculateTwelfthCutoff = (edu) => {
    if (!edu) return null;
    if (edu.twelfth_cutoff !== undefined && edu.twelfth_cutoff !== null && edu.twelfth_cutoff !== "") {
      const val = parseFloat(edu.twelfth_cutoff);
      if (!isNaN(val) && val > 0) return val % 1 === 0 ? val.toString() : val.toFixed(2);
    }
    const physics = parseFloat(edu.twelfth_physics_marks);
    const chemistry = parseFloat(edu.twelfth_chemistry_marks);
    const maths = parseFloat(edu.twelfth_maths_marks);
    if (!isNaN(physics) && !isNaN(chemistry) && !isNaN(maths)) {
      const cutoff = maths + physics / 2 + chemistry / 2;
      return cutoff % 1 === 0 ? cutoff.toString() : cutoff.toFixed(2);
    }
    if (edu.twelfth_percentage) {
      const pct = parseFloat(edu.twelfth_percentage);
      if (!isNaN(pct) && pct > 0) return (pct * 2).toFixed(2);
    }
    return null;
  };

  const twelfthCutoff = calculateTwelfthCutoff(education);

  // Helper to normalize and build valid external profile URLs
  const normalizeProfileUrl = (type, val) => {
    if (!val || typeof val !== 'string' || !val.trim()) return null;
    const trimmed = val.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.includes('github.com') || trimmed.includes('leetcode.com') || trimmed.includes('skillrack.com') || trimmed.includes('.')) {
      return `https://${trimmed}`;
    }
    if (type === 'github') {
      return `https://github.com/${trimmed}`;
    }
    if (type === 'leetcode') {
      return `https://leetcode.com/u/${trimmed}`;
    }
    if (type === 'skillrack') {
      return `https://www.skillrack.com/profile/${trimmed}`;
    }
    return `https://${trimmed}`;
  };

  // Find fallback from competencyCoding other_platforms if needed
  const findOtherPlatform = (platformName) => {
    if (!Array.isArray(competencyCoding)) return null;
    const match = competencyCoding.find(
      (p) => p?.platform_name?.toLowerCase()?.includes(platformName.toLowerCase())
    );
    return match?.profile_url || match?.description || null;
  };

  const githubRaw = student?.githubProfile || student?.github || findOtherPlatform('github');
  const githubLink = normalizeProfileUrl('github', githubRaw);

  const leetcodeRaw = student?.leetcodeProfile || student?.leetcode || findOtherPlatform('leetcode');
  const leetcodeLink = normalizeProfileUrl('leetcode', leetcodeRaw);

  const skillrackRaw = student?.skillrackProfile || student?.skillrack || skillRackNormalized?.profileUrl || skillrackStats?.profileUrl || findOtherPlatform('skillrack');
  const skillrackLink = normalizeProfileUrl('skillrack', skillrackRaw);

  const portfolioRaw = student?.portfolioProfile || student?.portfolio || findOtherPlatform('portfolio');
  const portfolioLink = normalizeProfileUrl('portfolio', portfolioRaw);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-700 text-lg font-bold">Loading comprehensive student profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl border-2 border-red-200 shadow-xl max-w-md w-full text-center">
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl inline-block mb-4">
            <AlertCircle size={36} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Error Loading Profile</h3>
          <p className="text-slate-600 text-base mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-md">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-4 sm:py-6 px-2 sm:px-4 lg:px-6" style={{ zoom: '80%' }}>
      <div className="w-full max-w-[1700px] mx-auto space-y-8">

        {/* ========================================================
            PREMIUM HEADER CARD (PRESENTATION-READY BANNER)
        ======================================================== */}
        <div className="bg-white rounded-3xl shadow-lg border-2 border-slate-300 overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Student Big Photo */}
            <div className="relative shrink-0">
              <img
                src={user.profileImage}
                alt="Student Profile"
                className="w-52 h-52 sm:w-60 sm:h-60 md:w-64 md:h-64 rounded-3xl border-4 border-slate-100 object-cover shadow-xl ring-4 ring-indigo-500/20 bg-white"
              />
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl shadow-lg border-2 border-white">
                <User size={24} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Student Info & Meta Details - Vertically Centered Relative to Photo */}
            <div className="flex-1 flex flex-col justify-center min-w-0 w-full space-y-3.5 text-left self-center">
              {/* Top Row: Name and Back Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 text-left">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight break-words">
                    {user.username || 'Student Name'}
                  </h1>
                  <p className="text-xl sm:text-2xl font-extrabold text-indigo-700 mt-1.5 break-words">
                    {student?.department?.departmentName || 'Department of Computer Science and Engineering'}
                  </p>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="shrink-0 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-slate-900 text-white font-black text-base sm:text-lg px-6 sm:px-8 py-3.5 rounded-2xl transition duration-200 shadow-md hover:shadow-lg"
                >
                  <span>Back to Profile</span>
                </button>
              </div>

              {/* Metadata Details (Batch, Reg No, Semester) with Large Clean Typography Strictly Next to Photo */}
              <div className="flex flex-wrap items-center justify-start gap-x-6 sm:gap-x-8 gap-y-3 pt-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-extrabold uppercase text-base sm:text-lg tracking-wider">Batch:</span>
                  <span className="text-slate-900 font-black text-xl sm:text-2xl">{student?.batch || 'N/A'}</span>
                </div>
                <div className="hidden md:block text-slate-300 font-light text-3xl">|</div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-extrabold uppercase text-base sm:text-lg tracking-wider">Reg No:</span>
                  <span className="text-indigo-900 font-black text-xl sm:text-2xl">{student?.registerNumber || 'N/A'}</span>
                </div>
                <div className="hidden md:block text-slate-300 font-light text-3xl">|</div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-extrabold uppercase text-base sm:text-lg tracking-wider">Semester:</span>
                  <span className="text-slate-900 font-black text-xl sm:text-2xl">{student?.semester || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coding & Portfolio Profiles Quick Bar */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-base font-black uppercase tracking-wider text-slate-800">Profiles:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* GitHub */}
              {githubLink ? (
                <a
                  href={githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center space-x-2.5 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-base font-bold shadow-sm transition-all duration-200 hover:scale-105"
                  title={`Open GitHub (${githubRaw})`}
                >
                  <Github size={18} className="group-hover:rotate-12 transition-transform" />
                  <span>GitHub</span>
                  <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-400 text-base font-bold border-2 border-slate-200 cursor-default">
                  <Github size={16} className="opacity-50" />
                  <span>GitHub: N/A</span>
                </span>
              )}

              {/* LeetCode */}
              {leetcodeLink ? (
                <a
                  href={leetcodeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center space-x-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-base font-bold shadow-sm transition-all duration-200 hover:scale-105"
                  title={`Open LeetCode (${leetcodeRaw})`}
                >
                  <Code size={18} className="group-hover:rotate-12 transition-transform" />
                  <span>LeetCode</span>
                  <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-400 text-base font-bold border-2 border-slate-200 cursor-default">
                  <Code size={16} className="opacity-50" />
                  <span>LeetCode: N/A</span>
                </span>
              )}

              {/* SkillRack */}
              {skillrackLink ? (
                <a
                  href={skillrackLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center space-x-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-base font-bold shadow-sm transition-all duration-200 hover:scale-105"
                  title={`Open SkillRack (${skillrackRaw})`}
                >
                  <Laptop size={18} className="group-hover:rotate-12 transition-transform" />
                  <span>SkillRack</span>
                  <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-400 text-base font-bold border-2 border-slate-200 cursor-default">
                  <Laptop size={16} className="opacity-50" />
                  <span>SkillRack: N/A</span>
                </span>
              )}

              {/* Portfolio */}
              {portfolioLink ? (
                <a
                  href={portfolioLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center space-x-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-base font-bold shadow-sm transition-all duration-200 hover:scale-105"
                  title={`Open Portfolio (${portfolioRaw})`}
                >
                  <Globe size={18} className="group-hover:rotate-12 transition-transform" />
                  <span>Portfolio</span>
                  <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-slate-100 text-slate-400 text-base font-bold border-2 border-slate-200 cursor-default">
                  <Globe size={16} className="opacity-50" />
                  <span>Portfolio: N/A</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            1. PERSONAL DETAILS
        ======================================================== */}
        <CollapsibleSection
          title="Personal Details"
          icon={User}
          isExpanded={expandedSections.personal}
          onToggle={() => toggleSection('personal')}
        >
          <div className="space-y-8">
            {/* Core Information Section with Distinct Column Separations */}
            <div>
              <div className="flex items-center justify-center space-x-2.5 mb-6 pb-3 border-b-2 border-slate-200 text-center">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase text-center">Core Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[
                  { label: "Register Number", value: student?.registerNumber },
                  { label: "Batch", value: student?.batch },
                  { label: "Department", value: student?.department?.departmentName },
                  { label: "Course", value: student?.course || "BE" },
                  { label: "Semester", value: student?.semester },
                  { label: "Section", value: student?.section },
                  { label: "Tutor Advisor", value: student?.staffAdvisor?.username },
                  { label: "Date of Birth", value: student?.date_of_birth ? student.date_of_birth.split("T")[0] : null },
                  { label: "Personal Email", value: student?.personal_email },
                  { label: "Phone Number", value: student?.personal_phone },
                  { label: "Blood Group", value: student?.blood_group },
                  { label: "Gender", value: student?.gender },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-50/80 border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/25 p-6 sm:p-7 rounded-2xl transition-all duration-200 shadow-xs flex flex-col items-center justify-center text-center min-h-[125px]"
                  >
                    <p className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider text-center">{item.label}</p>
                    <p className="text-lg sm:text-xl font-black text-slate-900 mt-2.5 break-words leading-tight text-center">{item.value || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>



            {/* Family Details Table with Visible Column Separation */}
            <div>
              <div className="flex items-center justify-center space-x-2.5 mb-6 pb-3 border-b-2 border-slate-200 text-center">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase text-center">Family Details</h3>
              </div>
              {student?.studentUser?.relationDetails?.length > 0 ? (
                <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
                  <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '900px', tableLayout: 'auto' }}>
                    <thead className="bg-slate-100/90">
                      <tr className="divide-x-2 divide-slate-300">
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[130px]">Relationship</th>
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[160px]">Name</th>
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[70px]">Age</th>
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[160px]">Occupation</th>
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[130px]">Annual Income</th>
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[130px]">Phone</th>
                        <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {student.studentUser.relationDetails.map((relation, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{relation.relationship || '-'}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{relation.relation_name || '-'}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{relation.relation_age || '-'}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{relation.relation_occupation || '-'}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">₹{relation.relation_income ? Number(relation.relation_income).toLocaleString('en-IN') : '0'}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{relation.relation_phone || '-'}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{relation.relation_email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                  <p className="text-slate-500 text-lg font-medium italic">No family details available.</p>
                </div>
              )}
            </div>

            {/* Bank Details with Distinct Column Separation */}
            <div>
              <div className="flex items-center justify-center space-x-2.5 mb-6 pb-3 border-b-2 border-slate-200 text-center">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase text-center">Bank Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: "Bank Name", value: student?.studentUser?.bankDetails?.bank_name, icon: Landmark },
                  { label: "Branch Name", value: student?.studentUser?.bankDetails?.branch_name, icon: Landmark },
                  { label: "Account Number", value: student?.studentUser?.bankDetails?.account_no, icon: FileText },
                  { label: "IFSC Code", value: student?.studentUser?.bankDetails?.ifsc_code, icon: Award },
                ].map((item, index) => (
                  <div key={index} className="flex flex-col items-center justify-center text-center bg-slate-50/80 border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/25 p-6 sm:p-7 rounded-2xl transition-all duration-200 shadow-xs min-w-0 min-h-[135px]">
                    <div className="p-3.5 bg-indigo-100 text-indigo-700 rounded-2xl mb-2 flex items-center justify-center">
                      <item.icon size={26} />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col items-center justify-center text-center">
                      <p className="text-sm sm:text-base font-black text-[#191970] uppercase tracking-wider text-center">{item.label}</p>
                      <p className="text-slate-900 font-black text-lg sm:text-xl mt-1.5 break-words leading-tight text-center">{item.value || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ========================================================
            2. EDUCATION DETAILS
        ======================================================== */}
        <CollapsibleSection
          title="Education Details"
          icon={GraduationCap}
          isExpanded={expandedSections.education}
          onToggle={() => toggleSection('education')}
        >
          <div className="space-y-8">

            {/* Academic summary cards with Prominent Presentation Borders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/70 border-2 border-indigo-300 text-indigo-950 p-6 rounded-3xl shadow-sm text-center">
                <p className="text-sm font-black tracking-wider uppercase text-[#191970]">CGPA</p>
                <p className="text-3xl font-black mt-2 text-indigo-950">
                  {education && education.cgpa !== null && education.cgpa !== undefined ? Number(education.cgpa).toFixed(2) : 'N/A'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/70 border-2 border-violet-300 text-violet-950 p-6 rounded-3xl shadow-sm text-center">
                <p className="text-sm font-black tracking-wider uppercase text-[#191970]">10th Percentage</p>
                <p className="text-3xl font-black mt-2 text-violet-950">
                  {education && education.tenth_percentage !== null && education.tenth_percentage !== undefined ? `${Number(education.tenth_percentage).toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100/70 border-2 border-pink-300 text-pink-950 p-6 rounded-3xl shadow-sm text-center">
                <p className="text-sm font-black tracking-wider uppercase text-[#191970]">12th Percentage</p>
                <p className="text-3xl font-black mt-2 text-pink-950">
                  {education && education.twelfth_percentage !== null && education.twelfth_percentage !== undefined ? `${Number(education.twelfth_percentage).toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/70 border-2 border-emerald-300 text-emerald-950 p-6 rounded-3xl shadow-sm text-center">
                <p className="text-sm font-black tracking-wider uppercase text-[#191970]">12th Cutoff</p>
                <p className="text-3xl font-black mt-2 text-emerald-950">
                  {twelfthCutoff || 'N/A'}
                </p>
                <span className="text-xs font-bold text-emerald-700 block mt-1 uppercase">out of 200</span>
              </div>
            </div>

            {/* School details grid (10th & 12th) with Distinct Column Containers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 10th standard */}
              <div className="bg-white border-2 border-slate-300 p-6 rounded-3xl space-y-5 shadow-xs">
                <div className="flex items-center justify-center space-x-2.5 border-b-2 border-slate-200 pb-3 mb-4 text-center">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide text-center">10th Standard Info</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  <div className="sm:col-span-2 border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">School Name</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.tenth_school_name || 'N/A'}</span>
                  </div>
                  <div className="border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Board</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.tenth_board || 'N/A'}</span>
                  </div>
                  <div className="border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Medium</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.tenth_medium_of_study || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-2 border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Year of Passing</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.tenth_year_of_passing || 'N/A'}</span>
                  </div>
                </div>

                <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/40 space-y-2">
                  <p className="text-sm font-black text-[#191970] uppercase tracking-wider mb-2 text-center">Subject Marks (%)</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                    {[
                      { name: "Tamil", marks: education?.tenth_tamil_marks },
                      { name: "English", marks: education?.tenth_english_marks },
                      { name: "Maths", marks: education?.tenth_maths_marks },
                      { name: "Science", marks: education?.tenth_science_marks },
                      { name: "Social", marks: education?.tenth_social_science_marks },
                    ].map((sub, i) => (
                      <div key={i} className="border-2 border-slate-200 bg-white p-4 sm:p-5 rounded-2xl text-center shadow-2xs flex flex-col items-center justify-center min-h-[100px]">
                        <span className="text-[#191970] block text-sm sm:text-base font-black uppercase truncate text-center" title={sub.name}>{sub.name}</span>
                        <span className="font-black text-slate-900 mt-2 block text-xl sm:text-2xl text-center">{sub.marks ? Number(sub.marks).toFixed(1) : '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 12th standard */}
              <div className="bg-white border-2 border-slate-300 p-6 rounded-3xl space-y-5 shadow-xs">
                <div className="flex items-center justify-center space-x-2.5 border-b-2 border-slate-200 pb-3 mb-4 text-center">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide text-center">12th Standard Info</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                  <div className="sm:col-span-2 border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">School Name</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.twelfth_school_name || 'N/A'}</span>
                  </div>
                  <div className="border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Board</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.twelfth_board || 'N/A'}</span>
                  </div>
                  <div className="border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Medium</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.twelfth_medium_of_study || 'N/A'}</span>
                  </div>
                  <div className="sm:col-span-2 border-2 border-slate-200 p-5 sm:p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[105px]">
                    <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Year of Passing</span>
                    <span className="font-black text-slate-900 break-words block text-lg sm:text-xl text-center">{education?.twelfth_year_of_passing || 'N/A'}</span>
                  </div>
                </div>

                <div className="border-2 border-slate-200 p-4 rounded-2xl bg-slate-50/40 space-y-2">
                  <p className="text-sm font-black text-[#191970] uppercase tracking-wider mb-2 text-center">Subject Marks (%)</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { name: "Physics", marks: education?.twelfth_physics_marks },
                      { name: "Chemistry", marks: education?.twelfth_chemistry_marks },
                      { name: "Maths", marks: education?.twelfth_maths_marks },
                    ].map((sub, i) => (
                      <div key={i} className="border-2 border-slate-200 bg-white p-4 sm:p-5 rounded-2xl text-center shadow-2xs flex flex-col items-center justify-center min-h-[100px]">
                        <span className="text-[#191970] block text-sm sm:text-base font-black uppercase truncate text-center" title={sub.name}>{sub.name}</span>
                        <span className="font-black text-slate-900 mt-2 block text-xl sm:text-2xl text-center">{sub.marks ? Number(sub.marks).toFixed(1) : '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Degree GPAs with Distinct Semester Columns */}
            <div className="bg-white border-2 border-slate-300 p-6 rounded-3xl space-y-5 shadow-xs">
              <div className="flex items-center justify-center space-x-2.5 border-b-2 border-slate-200 pb-3 mb-4 text-center">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide text-center">Undergraduate Degree Information & GPAs</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div className="border-2 border-slate-200 p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[115px]">
                  <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Institution</span>
                  <span className="font-black text-slate-900 break-words block text-xl sm:text-2xl text-center">{education?.degree_institution_name || 'N/A'}</span>
                </div>
                <div className="border-2 border-slate-200 p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[115px]">
                  <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Degree & Specialization</span>
                  <span className="font-black text-slate-900 break-words block text-xl sm:text-2xl text-center">{education?.degree_name ? `${education.degree_name} - ${education.degree_specialization || 'General'}` : 'N/A'}</span>
                </div>
                <div className="border-2 border-slate-200 p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[115px]">
                  <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Medium</span>
                  <span className="font-black text-slate-900 break-words block text-xl sm:text-2xl text-center">{education?.degree_medium_of_study || 'N/A'}</span>
                </div>
                <div className="border-2 border-slate-200 p-6 rounded-2xl bg-slate-50/60 text-center flex flex-col items-center justify-center min-h-[115px]">
                  <span className="text-[#191970] text-base sm:text-lg font-black block uppercase mb-2 text-center">Year of Passing</span>
                  <span className="font-black text-slate-900 break-words block text-xl sm:text-2xl text-center">{education?.degree_year_of_passing || 'N/A'}</span>
                </div>
              </div>

              <div>
                <p className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider mb-3">Semester-wise GPA Breakdown</p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {[
                    { sem: "Sem 1", val: education?.semester_1_gpa },
                    { sem: "Sem 2", val: education?.semester_2_gpa },
                    { sem: "Sem 3", val: education?.semester_3_gpa },
                    { sem: "Sem 4", val: education?.semester_4_gpa },
                    { sem: "Sem 5", val: education?.semester_5_gpa },
                    { sem: "Sem 6", val: education?.semester_6_gpa },
                    { sem: "Sem 7", val: education?.semester_7_gpa },
                    { sem: "Sem 8", val: education?.semester_8_gpa },
                  ].map((s, idx) => (
                    <div key={idx} className="border-2 border-indigo-200 bg-indigo-50/40 p-4 sm:p-5 rounded-2xl text-center shadow-2xs hover:border-indigo-400 transition-colors flex flex-col items-center justify-center min-h-[105px]">
                      <span className="text-[#191970] block text-sm sm:text-base font-black uppercase text-center">{s.sem}</span>
                      <span className="font-black text-slate-900 block mt-2 text-xl sm:text-2xl text-center">{s.val ? Number(s.val).toFixed(2) : '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gaps and Arrears Status with 2 Clean Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gaps */}
              <div className="bg-white border-2 border-slate-300 p-6 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-center space-x-2.5 border-b-2 border-slate-200 pb-3 mb-4 text-center">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide text-center">Academic Gaps</h4>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Gap After 10th", check: education?.gap_after_tenth, years: education?.gap_after_tenth_years, reason: education?.gap_after_tenth_reason },
                    { label: "Gap After 12th", check: education?.gap_after_twelfth, years: education?.gap_after_twelfth_years, reason: education?.gap_after_twelfth_reason },
                    { label: "Gap During Degree", check: education?.gap_during_degree, years: education?.gap_during_degree_years, reason: education?.gap_during_degree_reason },
                  ].map((gap, i) => (
                    <div key={i} className="flex items-start space-x-3 text-base border-2 border-slate-200 p-3 rounded-xl bg-slate-50/50">
                      <div className={`mt-0.5 p-1 rounded-full ${gap.check ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="font-black text-slate-900 block text-lg sm:text-xl">{gap.label}: {gap.check ? "Yes" : "No"}</span>
                        {gap.check && (
                          <p className="text-slate-600 text-sm mt-1">
                            Duration: {gap.years} year(s) | Reason: {gap.reason || 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {!education?.gap_after_tenth && !education?.gap_after_twelfth && !education?.gap_during_degree && (
                    <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl text-center text-slate-900 font-black text-xl">✔ No Academic Gaps Detected</div>
                  )}
                </div>
              </div>

              {/* Arrears */}
              <div className="bg-white border-2 border-slate-300 p-6 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-center space-x-2.5 border-b-2 border-slate-200 pb-3 mb-4 text-center">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide text-center">Arrears Status</h4>
                </div>
                <div className="space-y-3.5 text-base">
                  <div className="flex items-center justify-between border-2 border-slate-200 p-3 rounded-xl bg-slate-50/50">
                    <span className="text-[#191970] text-lg sm:text-xl font-black uppercase">History of Arrears:</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900">
                      {education?.has_arrears_history ? "Yes" : "No"}
                    </span>
                  </div>
                  {education?.has_arrears_history && (
                    <div className="flex items-center justify-between border-2 border-slate-200 p-3 rounded-xl bg-slate-50/50">
                      <span className="text-slate-600 font-bold">Arrear Count in History:</span>
                      <span className="font-black text-slate-900 text-lg">{education?.arrears_history_count || 0}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-2 border-slate-200 p-3 rounded-xl bg-slate-50/50">
                    <span className="text-[#191970] text-lg sm:text-xl font-black uppercase">Standing Arrears:</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900">
                      {education?.has_standing_arrears ? "Yes" : "No"}
                    </span>
                  </div>
                  {education?.has_standing_arrears && (
                    <div className="border-2 border-red-200 bg-red-50/50 p-3.5 rounded-xl space-y-1.5">
                      <span className="text-red-900 text-xs font-black uppercase tracking-wider block">Standing Arrear Subjects ({education?.standing_arrears_count || 0}):</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Array.isArray(education?.standing_arrears_subjects) ? (
                          education.standing_arrears_subjects.map((sub, idx) => {
                            const code = typeof sub === 'object' ? (sub.subject_code || sub.code) : sub;
                            const name = typeof sub === 'object' ? (sub.subject_name || sub.name) : null;
                            return (
                              <span
                                key={idx}
                                title={name ? `${code} - ${name}` : code}
                                className="bg-red-100 text-red-800 text-sm font-black px-3 py-1 rounded-lg border border-red-300 shadow-2xs"
                              >
                                {code}{name && name !== code ? ` (${name})` : ''}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 text-sm italic">N/A</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </CollapsibleSection>

        {/* ========================================================
            3. PLACEMENT INFO
        ======================================================== */}
        <CollapsibleSection
          title="Placement Info"
          icon={Briefcase}
          count={attendedCompanies.length > 0 ? attendedCompanies.length : null}
          isExpanded={expandedSections.placement}
          onToggle={() => toggleSection('placement')}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Specialization", value: placementInfo?.specialization || competencyRecord?.specialization_chosen, color: "from-blue-50 to-blue-100/50 text-blue-950 border-blue-300" },
                { label: "Dream Company", value: placementInfo?.dream_company || getCareerObjectiveDescription(competencyRecord), color: "from-purple-50 to-purple-100/50 text-purple-950 border-purple-300" },
                { label: "Expected CTC", value: placementInfo?.expected_ctc || competencyRecord?.expected_ctc, color: "from-emerald-50 to-emerald-100/50 text-emerald-950 border-emerald-300" },
              ].map((item, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${item.color} border-2 p-6 rounded-3xl min-w-0 shadow-xs text-center flex flex-col items-center justify-center`}>
                  <p className="text-base sm:text-lg font-black uppercase tracking-wider text-[#191970] text-center">{item.label}</p>
                  <p className="text-xl sm:text-2xl font-black mt-2 break-words leading-snug text-center">{item.value || 'N/A'}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl">
              <p className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider mb-2">Career Objective</p>
              <p className="text-slate-900 text-lg sm:text-xl font-black leading-relaxed whitespace-pre-wrap">{placementInfo?.career_objective || competencyRecord?.career_objectives || 'N/A'}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 mb-4 pb-2 border-b-2 border-slate-200 text-center">
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase text-center">Attended Companies Status</h4>
              </div>
              {attendedCompanies.length === 0 ? (
                <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                  <p className="text-slate-500 text-lg font-medium italic">No attended companies recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
                  <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '600px', tableLayout: 'auto' }}>
                    <thead className="bg-slate-100/90">
                      <tr className="divide-x-2 divide-slate-300">
                        <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[240px]">Company Name</th>
                        <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[140px]">Rounds Cleared</th>
                        <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {attendedCompanies.map((company, index) => (
                        <tr key={company.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{company.company_name}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{company.rounds_cleared}</td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                            <span className="text-lg sm:text-xl font-normal text-slate-900">
                              {company.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* ========================================================
            COMPETENCY REQUIRED (ALL FIELDS)
        ======================================================== */}
        <CollapsibleSection
          title="Competency Required (All Fields)"
          icon={Shield}
          isExpanded={expandedSections.competency}
          onToggle={() => toggleSection('competency')}
        >
          {!competencyRecord ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No competency evaluations recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Present Competency, Competency Level & Communication Skills */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl md:col-span-2 min-w-0">
                  <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-2">Present Competency</span>
                  {(() => {
                    // Parse "React:80, Python:60" or plain "React, Python" — show names only as pills
                    const raw = competencyRecord.present_competency || '';
                    const skills = raw.split(',').map(s => {
                      const trimmed = s.trim();
                      const colonIdx = trimmed.lastIndexOf(':');
                      return colonIdx !== -1 ? trimmed.substring(0, colonIdx).trim() : trimmed;
                    }).filter(Boolean);
                    if (skills.length === 0) return <p className="text-slate-500 text-base italic">N/A</p>;
                    return (
                      <p className="text-slate-900 text-lg sm:text-xl font-black leading-relaxed break-words">
                        {skills.join(', ')}
                      </p>
                    );
                  })()}
                </div>
                <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl text-center flex flex-col justify-center items-center min-w-0">
                  <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-2">Competency Level</span>
                  <p className="text-lg sm:text-xl font-black uppercase text-slate-900 leading-snug">{competencyRecord.competency_level || 'Beginner'}</p>
                </div>
                <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl text-center flex flex-col justify-center items-center min-w-0">
                  <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-2">Communication Skills</span>
                  <p className="text-lg sm:text-xl font-black uppercase text-slate-900 leading-snug">{competencyRecord.communication_skills || 'N/A'}</p>
                </div>
              </div>

              {/* Career Objective, Specialization Chosen & Expected CTC */}
              {(() => {
                const isHigherStudiesOrEntrepreneur = ['Higher Studies', 'Entrepreneur', 'Enterpreneur'].includes(competencyRecord.career_objectives);

                if (isHigherStudiesOrEntrepreneur) {
                  return (
                    <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl text-center flex flex-col justify-center items-center min-w-0">
                      <span className="text-lg sm:text-xl font-black text-[#191970] uppercase tracking-wider block mb-2">Career Objective</span>
                      <p className="text-xl sm:text-2xl font-black uppercase text-indigo-700 leading-snug">{competencyRecord.career_objectives || 'N/A'}</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl text-center flex flex-col justify-center items-center min-w-0">
                      <span className="text-lg sm:text-xl font-black text-[#191970] uppercase tracking-wider block mb-2">Career Objective</span>
                      <p className="text-xl sm:text-2xl font-black uppercase text-indigo-700 leading-snug">{competencyRecord.career_objectives || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl text-center flex flex-col justify-center items-center min-w-0">
                      <span className="text-lg sm:text-xl font-black text-[#191970] uppercase tracking-wider block mb-2">Specialization Chosen</span>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">{competencyRecord.specialization_chosen || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl text-center flex flex-col justify-center items-center min-w-0">
                      <span className="text-lg sm:text-xl font-black text-[#191970] uppercase tracking-wider block mb-2">Expected CTC</span>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">{competencyRecord.expected_ctc || 'N/A'}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Career Objective Details Card */}
              {(() => {
                const objective = competencyRecord.career_objectives;
                if (!objective) return null;

                let details = competencyRecord.career_objective_details;
                if (typeof details === 'string') {
                  try { details = JSON.parse(details); } catch (e) { details = {}; }
                }
                let activeData = details?.[objective] || details?.['Entrepreneur'] || details?.['Enterpreneur'] || details?.['Higher Studies'];
                if (typeof activeData === 'string') {
                  try {
                    const parsed = JSON.parse(activeData);
                    if (typeof parsed === 'object' && parsed !== null) activeData = parsed;
                  } catch (e) {}
                }

                if (objective === 'Higher Studies') {
                  const hs = typeof activeData === 'object' && activeData !== null ? activeData : {};
                  return (
                    <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-2 border-indigo-200 p-6 rounded-3xl space-y-4 shadow-xs">
                      <div className="flex items-center gap-3 pb-3 border-b-2 border-indigo-100">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                          <GraduationCap size={22} className="stroke-[2.5]" />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-[#191970] uppercase tracking-wide">Higher Studies Details</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                          <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Exam</span>
                          <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{hs.exam || 'N/A'}</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                          <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Degree</span>
                          <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{hs.degree || 'N/A'}</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                          <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">University</span>
                          <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{hs.university || 'N/A'}</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                          <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Preparation Platform</span>
                          <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">
                            {hs.preparation_platform
                              ? `${hs.preparation_platform}${hs.platform_name ? ` (${hs.platform_name})` : ''}`
                              : (hs.platform_name || hs.online_platform || 'N/A')}
                          </p>
                        </div>
                        {(hs.attended_test || hs.test_count || hs.score || hs.test_name) && (
                          <>
                            <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                              <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Tests Taken</span>
                              <p className="text-lg sm:text-xl font-bold text-slate-900">{hs.test_count || 'Yes'}</p>
                            </div>
                            {hs.test_name && (
                              <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                                <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Exam / Test Name</span>
                                <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{hs.test_name}</p>
                              </div>
                            )}
                            <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                              <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Score</span>
                              <p className="text-lg sm:text-xl font-bold text-slate-900">{hs.score || 'N/A'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                if (objective === 'Entrepreneur' || objective === 'Enterpreneur') {
                  const ent = typeof activeData === 'object' && activeData !== null ? activeData : {};
                  return (
                    <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border-2 border-indigo-200 p-6 rounded-3xl space-y-4 shadow-xs">
                      <div className="flex items-center gap-3 pb-3 border-b-2 border-indigo-100">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                          <Briefcase size={22} className="stroke-[2.5]" />
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-[#191970] uppercase tracking-wide">Entrepreneur Details</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                          <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Business Type</span>
                          <p className="text-lg sm:text-xl font-bold text-indigo-700">{ent.business_type || 'N/A'}</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                          <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Field</span>
                          <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{ent.field || 'N/A'}</p>
                        </div>
                        {ent.business_type === 'Own Business' || ent.business_type === 'Own' ? (
                          <>
                            {ent.business_details && (
                              <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl sm:col-span-2">
                                <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Business Details</span>
                                <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{ent.business_details}</p>
                              </div>
                            )}
                            <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                              <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Number of Branches plan to open</span>
                              <p className="text-lg sm:text-xl font-bold text-slate-900">
                                {ent.branches_to_open !== undefined && ent.branches_to_open !== '' ? ent.branches_to_open : (ent.expand ?? 'N/A')}
                              </p>
                            </div>
                            <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                              <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Funding</span>
                              <p className="text-lg sm:text-xl font-bold text-slate-900">{ent.funding || ent.upgrade || 'N/A'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            {ent.generation && (
                              <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                                <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Generation</span>
                                <p className="text-lg sm:text-xl font-bold text-slate-900">{ent.generation}</p>
                              </div>
                            )}
                            {ent.expand !== undefined && ent.expand !== '' && (
                              <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl">
                                <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Number of Branches Opened</span>
                                <p className="text-lg sm:text-xl font-bold text-slate-900">{ent.expand}</p>
                              </div>
                            )}
                            {ent.upgrade && (
                              <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl sm:col-span-2">
                                <span className="text-sm font-black text-[#191970] uppercase tracking-wider block mb-1">Upgrade Plans</span>
                                <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{ent.upgrade}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                // Other objectives (Placement, Core, Software, Startup)
                const desc = typeof activeData === 'string' ? activeData : (activeData ? JSON.stringify(activeData) : '');
                return (
                  <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl shadow-xs">
                    <span className="text-lg sm:text-xl font-black text-[#191970] uppercase tracking-wider block mb-2">
                      {getCareerObjectiveLabel(objective)}
                    </span>
                    <p className="text-slate-900 text-xl sm:text-2xl font-normal font-aptos leading-relaxed whitespace-pre-wrap">
                      {desc || 'N/A'}
                    </p>
                  </div>
                );
              })()}

              {/* Competency Proficiency Bar Chart */}
              {(() => {
                const raw = competencyRecord.present_competency || '';
                const chartData = raw.split(',').map(s => {
                  const trimmed = s.trim();
                  const colonIdx = trimmed.lastIndexOf(':');
                  if (colonIdx !== -1) {
                    const name = trimmed.substring(0, colonIdx).trim();
                    const pct = parseInt(trimmed.substring(colonIdx + 1).trim(), 10);
                    return { name, value: isNaN(pct) ? 0 : pct };
                  }
                  return { name: trimmed, value: 0 };
                }).filter(d => d.name);

                return (
                  <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs">
                    <span className="text-lg sm:text-xl font-black text-[#191970] uppercase tracking-wider block mb-4">Competency Proficiency Chart</span>
                    {chartData.length === 0 ? (
                      <p className="text-slate-400 text-base italic text-center py-6">No competency data available to display chart.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={chartData}
                          margin={{ top: 30, right: 20, left: 0, bottom: 12 }}
                          barCategoryGap="35%"
                        >
                          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 20, fill: "#0f172a", fontWeight: 800 }}
                            axisLine={true}
                            tickLine={true}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 14, fill: "#1e293b", fontWeight: 700 }}
                            axisLine={true}
                            tickLine={true}
                            tickFormatter={v => `${v}%`}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(99,102,241,0.07)" }}
                            formatter={value => [`${value}%`, "Proficiency"]}
                            contentStyle={{ borderRadius: "10px", border: "1px solid #e0e7ff", fontSize: "15px" }}
                          />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64} fill="#3b82f6">
                            <LabelList
                              dataKey="value"
                              position="top"
                              formatter={v => v > 0 ? `${v}%` : ""}
                              style={{ fontSize: 20, fontWeight: 800, fill: "#1e3a5f" }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
              })()}

              {/* Identified Gaps list & gaps Description */}
              <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl space-y-5 shadow-xs">
                <div className="border-b-2 border-slate-200 pb-4">
                  <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-3">Identified Skill Gaps</span>
                  {(() => {
                    let gapsArr = competencyRecord.gaps || [];
                    if (typeof gapsArr === 'string') {
                      try { gapsArr = JSON.parse(gapsArr); } catch (e) { gapsArr = []; }
                    }
                    if (!Array.isArray(gapsArr)) gapsArr = [gapsArr];
                    if (gapsArr.length === 0) {
                      return <span className="text-slate-500 text-lg italic">No skill gaps identified yet.</span>;
                    }
                    return (
                      <p className="text-slate-900 text-lg sm:text-xl font-normal font-aptos leading-relaxed">
                        {gapsArr.join(', ')}
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-2">Gaps Description Details</span>
                  <p className="text-slate-900 text-lg sm:text-xl font-normal font-aptos leading-relaxed">{competencyRecord.gaps_description || 'N/A'}</p>
                </div>
              </div>

              {/* Action Plan steps */}
              <div className="bg-slate-50/70 border-2 border-slate-200 p-6 rounded-3xl shadow-xs">
                <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-4">Planned for Filling Gaps / Action Plan</span>
                <div className="space-y-3 text-base">
                  {(() => {
                    let stepsArr = competencyRecord.steps || [];
                    if (typeof stepsArr === 'string') {
                      try { stepsArr = JSON.parse(stepsArr); } catch (e) { stepsArr = []; }
                    }
                    if (!Array.isArray(stepsArr)) stepsArr = [stepsArr];
                    if (stepsArr.length === 0) {
                      return <p className="text-slate-500 text-lg italic text-center py-2">No action plan steps uploaded yet.</p>;
                    }
                    return stepsArr.map((step, idx) => (
                      <div key={idx} className="flex items-baseline space-x-3 py-1">
                        <span className="text-lg sm:text-xl font-normal font-aptos text-slate-900 shrink-0">{idx + 1}.</span>
                        <p className="text-slate-900 font-normal font-aptos text-lg sm:text-xl leading-snug">{step}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            4. COURSES COMPLETED (CATEGORY-WISE)
        ======================================================== */}
        <CollapsibleSection
          title="Courses Completed"
          icon={BookOpen}
          count={categoryCourses.reduce((sum, item) => sum + (Number(item.completedCount) || 0), 0)}
          isExpanded={expandedSections.completedCourses}
          onToggle={() => toggleSection('completedCourses')}
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
              <div>
                <h4 className="text-lg font-black text-slate-900">Curriculum Course Completion</h4>
                <p className="text-base text-slate-600 mt-0.5 font-medium">Category-wise breakdown of courses successfully completed based on regulation</p>
              </div>
              <span className="text-base font-black text-indigo-900 bg-indigo-50 border-2 border-indigo-200 px-4 py-2 rounded-xl shadow-xs">
                Total: {categoryCourses.reduce((sum, item) => sum + (Number(item.completedCount) || 0), 0)} Completed
              </span>
            </div>

            {categoryCourses.length === 0 ? (
              <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <p className="text-slate-500 text-lg font-medium italic">No completed courses recorded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryCourses.map((cat) => (
                  <div
                    key={cat.category}
                    className="bg-slate-50/70 border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 p-5 rounded-2xl transition duration-200 shadow-2xs min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-extrabold text-[#191970] uppercase tracking-wider break-words flex-1 min-w-0">
                        {cat.category}
                      </p>
                      <BookOpen size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
                      {cat.completedCount}
                    </p>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      {cat.completedCount === 1 ? 'course completed' : 'courses completed'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ========================================================
            5. NPTEL DETAILS
        ======================================================== */}
        <CollapsibleSection
          title="NPTEL Details"
          icon={Award}
          count={nptelSummary?.completedCount ?? 0}
          isExpanded={expandedSections.nptelDetails}
          onToggle={() => toggleSection('nptelDetails')}
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">NPTEL Courses & Credit Transfer Status</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-black text-indigo-900 bg-indigo-50 border-2 border-indigo-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                  {nptelSummary?.completedCount ?? 0} Completed
                </span>
                <span className="text-base font-black text-emerald-900 bg-emerald-50 border-2 border-emerald-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                  {nptelSummary?.transferredCount ?? 0} Transferred
                </span>
                <span className="text-base font-black text-amber-900 bg-amber-50 border-2 border-amber-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                  OEC: {oecTotalCompletedCredits} / {oecMaxCredits} Credits
                </span>
                <span className="text-base font-black text-blue-900 bg-blue-50 border-2 border-blue-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                  PEC: {pecTotalCompletedCredits} / {pecMaxCredits} Credits
                </span>
              </div>
            </div>

            {/* Quota & Summary Cards with Presentation Borders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-indigo-50 via-indigo-50/60 to-white border-2 border-indigo-300 p-6 rounded-3xl shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#191970] uppercase tracking-wider">Courses Completed</p>
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Award size={22} />
                  </div>
                </div>
                <p className="text-3xl font-black text-indigo-950 mt-3">{nptelSummary?.completedCount ?? 0}</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-2 border-emerald-300 p-6 rounded-3xl shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#191970] uppercase tracking-wider">Credit Transferred</p>
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <CheckCircle2 size={22} />
                  </div>
                </div>
                <p className="text-3xl font-black text-emerald-950 mt-3">{nptelSummary?.transferredCount ?? 0}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-purple-50/60 to-white border-2 border-purple-300 p-6 rounded-3xl shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#191970] uppercase tracking-wider">Credits Quota</p>
                  {(nptelSummary?.transferredCredits ?? 0) >= (nptelSummary?.maxCredits ?? nptelSummary?.maxNptelCredits ?? 15) ? (
                    <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-950 rounded-full border border-emerald-300">
                      Fulfilled 🎉
                    </span>
                  ) : (
                    <span className="text-xs font-black px-3 py-1 bg-purple-100 text-purple-900 rounded-full border border-purple-300">
                      Max 15
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-black text-purple-950">{nptelSummary?.transferredCredits ?? 0}</span>
                  <span className="text-base font-bold text-purple-900">/ {nptelSummary?.maxCredits ?? nptelSummary?.maxNptelCredits ?? 15} credits</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-3 mt-3 overflow-hidden">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((nptelSummary?.transferredCredits ?? 0) / (nptelSummary?.maxCredits ?? nptelSummary?.maxNptelCredits ?? 15)) * 100))}%`
                    }}
                  />
                </div>
                <div className="mt-2">
                  {(nptelSummary?.transferredCredits ?? 0) >= (nptelSummary?.maxCredits ?? nptelSummary?.maxNptelCredits ?? 15) ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-950 border-2 border-emerald-300 rounded-xl text-xs font-black">
                      Fulfilled 🎉
                    </span>
                  ) : (
                    <p className="text-sm text-purple-900 font-black">
                      {nptelSummary?.remainingCredits ?? nptelSummary?.remainingNptelCredits ?? (15 - (nptelSummary?.transferredCredits ?? 0))} credits remaining
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* OEC & PEC Credit Transfer Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OEC Credit Transfer Card */}
              <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border-2 border-amber-300 p-6 rounded-3xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-100"></div>
                      <p className="text-sm font-black text-[#191970] uppercase tracking-wider">Open Elective (OEC)</p>
                    </div>
                    <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-950 rounded-full border border-amber-300">
                      Max {oecMaxCredits} Credits
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mt-4">
                    <div className="flex items-baseline space-x-2 min-w-0">
                      <span className="text-3xl font-black text-amber-950">{oecTotalCompletedCredits}</span>
                      <span className="text-base font-extrabold text-amber-900 break-words">/ {oecMaxCredits} Credits Completed</span>
                    </div>
                    <span className="text-sm font-black text-amber-950 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 shrink-0">
                      {Math.min(100, Math.round((oecTotalCompletedCredits / (oecMaxCredits || 1)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-3 mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((oecTotalCompletedCredits / (oecMaxCredits || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t-2 border-amber-200 text-center">
                  <div className="bg-amber-100/90 border-2 border-amber-300 rounded-2xl p-3 flex flex-col justify-center shadow-2xs">
                    <span className="text-xs font-black text-[#191970] uppercase tracking-wide">NPTEL</span>
                    <span className="text-lg font-black text-amber-950 mt-1">{oecTransferredCredits} Cr</span>
                    <span className="text-xs text-amber-800 font-bold">({oecTransferredCount} {oecTransferredCount === 1 ? 'course' : 'courses'})</span>
                  </div>
                  <div className="bg-amber-100/90 border-2 border-amber-300 rounded-2xl p-3 flex flex-col justify-center shadow-2xs">
                    <span className="text-xs font-black text-[#191970] uppercase tracking-wide">Regular</span>
                    <span className="text-lg font-black text-amber-950 mt-1">{oecCollegeCredits} Cr</span>
                    <span className="text-xs text-amber-800 font-bold">({oecCollegeCount} {oecCollegeCount === 1 ? 'course' : 'courses'})</span>
                  </div>
                  <div className={`rounded-2xl p-3 flex flex-col justify-center border-2 shadow-2xs ${oecRemainingCredits === 0
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-amber-100/90 text-amber-950 border-amber-300'
                    }`}>
                    <span className="text-xs font-black uppercase tracking-wide">{oecRemainingCredits === 0 ? 'Status' : 'Remaining'}</span>
                    <span className="text-lg font-black mt-1">{oecRemainingCredits === 0 ? 'Fulfilled 🎉' : `${oecRemainingCredits} Cr`}</span>
                  </div>
                </div>
              </div>

              {/* PEC Credit Transfer Card */}
              <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border-2 border-blue-300 p-6 rounded-3xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></div>
                      <p className="text-sm font-black text-[#191970] uppercase tracking-wider">Professional Elective (PEC)</p>
                    </div>
                    <span className="text-xs font-black px-3 py-1 bg-blue-100 text-blue-950 rounded-full border border-blue-300">
                      Max {pecMaxCredits} Credits
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mt-4">
                    <div className="flex items-baseline space-x-2 min-w-0">
                      <span className="text-3xl font-black text-blue-950">{pecTotalCompletedCredits}</span>
                      <span className="text-base font-extrabold text-blue-900 break-words">/ {pecMaxCredits} Credits Completed</span>
                    </div>
                    <span className="text-sm font-black text-blue-950 bg-blue-100 px-3 py-1 rounded-xl border border-blue-300 shrink-0">
                      {Math.min(100, Math.round((pecTotalCompletedCredits / (pecMaxCredits || 1)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((pecTotalCompletedCredits / (pecMaxCredits || 1)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t-2 border-blue-200 text-center">
                  <div className="bg-blue-100/90 border-2 border-blue-300 rounded-2xl p-3 flex flex-col justify-center shadow-2xs">
                    <span className="text-xs font-black text-[#191970] uppercase tracking-wide">NPTEL</span>
                    <span className="text-lg font-black text-blue-950 mt-1">{pecTransferredCredits} Cr</span>
                    <span className="text-xs text-blue-800 font-bold">({pecTransferredCount} {pecTransferredCount === 1 ? 'course' : 'courses'})</span>
                  </div>
                  <div className="bg-blue-100/90 border-2 border-blue-300 rounded-2xl p-3 flex flex-col justify-center shadow-2xs">
                    <span className="text-xs font-black text-[#191970] uppercase tracking-wide">Regular</span>
                    <span className="text-lg font-black text-blue-950 mt-1">{pecCollegeCredits} Cr</span>
                    <span className="text-xs text-blue-800 font-bold">({pecCollegeCount} {pecCollegeCount === 1 ? 'course' : 'courses'})</span>
                  </div>
                  <div className={`rounded-2xl p-3 flex flex-col justify-center border-2 shadow-2xs ${pecRemainingCredits === 0
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : 'bg-blue-100/90 text-blue-950 border-blue-300'
                    }`}>
                    <span className="text-xs font-black uppercase tracking-wide">{pecRemainingCredits === 0 ? 'Status' : 'Remaining'}</span>
                    <span className="text-lg font-black mt-1">{pecRemainingCredits === 0 ? 'Fulfilled 🎉' : `${pecRemainingCredits} Cr`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Courses Table with Complete Column Borders */}
            {(!nptelSummary?.courses || nptelSummary.courses.length === 0) ? (
              <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl inline-block mb-2">
                  <Award size={28} />
                </div>
                <p className="text-slate-600 text-lg font-bold">No NPTEL courses recorded for this student.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '1000px' }}>
                  <colgroup>
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '13%' }} />
                  </colgroup>
                  <thead className="bg-slate-100/90">
                    <tr className="divide-x-2 divide-slate-300">
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Course Title</th>
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Course Code</th>
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Credits</th>
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Semester</th>
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Grade</th>
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Transfer Type</th>
                      <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap align-middle">Transfer Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {nptelSummary.courses.map((c, idx) => {
                      const status = c.transferStatus || c.studentStatus;
                      return (
                        <tr key={c.enrollmentId || idx} className="hover:bg-indigo-50/20 transition-colors divide-x-2 divide-slate-200">
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">
                            <div className="break-words whitespace-normal pr-2">
                              {c.courseTitle}
                            </div>
                          </td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle whitespace-nowrap font-normal font-aptos">
                            <span className=" text-lg sm:text-xl font-normal text-slate-900">
                              {c.courseCode}
                            </span>
                          </td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle text-slate-900 whitespace-nowrap font-normal font-aptos">
                            <span className="text-lg sm:text-xl font-normal text-slate-900">
                              {c.credits} Cr
                            </span>
                          </td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle text-slate-900 whitespace-nowrap font-normal font-aptos">
                            Sem {c.semesterNumber || '-'}
                          </td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle whitespace-nowrap font-normal font-aptos">
                            {c.grade ? (
                              <span className="text-lg sm:text-xl font-normal text-slate-900">
                                {c.grade}
                              </span>
                            ) : (
                              <span className="text-slate-900 text-lg sm:text-xl font-normal">-</span>
                            )}
                          </td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle whitespace-nowrap font-normal font-aptos">
                            {c.creditType ? (
                              <span className="text-lg sm:text-xl font-normal text-slate-900">
                                {c.creditType}
                              </span>
                            ) : (
                              <span className="text-slate-900 text-lg sm:text-xl font-normal">-</span>
                            )}
                          </td>
                          <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center align-middle whitespace-nowrap font-normal font-aptos">
                            <span className="text-lg sm:text-xl font-normal text-slate-900">
                              {status === 'accepted' ? 'Accepted' :
                                status === 'rejected' ? 'Rejected' :
                                  status === 'pending' ? 'Pending' : 'Not Transferred'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ========================================================
            6. ONLINE COURSES
        ======================================================== */}
        <CollapsibleSection
          title="Online Courses"
          icon={Laptop}
          count={courses.length}
          isExpanded={expandedSections.courses}
          onToggle={() => toggleSection('courses')}
        >
          {courses.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No online courses recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '800px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[200px]">Course Name</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[150px]">Instructor</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Certificate</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {courses.map((course, index) => (
                    <tr key={course.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[200px] leading-snug font-normal font-aptos">{course.course_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[150px] leading-snug font-normal font-aptos">{course.instructor_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        {course.certificate_file ? (
                          <a
                            href={resolveFileUrl(course.certificate_file, "certificates")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 hover:text-slate-900 font-normal underline inline-flex items-center gap-1.5 text-lg sm:text-xl"
                          >
                            <span>View PDF</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="text-slate-900 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {course.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            7. INTERNSHIPS
        ======================================================== */}
        <CollapsibleSection
          title="Internships"
          icon={Building}
          count={internships.length}
          isExpanded={expandedSections.internships}
          onToggle={() => toggleSection('internships')}
        >
          {internships.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No internships recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '850px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Provider Company</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[150px]">Domain</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[100px]">Mode</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Duration</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Stipend</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {internships.map((internship, index) => (
                    <tr key={internship.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[180px] leading-snug font-normal font-aptos">{internship.provider_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[150px] leading-snug font-normal font-aptos">{internship.domain}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[100px] font-normal font-aptos">{internship.mode}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        {formatDate(internship.start_date)} - {formatDate(internship.end_date)}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        {internship.stipend ? `₹${Number(internship.stipend).toLocaleString('en-IN')}` : "Unpaid"}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        {internship.certificate ? (
                          <a
                            href={resolveFileUrl(internship.certificate, "")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 hover:text-slate-900 font-normal underline inline-flex items-center gap-1.5 text-lg sm:text-xl"
                          >
                            <span>View PDF</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="text-slate-900 font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            16. EXTRACURRICULAR
        ======================================================== */}
        <CollapsibleSection
          title="Extracurricular"
          icon={Award}
          count={extracurricular.length}
          isExpanded={expandedSections.extracurricular}
          onToggle={() => toggleSection('extracurricular')}
        >
          {extracurricular.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No extracurricular activities recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '950px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[200px]">Activity Type</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Level</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Duration</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Status</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[100px]">Prize</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[110px]">Amount</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {extracurricular.map((e, idx) => (
                    <tr key={e.id || idx} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{e.type || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {e.level || '-'}
                        </span>
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words font-normal font-aptos">
                        {e.from_date && e.to_date ? `${formatDate(e.from_date)} - ${formatDate(e.to_date)}` : 'N/A'}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {e.status || '-'}
                        </span>
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        {e.prize ? (
                          <span>{e.prize === '1' ? '1st' : e.prize === '2' ? '2nd' : (e.prize === '3' ? '3rd' : (e.prize || '-'))}</span>
                        ) : '-'}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        {e.amount > 0 ? `₹${parseFloat(e.amount).toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {e.pending === true || e.pending === 1 ? 'Pending' : (e.tutor_approval_status === true || e.tutor_approval_status === 1 ? 'Approved' : 'Rejected')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            17. NON-CGPA
        ======================================================== */}
        <CollapsibleSection
          title="NonCGPA"
          icon={FileText}
          count={nonCgpaRecords.length}
          isExpanded={expandedSections.noncgpa}
          onToggle={() => toggleSection('noncgpa')}
        >
          {nonCgpaRecords.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No Non-CGPA records available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '650px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[200px]">Category Name</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[220px]">Course Title</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[140px]">Tutor Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {nonCgpaRecords.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{r.category?.course_name || r.course_name || r.category || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{r.course_code || r.title || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {r.tutor_verification_status === true ? 'Approved' : (r.tutor_verification_status === false ? 'Rejected' : 'Pending')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            8. PROJECTS
        ======================================================== */}
        <CollapsibleSection
          title="Projects"
          icon={Briefcase}
          count={projects.length}
          isExpanded={expandedSections.projects}
          onToggle={() => toggleSection('projects')}
        >
          {projects.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No projects recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((p, idx) => {
                let techs = [];
                if (Array.isArray(p.techstack)) {
                  techs = p.techstack;
                } else if (typeof p.techstack === 'string' && p.techstack.trim()) {
                  try {
                    const parsed = JSON.parse(p.techstack);
                    techs = Array.isArray(parsed) ? parsed : [p.techstack];
                  } catch (e) {
                    techs = p.techstack.split(',').map(t => t.trim()).filter(Boolean);
                  }
                }

                const formatUrl = (url) => {
                  if (!url || typeof url !== 'string' || !url.trim()) return null;
                  const trimmed = url.trim();
                  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
                };

                const githubUrl = formatUrl(p.github_link || p.github);
                const liveUrl = formatUrl(p.link || p.project_link || p.demo_link || p.url);

                return (
                  <div key={p.id || idx} className="bg-white border-2 border-slate-300 hover:border-indigo-400 p-6 sm:p-7 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Title & Status */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-2xl sm:text-3xl font-black text-slate-900 break-words leading-snug">
                            {p.title || p.project_title || 'Untitled Project'}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {p.status && (
                            <span className="text-lg sm:text-xl font-normal font-aptos text-slate-900">
                              {p.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meta details grid: Domain, Team Members, Guide with Column Separation */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                        {p.domain && (
                          <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl min-w-0">
                            <span className="text-[#191970] font-black block uppercase text-sm sm:text-base">Domain</span>
                            <span className="font-normal font-aptos text-slate-900 break-words block mt-1 text-lg sm:text-xl">{p.domain}</span>
                          </div>
                        )}
                        {p.team_members !== undefined && p.team_members !== null && (
                          <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl min-w-0">
                            <span className="text-[#191970] font-black block uppercase text-sm sm:text-base">Team Size</span>
                            <span className="font-normal font-aptos text-slate-900 block mt-1 text-lg sm:text-xl">
                              {Number(p.team_members) === 1 ? '1 Member' : `${p.team_members} Members`}
                            </span>
                          </div>
                        )}
                        {p.guide_name && (
                          <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl col-span-2 sm:col-span-1 min-w-0">
                            <span className="text-[#191970] font-black block uppercase text-sm sm:text-base">Guide</span>
                            <span className="font-normal font-aptos text-slate-900 break-words block mt-1 text-lg sm:text-xl">{p.guide_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Tech Stack */}
                      {techs.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block">Tech Stack</span>
                          <p className="text-lg sm:text-xl font-normal font-aptos text-slate-900 leading-snug">
                            {techs.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      {p.description && (
                        <div className="pt-3 border-t-2 border-slate-200">
                          <span className="text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider block mb-1">Description</span>
                          <p className="text-slate-900 text-lg sm:text-xl leading-relaxed break-words whitespace-pre-line font-normal font-aptos">{p.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Links */}
                    {(githubUrl || liveUrl) && (
                      <div className="pt-4 border-t-2 border-slate-200 flex flex-wrap items-center gap-3">
                        {githubUrl && (
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-lg font-black shadow-xs hover:shadow-sm transition"
                            title={githubUrl}
                          >
                            <Github size={18} />
                            <span>GitHub Code</span>
                            <ExternalLink size={14} className="opacity-70" />
                          </a>
                        )}
                        {liveUrl && (
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black shadow-xs hover:shadow-sm transition"
                            title={liveUrl}
                          >
                            <Globe size={18} />
                            <span>Live Demo / Project Link</span>
                            <ExternalLink size={14} className="opacity-70" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            9. EVENTS ATTENDED
        ======================================================== */}
        <CollapsibleSection
          title="Events Attended"
          icon={Calendar}
          count={events.length}
          isExpanded={expandedSections.events}
          onToggle={() => toggleSection('events')}
        >
          {events.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No attended events recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '950px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Event Name</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[140px]">Event Type</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[220px]">Institution</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[90px]">Mode</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Duration</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {events.map((event, index) => (
                    <tr key={event.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[180px] leading-snug font-normal font-aptos">{event.event_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[140px] leading-snug font-normal font-aptos">{event.event_type}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[220px] leading-snug font-normal font-aptos">{event.institution_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{event.mode}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        {event.from_date && event.to_date
                          ? `${formatDate(event.from_date)} - ${formatDate(event.to_date)}`
                          : "N/A"}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        {event.certificate_file ? (
                          <a
                            href={resolveFileUrl(event.certificate_file, "event")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 hover:text-slate-900 font-normal underline inline-flex items-center gap-1.5 text-lg sm:text-xl"
                          >
                            <span>View PDF</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="text-slate-900 font-normal">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            10. EVENTS ORGANIZED
        ======================================================== */}
        <CollapsibleSection
          title="Events Organized"
          icon={Users}
          count={organizedEvents.length}
          isExpanded={expandedSections.organizedEvents}
          onToggle={() => toggleSection('organizedEvents')}
        >
          {organizedEvents.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No organized events recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '950px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Event Name</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[140px]">Club / Association</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Role</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[200px]">Staff Incharge</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Duration</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Participants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {organizedEvents.map((event, index) => (
                    <tr key={event.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[180px] leading-snug font-normal font-aptos">{event.event_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[140px] leading-snug font-normal font-aptos">{event.club_name}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[120px] font-normal font-aptos">{event.role}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[200px] leading-snug font-normal font-aptos">{event.staff_incharge}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                        {event.start_date && event.end_date
                          ? `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`
                          : "N/A"}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{event.number_of_participants}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            11. PUBLICATIONS
        ======================================================== */}
        <CollapsibleSection
          title="Research Publications"
          icon={BookOpen}
          count={publications.length}
          isExpanded={expandedSections.publications}
          onToggle={() => toggleSection('publications')}
        >
          {publications.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No research publications recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '1050px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[220px]">Title & Name</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Authors</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Index Type</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[140px]">Publisher</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">DOI</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="py-4 px-4 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {publications.map((pub, idx) => (
                    <tr key={pub.id || idx} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 min-w-[220px] whitespace-normal break-words leading-snug font-normal font-aptos">
                        <div className="break-words font-normal text-slate-900">{pub.title}</div>
                        {pub.publication_name && (
                          <div className="text-lg sm:text-xl text-slate-900 mt-1 font-normal break-words">{pub.publication_name}</div>
                        )}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {pub.paper_type || 'Journal'}
                        </span>
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 min-w-[180px] whitespace-normal break-words leading-snug font-normal font-aptos">
                        <div className="break-words text-lg sm:text-xl">
                          {Array.isArray(pub.authors) && pub.authors.length > 0
                            ? pub.authors.join(", ")
                            : (pub.authors || "-")}
                        </div>
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{pub.index_type || 'Not Indexed'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 min-w-[140px] whitespace-normal break-words leading-snug font-normal font-aptos">{pub.publisher || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-all min-w-[120px] font-normal font-aptos">{pub.doi || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{formatDate(pub.publication_date)}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className={`text-lg sm:text-xl font-normal ${pub.publication_status === 'Published' ? 'text-slate-900' :
                          pub.publication_status === 'Accepted' ? 'text-slate-900' :
                            'text-slate-900'
                          }`}>
                          {pub.publication_status || '-'}
                        </span>
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {pub.pending === true || pub.pending === 1 ? 'Pending' : (pub.tutor_verification_status === true || pub.tutor_verification_status === 1 ? 'Verified' : 'Rejected')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            12. HACKATHONS ATTENDED
        ======================================================== */}
        <CollapsibleSection
          title="Hackathons Attended"
          icon={Trophy}
          count={hackathons.length}
          isExpanded={expandedSections.hackathons}
          onToggle={() => toggleSection('hackathons')}
        >
          {hackathons.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No hackathons recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
              <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '1000px', tableLayout: 'auto' }}>
                <thead className="bg-slate-100/90">
                  <tr className="divide-x-2 divide-slate-300">
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Event Name</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Organized By</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">From Date</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">To Date</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Total No of Rounds</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Total No of Rounds Cleared</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {hackathons.map((h, idx) => (
                    <tr key={h.id || idx} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[180px] leading-snug font-normal font-aptos">{h.event_name || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words min-w-[180px] leading-snug font-normal font-aptos">{h.organized_by || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{formatDate(h.from_date)}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{formatDate(h.to_date)}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{h.total_rounds || h.level_cleared || '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{h.rounds ?? '-'}</td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 capitalize whitespace-nowrap font-normal font-aptos">
                        {h.status === 'participate' ? 'Participation' : h.status === 'achievement' ? 'Achievement' : h.status || '-'}
                      </td>
                      <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                        <span className="text-lg sm:text-xl font-normal text-slate-900">
                          {h.pending === true || h.pending === 1 ? 'Pending' : (h.tutor_approval_status === true || h.tutor_approval_status === 1 ? 'Approved' : 'Rejected')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            13. SKILLRACK DETAILS (COMPLETE)
        ======================================================== */}
        <CollapsibleSection
          title="SkillRack Details (Complete)"
          icon={Code}
          isExpanded={expandedSections.skillrack}
          onToggle={() => toggleSection('skillrack')}
        >
          {!skillRackNormalized ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No complete SkillRack data available yet. Please ask your tutor to upload it.</p>
            </div>
          ) : (
            <div className="space-y-7">

              {/* Metric Highlights row with 4 Distinct Column Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/70 border-2 border-blue-300 text-blue-950 p-6 sm:p-7 rounded-3xl text-center shadow-sm relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-blue-500 opacity-20"><Trophy size={64} /></div>
                  <span className="text-[#191970] block text-base sm:text-lg font-black uppercase tracking-wider">SkillRack Rank</span>
                  <span className="text-2xl sm:text-4xl font-black block mt-2 text-blue-950">{skillRackNormalized.rank || 'N/A'}</span>
                </div>
                <div className="bg-slate-50/70 border-2 border-slate-200 p-6 sm:p-7 rounded-3xl text-center shadow-sm">
                  <span className="text-[#191970] block text-base sm:text-lg font-black uppercase tracking-wider">Total Points</span>
                  <span className="text-2xl sm:text-4xl font-black block mt-2 text-slate-900">{skillRackNormalized.points}</span>
                </div>
                <div className="bg-slate-50/70 border-2 border-slate-200 p-6 sm:p-7 rounded-3xl text-center shadow-sm">
                  <span className="text-[#191970] block text-base sm:text-lg font-black uppercase tracking-wider">Total Solved</span>
                  <span className="text-2xl sm:text-4xl font-black block mt-2 text-slate-900">{skillRackNormalized.totalPrograms}</span>
                </div>
                <div className="bg-emerald-50/70 border-2 border-emerald-200 p-6 sm:p-7 rounded-3xl text-center shadow-sm">
                  <span className="text-[#191970] block text-base sm:text-lg font-black uppercase tracking-wider">Aptitude Score</span>
                  <span className="text-2xl sm:text-4xl font-black block mt-2 text-emerald-700">{skillRackNormalized.aptitudeTest || 0}</span>
                </div>
              </div>

              {/* Medals Count row with 3 Columns */}
              <div className="bg-slate-50/70 border-2 border-slate-200 p-6 sm:p-8 rounded-3xl space-y-4">
                <div className="flex items-center space-x-2">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide">Medals Achieved</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="flex items-center space-x-5 bg-amber-50 border-2 border-amber-300 px-6 py-5 rounded-2xl text-amber-900 shadow-2xs">
                    <span className="text-4xl sm:text-5xl">🥇</span>
                    <div>
                      <span className="text-sm sm:text-base font-black uppercase text-[#191970] block">Gold Medals</span>
                      <span className="text-2xl sm:text-3xl font-black block leading-tight mt-1">{skillRackNormalized.goldMedals ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-5 bg-slate-100 border-2 border-slate-300 px-6 py-5 rounded-2xl text-slate-900 shadow-2xs">
                    <span className="text-4xl sm:text-5xl">🥈</span>
                    <div>
                      <span className="text-sm sm:text-base font-black uppercase text-[#191970] block">Silver Medals</span>
                      <span className="text-2xl sm:text-3xl font-black block leading-tight mt-1">{skillRackNormalized.silverMedals ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-5 bg-amber-100/60 border-2 border-amber-400 px-6 py-5 rounded-2xl text-amber-950 shadow-2xs">
                    <span className="text-4xl sm:text-5xl">🥉</span>
                    <div>
                      <span className="text-sm sm:text-base font-black uppercase text-[#191970] block">Bronze Medals</span>
                      <span className="text-2xl sm:text-3xl font-black block leading-tight mt-1">{skillRackNormalized.medals ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Metrics with 6 Separated Columns */}
              <div className="bg-white border-2 border-slate-300 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center justify-center space-x-2.5 border-b-2 border-slate-200 pb-3 mb-4 text-center">
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide text-center">Platform Metrics</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {[
                    { label: "Daily Challenges", value: skillRackNormalized.dailyChallenge },
                    { label: "Daily Tests", value: skillRackNormalized.dailyTest },
                    { label: "Code Tracks", value: skillRackNormalized.codeTracks },
                    { label: "Code Tests", value: skillRackNormalized.codeTests },
                    { label: "Code Tutorials", value: skillRackNormalized.codeTutorial },
                    { label: "Data Structures", value: skillRackNormalized.dataStructurePrograms },
                  ].map((m, idx) => (
                    <div key={idx} className="bg-slate-50/70 p-5 rounded-2xl border-2 border-slate-200 flex flex-col items-center text-center justify-between shadow-2xs hover:border-indigo-300 transition-colors">
                      <span className="text-xs sm:text-sm text-[#191970] font-black uppercase tracking-wider">{m.label}</span>
                      <span className="font-black text-slate-900 text-xl sm:text-2xl mt-2">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level Progress & Detailed Track Breakdown */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 border-b-2 border-slate-200 pb-3">
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide flex items-center gap-3">
                    <Code size={24} className="stroke-[2.5]" />
                    <span>SkillRack Level 1 to Level 6 Details & Progress</span>
                  </h4>
                </div>

                {/* Level Details Breakdown Cards (Level 1 to Level 6) */}
                <div className="space-y-5">
                  {[
                    {
                      level: 1,
                      key: "level1",
                      title: "Level 1: Language wise challenges (Tracks)",
                      border: "border-sky-300",
                      headerBg: "bg-sky-50 text-sky-950",
                      badgeBg: "bg-sky-100 text-sky-800 border-sky-300",
                      items: [
                        { key: "c", label: "C Programming", target: 640 },
                        { key: "cpp", label: "C++ Programming", target: 180 },
                        { key: "java", label: "Java Programming", target: 230 },
                        { key: "python", label: "Python Programming", target: 180 },
                        { key: "mysql", label: "SQL - Structured Query Language", target: 53 },
                        { key: "ds_c", label: "Data Structures in C", target: 10, unit: "Chapters" },
                        { key: "ds_java", label: "Data Structures in Java", target: 15, unit: "Chapters" },
                      ],
                    },
                    {
                      level: 2,
                      key: "level2",
                      title: "Level 2: Kickstart",
                      border: "border-emerald-300",
                      headerBg: "bg-emerald-50 text-emerald-950",
                      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
                      items: [
                        { key: "kickstart", label: "KICKSTART for ABSOLUTE Beginner", target: 100 },
                      ],
                    },
                    {
                      level: 3,
                      key: "level3",
                      title: "Level 3: MNC Companies (TCS / CTS / WIPRO / INFOSYS)",
                      border: "border-amber-300",
                      headerBg: "bg-amber-50 text-amber-950",
                      badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
                      items: [
                        { key: "cts", label: "COGNIZANT CTS - 35 PROGRAMS", target: 35 },
                        { key: "infytq", label: "InfyTQ Programs", target: 15 },
                        { key: "other_mncs", label: "MNC COMPANIES PROGRAMS", target: 200 },
                      ],
                    },
                    {
                      level: 4,
                      key: "level4",
                      title: "Level 4: Data Structures & Algorithms",
                      border: "border-purple-300",
                      headerBg: "bg-purple-50 text-purple-950",
                      badgeBg: "bg-purple-100 text-purple-800 border-purple-300",
                      items: [
                        { key: "stack", label: "Stack", target: 10 },
                        { key: "heap", label: "Heap", target: 5 },
                        { key: "queue", label: "Queue", target: 5 },
                        { key: "binary_tree", label: "Binary Tree", target: 5 },
                        { key: "searching", label: "Searching Algorithms", target: 5 },
                        { key: "sorting", label: "Sorting Algorithms", target: 10 },
                      ],
                    },
                    {
                      level: 5,
                      key: "level5",
                      title: "Level 5: Product Companies (Higher Salary)",
                      border: "border-pink-300",
                      headerBg: "bg-pink-50 text-pink-950",
                      badgeBg: "bg-pink-100 text-pink-800 border-pink-300",
                      items: [
                        { key: "product_companies", label: "Product Companies Programs", target: 100 },
                      ],
                    },
                    {
                      level: 6,
                      key: "level6",
                      title: "Level 6: Dream Product Companies & Mini Project",
                      border: "border-cyan-300",
                      headerBg: "bg-cyan-50 text-cyan-950",
                      badgeBg: "bg-cyan-100 text-cyan-800 border-cyan-300",
                      items: [
                        { key: "mini_project", label: "Mini Project", target: 1 },
                        { key: "strings", label: "Strings", target: 5 },
                        { key: "greedy", label: "Greedy Algorithms", target: 5 },
                        { key: "comb_perm", label: "Combination & Permutation", target: 5 },
                        { key: "backtracking", label: "Backtracking", target: 5 },
                        { key: "dp", label: "Dynamic Programming", target: 35 },
                        { key: "graph", label: "Graph Algorithms", target: 10 },
                        { key: "regex", label: "Regular Expression", target: 5 },
                      ],
                    },
                  ].map((lvl) => {
                    const itemsObj = skillRackNormalized.levelDetails?.[lvl.key] || {};

                    return (
                      <div key={lvl.level} className={`border-2 ${lvl.border} rounded-3xl overflow-hidden bg-white shadow-xs`}>
                        {/* Level Header */}
                        <div className={`px-6 sm:px-8 py-4 sm:py-5 ${lvl.headerBg} border-b-2 border-slate-200 flex items-center justify-between`}>
                          <h5 className="text-lg sm:text-2xl font-black uppercase tracking-wide">{lvl.title}</h5>
                        </div>

                        {/* Sub-items Track Grid with Distinct Columns */}
                        <div className="p-6 sm:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50/40">
                          {lvl.items.map((it) => {
                            const val = Number(itemsObj[it.key]) || 0;

                            return (
                              <div
                                key={it.key}
                                className="p-5 sm:p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 bg-white shadow-2xs flex flex-col justify-between transition-all min-w-0"
                              >
                                <div>
                                  <h6 className="text-base sm:text-lg font-black text-slate-900 leading-snug break-words uppercase tracking-wide">{it.label}</h6>
                                </div>

                                <div className="mt-4 pt-3 border-t-2 border-slate-100 flex items-baseline">
                                  <span className={`text-2xl sm:text-3xl font-black ${val > 0 ? 'text-slate-900' : 'text-slate-800'}`}>
                                    {val}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* profile link */}
              {skillRackNormalized.profileUrl && (
                <div className="flex justify-end pt-4 border-t-2 border-slate-200">
                  <a
                    href={skillRackNormalized.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-800 font-black px-6 py-3 rounded-2xl border-2 border-indigo-200 hover:bg-indigo-100 transition text-lg shadow-2xs uppercase tracking-wider"
                  >
                    <Globe size={20} />
                    <span>View SkillRack Public Profile</span>
                  </a>
                </div>
              )}

            </div>
          )}
        </CollapsibleSection>

        {/* ========================================================
            14. OTHER PLATFORM DETAILS
        ======================================================== */}
        <CollapsibleSection
          title="Other Platform Details"
          icon={Globe}
          count={competencyCoding.length}
          isExpanded={expandedSections.otherPlatforms}
          onToggle={() => toggleSection('otherPlatforms')}
        >
          {competencyCoding.length === 0 ? (
            <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
              <p className="text-slate-500 text-lg font-medium italic">No other coding platform profiles recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {competencyCoding.map((r, idx) => {
                const pName = r.platform_name || r.platform || r.exam_name || 'Coding Platform';
                const totalSolved = Number(r.no_of_problems_solved) || 0;
                const easy = Number(r.easy_count) || 0;
                const med = Number(r.medium_count) || 0;
                const hard = Number(r.hard_count) || 0;
                const calculatedSum = easy + med + hard;
                const maxDifficulty = Math.max(calculatedSum, totalSolved, 1);

                return (
                  <div
                    key={r.id || idx}
                    className="bg-white rounded-3xl border-2 border-slate-300 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Platform Card Header */}
                      <div className="p-5 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 shadow-2xs flex items-center justify-center shrink-0">
                            <Code size={20} />
                          </div>
                          <h5 className="text-lg font-black text-slate-900 truncate">{pName}</h5>
                        </div>
                        {(r.level || r.score) && (
                          <span className="text-sm font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0">
                            {r.level || r.score}
                          </span>
                        )}
                      </div>

                      {/* Card Body - Problem Count & Rank with 2 Separated Columns */}
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl">
                            <span className="text-xs text-[#191970] font-black uppercase block">Solved</span>
                            <span className="text-3xl font-black text-slate-900 block mt-1">{totalSolved}</span>
                          </div>
                          <div className="bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl">
                            <span className="text-xs text-[#191970] font-black uppercase block">Rank</span>
                            <span className="text-3xl font-black text-slate-900 block mt-1">{r.rank || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Difficulty Breakdown with 3 Columns */}
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between text-xs font-black uppercase text-[#191970]">
                            <span>Difficulty Breakdown</span>
                            <span className="text-slate-400">Easy / Med / Hard</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="bg-emerald-50 border-2 border-emerald-200 p-2.5 rounded-xl">
                              <span className="text-xs text-emerald-800 font-extrabold block">Easy</span>
                              <span className="font-black text-slate-900 text-2xl mt-0.5 block">{easy}</span>
                            </div>
                            <div className="bg-amber-50 border-2 border-amber-200 p-2.5 rounded-xl">
                              <span className="text-xs text-amber-800 font-extrabold block">Med</span>
                              <span className="font-black text-slate-900 text-2xl mt-0.5 block">{med}</span>
                            </div>
                            <div className="bg-red-50 border-2 border-red-200 p-2.5 rounded-xl">
                              <span className="text-xs text-red-800 font-extrabold block">Hard</span>
                              <span className="font-black text-slate-900 text-2xl mt-0.5 block">{hard}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {(easy > 0 || med > 0 || hard > 0) && (
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex mt-2 border border-slate-200">
                              <div style={{ width: `${(easy / maxDifficulty) * 100}%` }} className="bg-emerald-500 h-full" title={`Easy: ${easy}`} />
                              <div style={{ width: `${(med / maxDifficulty) * 100}%` }} className="bg-amber-500 h-full" title={`Medium: ${med}`} />
                              <div style={{ width: `${(hard / maxDifficulty) * 100}%` }} className="bg-red-500 h-full" title={`Hard: ${hard}`} />
                            </div>
                          )}
                        </div>

                        {/* Description if available */}
                        {r.description && (
                          <div className="pt-3 border-t-2 border-slate-200">
                            <p className="text-sm font-semibold text-slate-700 leading-relaxed line-clamp-2" title={r.description}>
                              {r.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    {r.profile_url && (
                      <div className="px-5 py-3 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-end text-sm">
                        <a
                          href={r.profile_url.startsWith('http') ? r.profile_url : `https://${r.profile_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 font-black text-indigo-700 hover:text-indigo-900"
                        >
                          <span>View Profile</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>




        {/* ========================================================
            EXTRA SECTIONS (Scholarships, Approved Leaves, Certifications)
        ======================================================== */}
        <div className="pt-8 border-t-2 border-slate-300">
          <div className="flex items-center space-x-2 mb-6">
            <h3 className="text-xl font-black text-slate-900 tracking-wide uppercase">Additional Records</h3>
          </div>

          {/* Scholarships */}
          <CollapsibleSection
            title="Scholarships Received"
            icon={Award}
            count={scholarships.length}
            isExpanded={expandedSections.scholarships}
            onToggle={() => toggleSection('scholarships')}
          >
            {scholarships.length === 0 ? (
              <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <p className="text-slate-500 text-lg font-medium italic">No scholarships recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '900px', tableLayout: 'auto' }}>
                  <thead className="bg-slate-100/90">
                    <tr className="divide-x-2 divide-slate-300">
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[220px]">Scholarship Name</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[200px]">Provider Organization</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Type</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[100px]">Year</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[110px]">Status</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[110px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {scholarships.map((scholarship, index) => (
                      <tr key={scholarship.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{scholarship.name}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{scholarship.provider}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{scholarship.type}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{scholarship.year}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                          <span className={`text-lg sm:text-xl font-normal ${scholarship.status === "Received" ? "text-slate-900" :
                            scholarship.status === "Applied" ? "text-slate-900" :
                              "text-slate-900"
                            }`}>
                            {scholarship.status}
                          </span>
                        </td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">₹{scholarship.receivedAmount ? Number(scholarship.receivedAmount).toLocaleString('en-IN') : '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* Approved Leaves */}
          <CollapsibleSection
            title="Approved Leaves Log"
            icon={FileText}
            count={approvedLeaves.length}
            isExpanded={expandedSections.leaves}
            onToggle={() => toggleSection('leaves')}
          >
            {approvedLeaves.length === 0 ? (
              <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <p className="text-slate-500 text-lg font-medium italic">No leave logs recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '850px', tableLayout: 'auto' }}>
                  <thead className="bg-slate-100/90">
                    <tr className="divide-x-2 divide-slate-300">
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[150px]">Leave Type</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[250px]">Reason</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Start Date</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">End Date</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[110px]">Document</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {approvedLeaves.map((leave, index) => (
                      <tr key={leave.id || index} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{leave.leave_type}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">{leave.reason}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{leave.start_date ? leave.start_date.split("T")[0] : "N/A"}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">{leave.end_date ? leave.end_date.split("T")[0] : "N/A"}</td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                          {leave.document ? (
                            <a
                              href={resolveFileUrl(leave.document, "leaves")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-900 hover:text-slate-900 font-normal underline inline-flex items-center gap-1.5 text-lg sm:text-xl"
                            >
                              <span>View File</span>
                              <ExternalLink size={13} />
                            </a>
                          ) : (
                            <span className="text-slate-900 font-normal">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* Certifications */}
          <CollapsibleSection
            title="Certifications & Badges"
            icon={Award}
            count={certifications.length}
            isExpanded={expandedSections.certifications}
            onToggle={() => toggleSection('certifications')}
          >
            {certifications.length === 0 ? (
              <div className="p-6 bg-slate-50/50 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <p className="text-slate-500 text-lg font-medium italic">No certifications recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full border-2 border-slate-300 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-center divide-y-2 divide-slate-300" style={{ minWidth: '800px', tableLayout: 'auto' }}>
                  <thead className="bg-slate-100/90">
                    <tr className="divide-x-2 divide-slate-300">
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[250px]">Certification / Document</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[180px]">Type / Provider</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[130px]">Status</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[120px]">Date</th>
                      <th className="py-5 px-6 text-center text-base sm:text-lg font-black text-[#191970] uppercase tracking-wider min-w-[130px]">Credential File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {certifications.map((c, idx) => (
                      <tr key={c.id || idx} className="hover:bg-indigo-50/20 transition divide-x-2 divide-slate-200">
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">
                          {c.certificate_name || c.title || c.course_name || "Certificate"}
                        </td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-normal break-words leading-snug font-normal font-aptos">
                          {c.certificate_type || c.provider || c.organization || c.offered_by || "Academic"}
                        </td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                          <span className={`px-3 py-1 rounded-full text-base font-bold ${
                            (c.verification_status === "Approved" || c.status === "Approved" || c.status === "Completed")
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : (c.verification_status === "Rejected" || c.status === "Rejected")
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}>
                            {c.verification_status || c.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center text-slate-900 whitespace-nowrap font-normal font-aptos">
                          {formatDate(c.issue_date || c.date || c.certification_date || c.createdAt)}
                        </td>
                        <td className="py-6 px-6 text-lg sm:text-xl font-normal font-aptos py-6 px-6 text-center whitespace-nowrap font-normal font-aptos">
                          {c.certificate_file || c.file || c.certificate_pdf ? (
                            <a
                              href={resolveFileUrl(c.certificate_file || c.file || c.certificate_pdf, "certificates")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-900 hover:text-slate-900 font-normal underline inline-flex items-center gap-1.5 text-lg sm:text-xl"
                            >
                              <span>View PDF</span>
                              <ExternalLink size={13} />
                            </a>
                          ) : (
                            <span className="text-slate-900 font-normal">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-6 pb-12">
          <button
            onClick={() => navigate("/records/profile")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-4 px-12 rounded-2xl transition duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Back to Profile Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentBioData;

