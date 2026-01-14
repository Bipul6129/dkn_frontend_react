// src/components/Layout/AppLayout.jsx
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import "../../css/AppLayout.css";

function AppLayout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const isReviewer =
    role === "CHAMPION" || role === "OFFICER" || role === "COUNCIL";

  const canSeeProjects = role === "EMPLOYEE" || role === "CHAMPION";

  return (
    <div className="app-root">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo-area">
          <img src="src/assets/logo_dkn.png" alt="DKN Logo" className="sidebar-logo-img" />
          <span className="sidebar-logo-text">DKN</span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Navigation</p>

          {/* Everyone sees Published */}
          <Link to="/" className="sidebar-link">
            Published
          </Link>

          {/* Employee navigation */}
          {role === "EMPLOYEE" && (
            <>
              <Link to="/my-resources" className="sidebar-link">
                My Resources
              </Link>
              <Link to="/upload" className="sidebar-link">
                Upload Resource
              </Link>
              <Link to="/training" className="sidebar-link">
                Training
              </Link>
            </>
          )}

          {/* Reviewer navigation */}
          {isReviewer && (
            <>
              <Link to="/review-queue" className="sidebar-link">
                Review Queue
              </Link>
              <Link to="/my-review-actions" className="sidebar-link">
                My Review Actions
              </Link>
            </>
          )}

          {role === "CHAMPION" && (
            <Link to="/training" className="sidebar-link">
              Training
            </Link>
          )}

          {/* Collaboration Projects */}
          {canSeeProjects && (
            <Link to="/projects" className="sidebar-link">
              Projects &amp; Collaboration
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN AREA */}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">Dashboard</div>
          {user && (
            <div className="topbar-user">
              <span className="topbar-user-name">{user.username}</span>
              <span className="topbar-user-role">{role}</span>
            </div>
          )}
        </header>

        <main className="app-content">
          {/* This is where each page (Published, Upload, etc.) is rendered */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
