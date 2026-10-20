import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './index.css';

// Context Providers
import { StudentProvider } from './records/contexts/StudentContext.jsx';
import { StaffProvider } from './records/contexts/StaffContext.jsx';
import { UserProvider } from './records/contexts/UserContext.jsx';
import { InternProvider } from "./records/contexts/InternContext.jsx";
import { DashboardProvider } from "./records/contexts/DashboardContext.jsx";
import { OrganizedEventProvider } from "./records/contexts/OrganizedEventContext.jsx";
import { AttendedEventProvider } from "./records/contexts/AttendedEventContext.jsx";
import { AppProvider } from './records/contexts/AppContext.jsx';
import { LocationProvider } from './records/contexts/LocationContext.jsx';
import { ScholarshipProvider } from './records/contexts/ScholarshipContext.jsx';
import { LeaveProvider } from './records/contexts/LeaveContext.jsx';
import { OnlineCoursesProvider } from './records/contexts/OnlineCoursesContext.jsx';
import { AchievementProvider } from "./records/contexts/AchievementContext.jsx";
import { HackathonProvider } from "./records/contexts/HackathonContext.jsx"; // NEW
import { StudentDataProvider } from './records/contexts/studentDataContext.jsx';
//import { CourseProvider } from './records/contexts/CourseContext.jsx';
import { ExtracurricularProvider } from "./records/contexts/ExtracurricularContext.jsx";
import { ProjectProvider } from "./records/contexts/ProjectContext.jsx";
import { CompetencyCodingProvider } from "./records/contexts/CompetencyCodingContext.jsx"; // NEW
import { PublicationProvider } from "./records/contexts/PublicationContext.jsx"; // NEW
import { StudentEducationProvider } from "./records/contexts/StudentEducationContext.jsx"; // NEW
import { NonCGPAProvider } from "./records/contexts/NonCGPAContext.jsx"; // NEW
import { NonCGPACategoryProvider } from "./records/contexts/NonCGPACategoryContext.jsx"; // NEW
import { CertificateProvider } from "./records/contexts/CertificateContext.jsx";
import { NPTELProvider } from './records/contexts/NPTELContext.jsx';
import { SkillRackProvider } from './records/contexts/SkillRackContext.jsx';
import { AuthProvider, useAuth } from './records/pages/auth/AuthContext.jsx';
import { SidebarProvider, useSidebar } from './records/contexts/SidebarContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { getCleanPath, getRedirectUrl } from './api';




// Main Website Components (from project/src/)
import Navbar from './components/Navbar';
// Duplicate Sidebar import removed
import Hero from './components/Hero';
//import QuickLinks from './components/QuickLinks';
import AcademicsOverview from './components/AcademicsOverview';
//import NewsSection from './components/NewsSection';
import Footer from './components/Footer';
import PlacementHighlights from './components/PlacementHighlights';
import ProgrammesOffered from './components/ProgrammesOffered';
import About from './components/About';
import CompaniesList from './components/CompaniesList';
import Preloader from './components/Preloader';
import FlashNews from './components/FlashNews';
import WhyNEC from './components/WhyNEC';
import VisionMissionSection from './components/VissionMissionSection';
import PlaceMent from './components/PlaceMent';
import ProgramsOffered from './components/ProgramsOffered';
import Events from './components/Events';
import News from './components/News';
import AllNewsPage from "./components/AllNewsPage";
import Campus from './components/Campus';
import Marquee from './components/Marquee';
import AllEventsPage from './components/AllEventsPage';
import FeesPayment from './components/FeesPayment';
import Result from './components/Result';
import About1 from './components/AboutUS';
import Scheme from './components/Scheme';
import Approval from './components/Approval';
import AuditedStatements from './components/AuditedStatements';
import Meeting from './components/meeting';
import ApprovalLetters from './components/Approval1';
import RegulationList from './components/RegulationList';
import ACADEMICCALENDER from './components/ACADEMICCALENDER';
import CSEDepartment from './components/CSEDepartment';
import AcademicDeanSection from './components/AcademicDeanSection';
import ACADEMICCOUNCIL from './components/ACADEMICCOUNCIL';
import GreenEnery from './components/GreenEnergy';
import GoverningCouncil from './components/GoverningCouncil';
import DeanSection from './components/DeanSection';
import MechDept from './components/MechDept';
import CivilDept from './components/CivilDept';
import ItDept from './components/ItDept';
import AdmissionProcess from './components/AdmissionProcess';
import ApplyNowButton from './components/ApplyNowButton';
import ChatbotWidget from './components/ChatbotWidget';

// Placement System Components (from placement/src/)
import PublicHome from './placement/components/publichome';
import Login from './placement/components/Login.jsx';
import HomePage from './placement/components/admin/AdminHome';
import AdminRecruiters from './placement/components/admin/company/AdminRecruiters';
import Drive from './placement/components/Drive';

import AdminUpcomingDrives from './placement/components/admin/AdminUpcommingDrives';
import AdminNavbar from './placement/components/admin/AdminNavbar';
import UpcomingDrives from './placement/components/student/UpcomingDrive';
import RegisteredStudents from './placement/components/admin/AdminRegisteredStudents';
import StudentRecruiter from './placement/components/student/StudentRecruiter';

import StaffRecruiter from './placement/components/staff/staffRecruiters';
import StaffUpcommingDrive from './placement/components/staff/staffUpcommingDrive';
import AdminHackathon from './placement/components/admin/Hackathon';
import StudentHackathon from './placement/components/student/Hackathon';
import StaffHackathon from './placement/components/staff/staffhackathon';
import StudentPlacementFeedback from './placement/components/student/placementFeedback';
import EligibleStudents from './placement/components/admin/elegibleStudents';
import AdminFeedback from './placement/components/admin/feedback';
import StaffEligibleStudents from './placement/components/staff/eligiblestudents';
import HackathonReport from './placement/components/admin/exportHackathon.jsx';
import StudentNPTEL from './records/pages/Student/StudentNPTEL.jsx';
import AdminNPTEL from './records/pages/admin/AdminNPTEL.jsx';


// Records System Components (from records/src/)
import RecordsLogin from './records/pages/auth/Login.jsx';
import AdminPanel from './records/pages/admin/AdminPanel.jsx';
import AddUser from './records/pages/admin/AddUser.jsx';
import StaffList from './records/pages/admin/StaffList.jsx';
import StudentList from './records/pages/admin/StudentList.jsx';
import StudentBackground from './records/pages/Student/StudentBackground.jsx';
import StudentPersonalDetails from './records/pages/Student/StudentPersonalDetails.jsx';
import StudentCourses from './records/pages/Student/StudentCourses.jsx';
import StudentEventAttended from './records/pages/Student/StudentEventAttended.jsx';
import StudentEventOrganized from './records/pages/Student/StudentEventOrganized.jsx';
import StudentCertificate from './records/pages/Student/StudentCertificate.jsx';
import StudentOnlineCourses from './records/pages/Student/StudentOnlineCourses.jsx';
import StudentAchievements from './records/pages/Student/StudentAchievements.jsx';
import StudentInternship from './records/pages/Student/StudentInternship.jsx';
import StudentScholarship from './records/pages/Student/StudentScholarship.jsx';
import StudentLeave from './records/pages/Student/StudentLeave.jsx';
import Hackathon from './records/pages/Student/StudentHackathons.jsx';
import ExtracurricularActivities from './records/pages/Student/ExtracurricularActivities.jsx';
import StudentProject from './records/pages/Student/StudentProject.jsx';
import StudentCompetency from './records/pages/Student/CompetencyCoding.jsx';
import Publication from './records/pages/Student/Publication.jsx';
import StudentEducation from './records/pages/Student/Education.jsx';
import NonCGPACourses from './records/pages/Student/NonCGPACourses.jsx';
import NonCGPACategoryManagement from './records/pages/admin/NonCGPACategoryManagement.jsx';
import StudentLeaveApproval from './records/pages/admin/StudentLeaveApproval.jsx';
import StudentSkillRackPage from './records/pages/Student/SkillrackPage.jsx';

import DepartmentManagement from './records/pages/admin/DepartmentManagement.jsx';
import RoleManagement from './records/pages/admin/RoleManagement.jsx';
import Holidays from './records/pages/admin/Holidays.jsx';
import TutorAllocation from './records/pages/admin/TutorAllocation.jsx';

import ActivityPage from './records/pages/StaffPage/ActivityPage.jsx';
import ActivityApprovalPage from './records/pages/admin/ActivityApprovalPage.clean.jsx';
import TLPApprovalPage from './records/pages/admin/TLPApprovalPage.jsx';
import TLPManagementPage from './records/pages/StaffPage/TLPManagementPage.jsx';
import TlpCommentsAdmin from './records/pages/admin/TlpCommentsAdmin.jsx';
import ResumeGenerator from './records/pages/Student/ResumeGenerator.jsx';


import Dashboard from './records/pages/StaffPage/Dashboard.jsx';
import RecordsSidebar from './records/components/Sidebar.jsx';
import { ToastContainer } from "react-toastify";
import MyProfile from './records/pages/MyProfile.jsx';
import Sheet from './records/pages/Sheet.jsx';
import Bulk from './records/pages/admin/Bulk.jsx';
import MyWard from './records/pages/StaffPage/MyWard.jsx';
import TutorDashboard from './records/pages/StaffPage/TutorDashboard.jsx';
import ForgotPassword from './records/pages/ForgetPassword.jsx';
import ResetPassword from './records/pages/ResetPassword.jsx';
import StudentBioData from './records/pages/Student/StudentBioData.jsx';
import StaffBioData from './records/pages/StaffPage/StaffBioData.jsx';
import StudentActivity from './records/pages/Student/StudentActivity.jsx';
import StudentMarksheets from './records/pages/Student/StudentMarksheets.jsx';
// New Staff Pages for Records
import DashboardPage from './records/pages/StaffPage/DashboardPage.jsx';
import ProposalsPage from './records/pages/StaffPage/ProposalsPage.jsx';
import EventsPage from './records/pages/StaffPage/EventsPage.jsx';
import IndustryPage from './records/pages/StaffPage/IndustryPage.jsx';
import CertificationsPage from './records/pages/StaffPage/CertificationsPage.jsx';
import ConferencesPage from './records/pages/StaffPage/ConferencesPage.jsx';
import JournalsPage from './records/pages/StaffPage/JournalsPage.jsx';
import BookChaptersPage from './records/pages/StaffPage/BookChaptersPage.jsx';
import EventsOrganizedPage from './records/pages/StaffPage/EventsOrganizedPage.jsx';
import HIndex from './records/pages/StaffPage/HIndex.jsx';
import ResourcePersonPage from './records/pages/StaffPage/ResourcePersonPage.jsx';
import SeedMoneyPage from './records/pages/StaffPage/SeedMoneyPage.jsx';
import RecognitionPage from './records/pages/StaffPage/RecognitionPage.jsx';
import MembershipPage from './records/pages/StaffPage/MembershipPage.jsx';
import PatentDevelopmentPage from './records/pages/StaffPage/PatentDevelopmentPage.jsx';
import ProjectMentorPage from './records/pages/StaffPage/ProjectMentorPage.jsx';
import ScholarManagementPage from './records/pages/StaffPage/ScholarManagementPage.jsx';
import EducationPage from './records/pages/StaffPage/EducationPage.jsx';
import ProjectProposalPage from './records/pages/StaffPage/ProjectProposal.jsx';
import PersonalForm from './records/pages/StaffPage/PersonalForm.jsx';
import OverDashboardPage from './records/pages/StaffPage/Dashboard.jsx';
import StaffActivitiesPage from './records/pages/admin/StaffActivities.jsx';
import StudentActivitiesPage from './records/pages/admin/StudentActivities.jsx';
import StaffFeedback from './placement/components/staff/stafffeedback';
import StaffMou from './records/pages/StaffPage/MOUPage.jsx';
import UploadSemMarksStaff from './records/pages/StaffPage/UploadSemMarks.jsx';
import StaffSkillRackManagement from './records/pages/StaffPage/StaffSkillRackPage.jsx';
import ITLPPage from './components/CSE/ITLPPage';
import EnhancedStaffResumeGenerator from './records/pages/StaffPage/staffResumeGenerator.jsx';
import StudentStatusPage from './records/pages/StaffPage/StudentStatusPage.jsx';

//Acadamic Routes
import AcadamicRoutes from "./acadamic/acadamicRoutes.jsx";
import { AuthProvider as AcadamicAuthProvider } from './acadamic/pages/auth/AuthContext';
import { Outlet } from 'react-router-dom';




// Get system context based on current path

const getCurrentSystem = (pathname: string): string => {
  const cleanPath = getCleanPath(pathname);
  if (cleanPath.startsWith('/placement/')) return 'placement';
  if (cleanPath.startsWith('/records/')) return 'records';
  return 'main';
};

const isAcademicPath = (pathname: string): boolean =>
  pathname === '/admin' ||
  pathname.startsWith('/admin/') ||
  pathname === '/staff' ||
  pathname.startsWith('/staff/') ||
  pathname === '/student' ||
  pathname.startsWith('/student/');

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth() as any;

  const currentPath = window.location.pathname;
  const system = getCurrentSystem(currentPath);

  // Wait until AuthContext finishes loading initial state
  if (loading) return null;

  if (!user) {
    switch (system) {
      case 'placement':
        window.location.href = getRedirectUrl('/placement/login');
        break;
      case 'records':
        window.location.href = getRedirectUrl('/records/login');
        break;
      default:
        window.location.href = getRedirectUrl('/');
        break;
    }
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    const adminRoles = ['superadmin', 'admin', 'deptadmin', 'acadamicadmin'];
    const isUserAdmin = adminRoles.includes(userRole);
    const isRouteAdmin = allowedRoles.some(r => adminRoles.includes(r.toLowerCase()));

    const isAllowed =
      allowedRoles.some(role => {
        const target = role.toLowerCase();
        return userRole === target || userRole.includes(target) || target.includes(userRole);
      }) || (isUserAdmin && isRouteAdmin);

    if (!isAllowed) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-2">You don't have permission to access this page.</p>
            <p className="text-sm text-gray-500 mb-4">
              Current role: {userRole || 'Unknown'} | Required roles: {allowedRoles.join(', ')}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = system === 'placement'
                  ? getRedirectUrl('/placement/login')
                  : system === 'records'
                    ? getRedirectUrl('/records/login')
                    : getRedirectUrl('/');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Layout for Placement System
interface PlacementLayoutProps {
  children: React.ReactNode;
}

const PlacementLayout: React.FC<PlacementLayoutProps> = ({ children }) => {
  const { user } = useAuth() as any;

  const role = user?.role;
  const isPlacementAdmin = role?.toLowerCase().includes("placementadmin");

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isPlacementAdmin && <AdminNavbar />}
      <div className={`${isPlacementAdmin ? "ml-64" : ""} flex-grow w-full p-6 md:p-8`}>
        {children}
      </div>
    </div>
  );
};

// Layout for Records System
interface RecordsLayoutProps {
  children: React.ReactNode;
  location: any;
}

const RecordsLayout: React.FC<RecordsLayoutProps> = ({ children, location }) => {
  const { user, loading } = useAuth();
  const { isCollapsed } = useSidebar();
  const noSidebarRoutes = [
    "/records/login",
    "/records/forgot-password"
  ];

  const shouldShowSidebar =
    !noSidebarRoutes.includes(location.pathname) &&
    !location.pathname.startsWith("/records/reset-password") &&
    !location.pathname.startsWith("/records/student-biodata") &&
    !loading &&
    !!user;

  const contentMargin = shouldShowSidebar
    ? (isCollapsed ? "ml-[70px]" : "ml-64")
    : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {shouldShowSidebar && <RecordsSidebar />}
      <div className={`${contentMargin} min-h-screen p-8 transition-all duration-300`}>
        <ToastContainer />
        <div className={shouldShowSidebar ? "max-w-[1600px] mx-auto" : "w-full max-w-[1750px] mx-auto"}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Component to get location for Records Layout
const RecordsLayoutWithLocation: React.FC<{ children: React.ReactNode; includeStudentProvider?: boolean }> = ({
  children,
}) => {
  const location = useLocation();
  return <RecordsLayout location={location}>{children}</RecordsLayout>;
};

// Acadamic Routes Wrapper
const AcadamicRoutesWrapper = () => {
  return (
    <AcadamicAuthProvider>
      <Outlet />
    </AcadamicAuthProvider>
  );
};

const renderAcadamicRoutes = (routes: any[], isRoot = true) => {
  return routes
    .filter((route: any) => !(isRoot && route.path === "*"))
    .map((route: any, index: number) => {
      if (route.children) {
        return (
          <Route key={index} path={route.path} element={route.element}>
            {renderAcadamicRoutes(route.children, false)}
          </Route>
        );
      }
      return <Route key={index} index={route.index} path={route.path} element={route.element} />;
    });
};

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ==================== MAIN WEBSITE ROUTES ==================== */}
      <Route path="/" element={
        <div className="flex flex-col min-h-screen bg-white">
          <Navbar />
          <ApplyNowButton />
          <FlashNews />
          <Hero />
          <WhyNEC />
          <VisionMissionSection />
          <PlaceMent />
          <ProgramsOffered />
          <Campus />
          <News />
          <Events />
          <div className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <Marquee />
            </div>
          </div>
          <Footer />
        </div>
      } />

      {/* Main Website Routes */}
      <Route path="/placement-highlights" element={<><Navbar /><ApplyNowButton /><PlacementHighlights /><Footer /></>} />
      <Route path="/fees-payment" element={<><Navbar /><ApplyNowButton /><FeesPayment /><Footer /></>} />
      <Route path="/programmes-offered" element={<><Navbar /><ApplyNowButton /><ProgrammesOffered /><Footer /></>} />
      <Route path="/about" element={<><Navbar /><ApplyNowButton /><About /><Footer /></>} />
      <Route path="/academics/overview" element={<><Navbar /><ApplyNowButton /><AcademicsOverview /><Footer /></>} />
      <Route path="/news" element={<><Navbar /><ApplyNowButton /><AllNewsPage /><Footer /></>} />
      <Route path="/all-events" element={<><Navbar /><ApplyNowButton /><AllEventsPage /><Footer /></>} />
      <Route path="/companies-visited" element={<><Navbar /><ApplyNowButton /><CompaniesList /><Footer /></>} />
      <Route path="/result" element={<><Navbar /><ApplyNowButton /><Result /><Footer /></>} />
      <Route path="/about-us" element={<><Navbar /><ApplyNowButton /><About1 /><Footer /></>} />
      <Route path="/scheme" element={<><Navbar /><ApplyNowButton /><Scheme /><Footer /></>} />
      <Route path="/approval" element={<><Navbar /><ApplyNowButton /><Approval /><Footer /></>} />
      <Route path="/auditedStatements" element={<><Navbar /><ApplyNowButton /><AuditedStatements /><Footer /></>} />
      <Route path="/meeting" element={<><Navbar /><ApplyNowButton /><Meeting /><Footer /></>} />
      <Route path="/approval1" element={<><Navbar /><ApplyNowButton /><ApprovalLetters /><Footer /></>} />
      <Route path="/regulationlist" element={<><Navbar /><ApplyNowButton /><RegulationList /><Footer /></>} />
      <Route path="/AcademicCalender" element={<><Navbar /><ApplyNowButton /><ACADEMICCALENDER /><Footer /></>} />
      <Route path="/cse-dept" element={<><Navbar /><ApplyNowButton /><CSEDepartment /><Footer /></>} />
      <Route path="/academicdeansection" element={<><Navbar /><ApplyNowButton /><AcademicDeanSection /><Footer /></>} />
      <Route path="/academiccouncil" element={<><Navbar /><ApplyNowButton /><ACADEMICCOUNCIL /><Footer /></>} />
      <Route path="/green-energy" element={<><Navbar /><ApplyNowButton /><GreenEnery /><Footer /></>} />
      <Route path="/governing-concil" element={<><Navbar /><ApplyNowButton /><GoverningCouncil /><Footer /></>} />
      <Route path="/admission" element={<><Navbar /><ApplyNowButton /><AdmissionProcess /><Footer /></>} />
      <Route path="/sa&ir" element={<><Navbar /><ApplyNowButton /><DeanSection /><Footer /></>} />
      <Route path="/mech-dept" element={<><Navbar /><ApplyNowButton /><MechDept /><Footer /></>} />
      <Route path="/civil-dept" element={<><Navbar /><ApplyNowButton /><CivilDept /><Footer /></>} />
      <Route path="/it-dept" element={<><Navbar /><ApplyNowButton /><ItDept /><Footer /></>} />
      <Route path="/departments/cse/itlp" element={<><Navbar /><ApplyNowButton /><ITLPPage /><Footer /></>} />


      {/* ==================== PLACEMENT SYSTEM ROUTES ==================== */}
      {/* Placement Public Routes */}
      <Route path="/placement" element={<PublicHome />} />
      <Route path="/placement/login" element={<Login />} />

      {/* Placement Protected Routes */}
      {/* Admin Routes */}
      <Route path="/placement/admin-home" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><HomePage /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/admin-recruiters" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><AdminRecruiters /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/admin-drive" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><Drive /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/admin-upcoming-drive" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><AdminUpcomingDrives /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/eligible-students" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><EligibleStudents /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/admin-feedback" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><AdminFeedback /></PlacementLayout>
        </ProtectedRoute>
      } />

      <Route path="/placement/admin-registered-students" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><RegisteredStudents /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/admin-hackathon" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><AdminHackathon /></PlacementLayout>
        </ProtectedRoute>
      } />
      <Route path="/placement/admin-hackathon-report" element={
        <ProtectedRoute allowedRoles={['Placementadmin']}>
          <PlacementLayout><HackathonReport /></PlacementLayout>
        </ProtectedRoute>
      } />



      <Route path="/placement/recruiters" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentRecruiter />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/placement/feedback" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentPlacementFeedback />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/placement/upcoming-drive" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <UpcomingDrives />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/placement/hackathon" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentHackathon />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />


      <Route path="/records/staff-recruiters" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <StaffRecruiter />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-upcomingdrive" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <StaffUpcommingDrive />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/eligible-staff-students" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <StaffEligibleStudents />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-feedback" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <StaffFeedback />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/staff-hackathon" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <StaffHackathon />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/upload-semmarks" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <UploadSemMarksStaff />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/tlp-comments" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><TlpCommentsAdmin /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/activity" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ActivityPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/tlp-management" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><TLPManagementPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/activity-approval" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><ActivityApprovalPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/tlp-approval" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><TLPApprovalPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      {/* ==================== RECORDS SYSTEM ROUTES ==================== */}
      {/* Records Public Routes */}
      <Route path="/records/login" element={<RecordsLogin />} />
      <Route path="/records/forgot-password" element={<ForgotPassword />} />
      <Route path="/records/reset-password/:token" element={<ResetPassword />} />

      {/* Records Protected Routes */}

      {/* Admin Routes */}
      <Route path="/records/admin" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><AdminPanel /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-list" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><StudentList /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-list" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><StaffList /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/add-user" element={
        <ProtectedRoute allowedRoles={['Superadmin']}>
          <RecordsLayoutWithLocation><AddUser /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/bulk" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><Bulk /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-activities" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><StaffActivitiesPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/department-management" element={
        <ProtectedRoute allowedRoles={['Superadmin']}>
          <RecordsLayoutWithLocation><DepartmentManagement /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/role-management" element={
        <ProtectedRoute allowedRoles={['Superadmin']}>
          <RecordsLayoutWithLocation><RoleManagement /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/holidays" element={
        <ProtectedRoute allowedRoles={['Superadmin']}>
          <RecordsLayoutWithLocation><Holidays /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-activities" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><StudentActivitiesPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-leave-approval" element={
        <ProtectedRoute allowedRoles={['Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><StudentLeaveApproval /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/tutor-allocation" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin', 'Admin']}>
          <RecordsLayoutWithLocation><TutorAllocation /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      {/* Staff Routes */}
      {/* <Route path="/records/staff" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><DashboardPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } /> */}

      <Route path="/records/staff" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <DashboardPage />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-dashboard" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation>
            <DashboardProvider>
              <OverDashboardPage />
            </DashboardProvider>
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/myward" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><MyWard /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/tutor-dashboard" element={
        <ProtectedRoute allowedRoles={['Staff', 'Admin', 'Superadmin', 'Deptadmin', 'SuperAdmin', 'DeptAdmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><TutorDashboard /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/tutor_dashboard" element={
        <Navigate to="/records/tutor-dashboard" replace />
      } />
      <Route path="/records/tutor%20dashboard" element={
        <Navigate to="/records/tutor-dashboard" replace />
      } />
      <Route path="/records/certificate-approval" element={
        <Navigate to="/records/staff-dashboard" replace />
      } />
      <Route path="/records/skillrack" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><StaffSkillRackManagement /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-status" element={
        <ProtectedRoute allowedRoles={['Staff', 'Admin', 'Superadmin', 'Deptadmin', 'SuperAdmin', 'DeptAdmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation><StudentStatusPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />


      <Route path="/records/proposals" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ProposalsPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/events" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><EventsPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/industry" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><IndustryPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/certifications" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><CertificationsPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/conferences" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ConferencesPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/journals" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><JournalsPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/book-chapters" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><BookChaptersPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/events-organized" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><EventsOrganizedPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/h-index" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><HIndex /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/resource-person" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ResourcePersonPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/seed-money" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><SeedMoneyPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/recognition" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><RecognitionPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/membership" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><MembershipPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/patent-product" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><PatentDevelopmentPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/project-mentors" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ProjectMentorPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/scholars" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ScholarManagementPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/education" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><EducationPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/project-proposal" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><ProjectProposalPage /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/personal" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><PersonalForm /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/staff-mou" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><StaffMou /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-resume-generator" element={
        <ProtectedRoute allowedRoles={['Staff']}>
          <RecordsLayoutWithLocation><EnhancedStaffResumeGenerator /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />



      {/* Student Routes - WITH StudentProvider */}
      <Route path="/records/student" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentBackground />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-background" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentBackground />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-skillrack" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentSkillRackPage />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-personal-details" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentPersonalDetails />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-activity" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentActivity />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/student-courses" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentCourses />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-event-attended" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentEventAttended />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-event-organized" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentEventOrganized />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-certificates" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentCertificate />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-online-courses" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentOnlineCourses />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-achievements" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentAchievements />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-internships" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentInternship />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-scholarships" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentScholarship />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-leave" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentLeave />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/studenthackathon" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <Hackathon />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      {/* <Route path="/records/student-resume-generator" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <ResumeGenerator />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } /> */}
      <Route path="/records/student-resume-generator" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <ResumeGenerator />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-profile" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}><MyProfile /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-biodata/:userId" element={
        <ProtectedRoute allowedRoles={['Student', 'Staff', 'Admin']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentBioData />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/staff-biodata/:userId" element={
        <ProtectedRoute allowedRoles={['Staff', 'Admin', 'Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation>
            <StaffBioData />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-extracurricular" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <ExtracurricularActivities />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-project" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentProject />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/student-competency" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentCompetency />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/student-publication" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <Publication />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/student-marksheets" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentMarksheets />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/student-education" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentEducation />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route path="/records/noncgpa" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <NonCGPACourses />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/noncgpa-category" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <NonCGPACategoryManagement />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/nptel" element={
        <ProtectedRoute allowedRoles={['Student']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <StudentNPTEL />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/nptel-course" element={
        <ProtectedRoute allowedRoles={['Superadmin', 'Deptadmin', 'acadamicadmin']}>
          <RecordsLayoutWithLocation includeStudentProvider={true}>
            <AdminNPTEL />
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />






      {/* Common Protected Routes (All authenticated users) */}
      <Route path="/records/profile" element={
        <ProtectedRoute>
          <RecordsLayoutWithLocation includeStudentProvider={true}><MyProfile /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/dashboard" element={
        <ProtectedRoute>
          <RecordsLayoutWithLocation>
            <DashboardProvider>
              <Dashboard />
            </DashboardProvider>
          </RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />
      <Route path="/records/sheet" element={
        <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
          <RecordsLayoutWithLocation><Sheet /></RecordsLayoutWithLocation>
        </ProtectedRoute>
      } />

      <Route element={<AcadamicRoutesWrapper />}>
        {renderAcadamicRoutes(AcadamicRoutes)}
      </Route>

      {/* Catch all route - redirect to home */}
      <Route path="*" element={
        <div className="flex flex-col min-h-screen bg-white">
          <Navbar />
          <ApplyNowButton />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
              <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
              <a
                href="/"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Home
              </a>
            </div>
          </div>
          <Footer />
        </div>
      } />
    </Routes>
  );
};

function App() {
  const [loading, setLoading] = useState(true);
  const shouldShowPreloader = !isAcademicPath(window.location.pathname);

  useEffect(() => {
    if (!shouldShowPreloader) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 4800); // Show preloader for 4.8 seconds
    return () => clearTimeout(timer);
  }, [shouldShowPreloader]);

  if (shouldShowPreloader && loading) return <Preloader />;

  return (
    <GoogleOAuthProvider clientId="493948268457-pop93h1dek4qf9tdnqancgrtcetrg1n7.apps.googleusercontent.com">
      <AuthProvider>
        <StudentDataProvider>
          <NPTELProvider>

            <CertificateProvider>
              <SkillRackProvider>

                <NonCGPACategoryProvider>
                  <NonCGPAProvider>
                    <StudentEducationProvider>
                      <ExtracurricularProvider>
                        <ProjectProvider>
                          <CompetencyCodingProvider>
                            <PublicationProvider>
                              <HackathonProvider>
                                <AchievementProvider>
                                  <OnlineCoursesProvider>
                                    <LeaveProvider>
                                      <OrganizedEventProvider>
                                        <ScholarshipProvider>
                                          <LocationProvider>
                                            <AppProvider>
                                              <AttendedEventProvider>
                                                <InternProvider>
                                                  <DashboardProvider>
                                                    <UserProvider>
                                                      <StudentProvider>
                                                        <StaffProvider>
                                                          <SidebarProvider>
                                                            <Router
                                                              future={{
                                                                v7_startTransition: true,
                                                                v7_relativeSplatPath: true
                                                              }}
                                                              basename={
                                                                import.meta.env.BASE_URL
                                                                  ? import.meta.env.BASE_URL.replace(/\/$/, '')
                                                                  : undefined
                                                              }
                                                            >
                                                              <AppRoutes />
                                                              <ChatbotWidget />
                                                            </Router>
                                                          </SidebarProvider>
                                                        </StaffProvider>
                                                      </StudentProvider>
                                                    </UserProvider>
                                                  </DashboardProvider>
                                                </InternProvider>
                                              </AttendedEventProvider>
                                            </AppProvider>
                                          </LocationProvider>
                                        </ScholarshipProvider>
                                      </OrganizedEventProvider>
                                    </LeaveProvider>
                                  </OnlineCoursesProvider>
                                </AchievementProvider>
                              </HackathonProvider>
                            </PublicationProvider>
                          </CompetencyCodingProvider>
                        </ProjectProvider>
                      </ExtracurricularProvider>
                    </StudentEducationProvider>
                  </NonCGPAProvider>
                </NonCGPACategoryProvider>
              </SkillRackProvider>
            </CertificateProvider>
          </NPTELProvider>


        </StudentDataProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

