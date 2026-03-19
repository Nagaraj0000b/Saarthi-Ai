/**
 * @fileoverview Root Application Component.
 * Orchestrates the global routing table and manages high-level application layout.
 * Integrates React Router for navigation across auth, user, and admin domains.
 * 
 * @module client/App
 * @requires react-router-dom
 */

import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import UserDashBoard from "@/pages/user/DashBoard";
import AdminDashBoard from "@/pages/admin/DashBoard";
import Earnings from "@/pages/user/Earnings";
import Platforms from "@/pages/user/Platforms";
import Settings from "@/pages/user/Settings";
import ShiftPlanner from "@/pages/user/ShiftPlanner";
import Suggestions from "@/pages/user/Suggestions";
import WeeklyReport from "@/pages/user/WeeklyReport";
import WorkLogs from "@/pages/user/WorkLogs";

/**
 * Main Application Router
 * Defines the public and protected route mappings.
 * 
 * @component App
 * @returns {JSX.Element}
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* Default Landing - Redirect to Login */}
        <Route path="/" element={<Navigate to="/signin" replace />} />
        
        {/* Authentication Domain */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* User Domain - Protected Views */}
        <Route path="/user/dashboard" element={<UserDashBoard />} />
        <Route path="/user/earnings" element={<Earnings />} />
        <Route path="/user/work-logs" element={<WorkLogs />} />
        <Route path="/user/suggestions" element={<Suggestions />} />
        <Route path="/user/weekly-report" element={<WeeklyReport />} />
        <Route path="/user/platforms" element={<Platforms />} />
        <Route path="/user/shift-planner" element={<ShiftPlanner />} />
        <Route path="/user/settings" element={<Settings />} />

        {/* Administrative Domain */}
        <Route path="/admin/dashboard" element={<AdminDashBoard />} />
        
        {/* Fallback - Catch-all redirect */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
