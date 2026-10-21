import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/LandingPage";
import DsaDashboard from "./pages/DsaDashboard";
import InterviewExp from "./pages/InterviewExp";
import ProfilePage from "./pages/ProfilePage";
import BirthdayCalendar from "./pages/BirthdayCalendar";
import AuthPage from "./pages/Signup";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/miniCompo/MainLayout";
import ProtectedRoute from "./utils/ProtectedRoute";

function App() {
  return (
    <>

      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/" element={<MainLayout />} >
          <Route index element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home />} />
          <Route path="dsa" element={<DsaDashboard />} />
          <Route path="interviewExp" element={<InterviewExp />} />
          <Route path="birthdays" element={<BirthdayCalendar />} />
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
