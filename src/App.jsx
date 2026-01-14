// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import TrainingCoursesPage from "./pages/TrainingCoursesPage.jsx";
import TrainingCourseDetailPage from "./pages/TrainingCourseDetailPage.jsx";
import AppLayout from "./components/Layout/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PublishedResourcesPage from "./pages/PublishedResourcesPage.jsx";
import MyResourcesPage from "./pages/MyResourcesPage.jsx";
import ResourceDetailPage from "./pages/ResourceDetailPage.jsx";
import UploadResourcePage from "./pages/UploadResourcePage.jsx";
import ReviewQueuePage from "./pages/ReviewQueuePage.jsx";
import MyReviewActionsPage from "./pages/MyReviewActionsPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import ProjectDetailPage from "./pages/ProjectDetailPage.jsx";
import WorkspacePage from "./pages/WorkspacePage.jsx";
import ReviewResourceDetailPage from "./pages/ReviewResourceDetailPage.jsx";
import TrainingLeaderboardPage from "./pages/TrainingLeaderboardPage.jsx";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      {/* Authenticated area */}
      <Route
        path="/"
        element={
          isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />
        }
      >
        {/* Default */}
        <Route index element={<PublishedResourcesPage />} />

        {/* Employee flows */}
        <Route path="my-resources" element={<MyResourcesPage />} />
        <Route path="my-resources/:id" element={<ResourceDetailPage />} />
        <Route path="upload" element={<UploadResourcePage />} />

        {/* Reviewer flows */}
        <Route path="review-queue" element={<ReviewQueuePage />} />
        <Route path="my-review-actions" element={<MyReviewActionsPage />} />

        {/* Collaboration projects (EMPLOYEE + CHAMPION see the nav) */}
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="workspaces/:workspaceId" element={<WorkspacePage />} />

        <Route path="training" element={<TrainingCoursesPage />} />
        <Route path="training/courses/:id" element={<TrainingCourseDetailPage />} />
        
        <Route path="review-queue/:id" element={<ReviewResourceDetailPage/>}/>
                <Route
          path="/training/leaderboard"
          element={<TrainingLeaderboardPage />}
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
