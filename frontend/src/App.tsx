import { Link, Route, Routes } from "react-router-dom";
import HistoryPage from "@/pages/HistoryPage";
import InterviewPage from "@/pages/InterviewPage";
import SetupPage from "@/pages/SetupPage";

export default function App() {
  return (
    <div className="container">
      <nav className="nav">
        <Link to="/">New interview</Link>
        <Link to="/history">History</Link>
      </nav>
      <Routes>
        <Route path="/" element={<SetupPage />} />
        <Route path="/interview/:sessionId" element={<InterviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </div>
  );
}
