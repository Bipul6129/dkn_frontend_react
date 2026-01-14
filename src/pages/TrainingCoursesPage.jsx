// src/pages/TrainingCoursesPage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/TrainingCoursesPage.css";

const COURSES_ENDPOINT = "/training/courses/";
const REGIONS_ENDPOINT = "/accounts/regions/";

function TrainingCoursesPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  const [courses, setCourses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // delete state
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // Champion-only: create course (simple)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState(""); // e.g. "EU", "GLOBAL"
  const [status, setStatus] = useState("PUBLISHED");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [search, setSearch] = useState("");

  const isChampion = role === "CHAMPION";

  function formatDate(value) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleDateString();
    } catch {
      return "-";
    }
  }

  function formatStatus(value) {
    if (!value) return "";
    return value
      .toLowerCase()
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      setDeleteError("");

      try {
        const [coursesData, regionsData] = await Promise.all([
          apiGet(COURSES_ENDPOINT),
          apiGet(REGIONS_ENDPOINT),
        ]);

        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setRegions(Array.isArray(regionsData) ? regionsData : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load training courses or regions.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredCourses = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return courses;

    return courses.filter((c) => {
      const t = (c.title || "").toLowerCase();
      const d = (c.description || "").toLowerCase();
      const r = (c.region || "").toLowerCase();
      return t.includes(s) || d.includes(s) || r.includes(s);
    });
  }, [courses, search]);

  // -------- create course (Champion only) --------

  async function handleCreateCourse(e) {
    e.preventDefault();
    setCreateError("");

    if (!title.trim()) {
      setCreateError("Course title is required.");
      return;
    }

    if (!region) {
      setCreateError("Region is required (e.g. GLOBAL, EU).");
      return;
    }

    setCreateLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        region: region,
        status: status || "PUBLISHED",
      };

      const created = await apiPost(COURSES_ENDPOINT, body);
      setCourses((prev) => [created, ...prev]);

      setTitle("");
      setDescription("");
      setRegion("");
      setStatus("PUBLISHED");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      setCreateError("Failed to create training course.");
    } finally {
      setCreateLoading(false);
    }
  }

  // -------- delete course (Champion; backend enforces ownership) --------

  async function handleDeleteCourse(course) {
    if (!course) return;

    const ok = window.confirm(
      `Delete training course "${course.title}" and its materials/quiz?`
    );
    if (!ok) return;

    setDeleteError("");
    setDeleteLoadingId(course.id);

    try {
      await apiDelete(`${COURSES_ENDPOINT}${course.id}/`);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err) {
      console.error(err);
      setDeleteError("Failed to delete training course.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-card training-page">
      {/* Header */}
      <header className="training-header">
        <h1 className="training-title">Training</h1>
        <p className="training-subtitle">
          Browse training created by Knowledge Champions. Join sessions to build
          your skills and stay aligned with Velion best practices.
        </p>
      </header>

      <ErrorMessage message={error || deleteError} />

      {/* top bar */}
      <div className="training-toolbar">
        <input
          type="text"
          placeholder="Search by title, description, or region..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="training-search"
        />

        {isChampion && (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateError("");
            }}
            className="training-secondary-btn"
          >
            {showCreateForm ? "Cancel" : "Create Course"}
          </button>
        )}
      </div>

      {/* Champion create form */}
      {isChampion && showCreateForm && (
        <form onSubmit={handleCreateCourse} className="training-create-form">
          <div className="training-field">
            <label>
              <span className="training-label">Title *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="training-input"
              />
            </label>
          </div>

          <div className="training-field-row">
            <div className="training-field">
              <label>
                <span className="training-label">Region *</span>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="training-input"
                >
                  <option value="">Select region...</option>
                  {regions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              {regions.length === 0 && (
                <p className="training-help-text">
                  No regions loaded – check the /accounts/regions/ endpoint.
                </p>
              )}
            </div>

            <div className="training-field">
              <label>
                <span className="training-label">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="training-input"
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
            </div>
          </div>

          <div className="training-field">
            <label>
              <span className="training-label">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="training-textarea"
              />
            </label>
          </div>

          {createError && (
            <p className="training-error-text">{createError}</p>
          )}

          <div className="training-actions">
            <button
              type="submit"
              disabled={createLoading}
              className="training-primary-btn"
            >
              {createLoading ? "Creating..." : "Save Course"}
            </button>
          </div>
        </form>
      )}

      {/* list */}
      {filteredCourses.length === 0 ? (
        <p className="training-empty">
          No training courses available for you yet.
        </p>
      ) : (
        <div className="training-table-wrapper">
          <table className="training-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Region</th>
                <th>Status</th>
                <th>Created by</th>
                <th>Created</th>
                <th>Details</th>
                {isChampion && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((c) => {
                const isCreatorChampion =
                  isChampion && user && c.created_by === user.id;

                return (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{c.region || "-"}</td>
                    <td>{formatStatus(c.status)}</td>
                    <td>{c.created_by_name || "-"}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <Link to={`/training/courses/${c.id}`}>Open</Link>
                    </td>
                    {isChampion && (
                      <td>
                        {isCreatorChampion ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(c)}
                            disabled={deleteLoadingId === c.id}
                            className="training-danger-btn"
                          >
                            {deleteLoadingId === c.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "#999",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TrainingCoursesPage;
