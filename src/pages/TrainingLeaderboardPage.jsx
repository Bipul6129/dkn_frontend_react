// src/pages/TrainingLeaderboardPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet } from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/TrainingCoursesPage.css"; // reuse training styles

const COURSES_ENDPOINT = "/training/courses/";
const LEADERBOARD_ENDPOINT = (courseId) =>
  `/training/courses/${courseId}/leaderboard/`;

function TrainingLeaderboardPage() {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;

  const [searchParams] = useSearchParams();
  const initialCourseFromUrl = searchParams.get("course") || "";

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState(
    initialCourseFromUrl
  );
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  // ---------- helpers ----------

  function formatDateTime(value) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "-";
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch {
      return "-";
    }
  }

  function formatPercent(p) {
    if (p == null) return "-";
    const num = typeof p === "number" ? p : Number(p);
    if (Number.isNaN(num)) return "-";
    return `${num.toFixed(2)}%`;
  }

  function formatStatus(value) {
    if (!value) return "";
    return value
      .toLowerCase()
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  const selectedCourse = useMemo(
    () =>
      courses.find((c) => String(c.id) === String(selectedCourseId)) || null,
    [courses, selectedCourseId]
  );

  // ---------- load courses on mount ----------

  useEffect(() => {
    async function loadCourses() {
      setCoursesLoading(true);
      setCoursesError("");

      try {
        const data = await apiGet(COURSES_ENDPOINT);
        const list = Array.isArray(data) ? data : [];
        setCourses(list);

        // if URL gave us a course id but it's not in list, or no id at all -> fallback to first
        if (!selectedCourseId && list.length > 0) {
          setSelectedCourseId(String(list[0].id));
        }
      } catch (err) {
        console.error(err);
        setCoursesError("Failed to load training courses for leaderboard.");
      } finally {
        setCoursesLoading(false);
      }
    }

    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- load leaderboard when selected course changes ----------

  useEffect(() => {
    if (!selectedCourseId) {
      setLeaderboard([]);
      return;
    }

    async function loadLeaderboard() {
      setLeaderboardLoading(true);
      setLeaderboardError("");

      try {
        const data = await apiGet(LEADERBOARD_ENDPOINT(selectedCourseId));
        setLeaderboard(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setLeaderboardError(
          "Failed to load leaderboard for this course (no access or no data)."
        );
        setLeaderboard([]);
      } finally {
        setLeaderboardLoading(false);
      }
    }

    loadLeaderboard();
  }, [selectedCourseId]);

  // ---------- render ----------

  if (coursesLoading) return <Loader />;

  return (
    <div className="page-card training-page">
      {/* Header */}
      <header className="training-header">
        <h1 className="training-title">Training Leaderboards</h1>
        <p className="training-subtitle">
          See who’s leading on each course. Select a course to view the top quiz
          performers.
        </p>
      </header>

      <ErrorMessage message={coursesError || leaderboardError} />

      {/* If no courses at all */}
      {courses.length === 0 ? (
        <p className="training-empty">
          No training courses are available for you yet, so there’s no
          leaderboard data.
        </p>
      ) : (
        <>
          {/* Course selector */}
          <section className="training-toolbar">
            <div className="training-field" style={{ marginBottom: 0 }}>
              <label>
                <span className="training-label">Select course</span>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="training-input"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.region})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Selected course summary */}
          {selectedCourse && (
            <section className="training-course-summary">
              <h2 className="training-course-title">
                {selectedCourse.title}
              </h2>
              <p className="training-course-meta">
                <strong>Region:</strong> {selectedCourse.region || "-"} ·{" "}
                <strong>Status:</strong> {formatStatus(selectedCourse.status)} ·{" "}
                <strong>Created:</strong>{" "}
                {new Date(selectedCourse.created_at).toLocaleDateString()}
              </p>
              {selectedCourse.description && (
                <p className="training-course-description">
                  {selectedCourse.description}
                </p>
              )}
            </section>
          )}

          {/* Leaderboard table */}
          <section className="training-table-wrapper">
            <h2 style={{ marginBottom: "0.75rem" }}>Leaderboard</h2>

            {leaderboardLoading ? (
              <Loader />
            ) : leaderboard.length === 0 ? (
              <p className="training-empty">
                No quiz attempts for this course yet. Once employees complete
                the quiz, they’ll appear here.
              </p>
            ) : (
              <table className="training-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Score</th>
                    <th>Percent</th>
                    <th>Passed?</th>
                    <th>Submitted at</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => {
                    const isCurrentUser = row.user_id === currentUserId;
                    return (
                      <tr
                        key={row.user_id}
                        className={
                          isCurrentUser ? "training-row-current-user" : ""
                        }
                      >
                        <td>{row.rank}</td>
                        <td>
                          {row.username}
                          {isCurrentUser && (
                            <span
                              style={{
                                marginLeft: "0.3rem",
                                fontSize: "0.8rem",
                                color: "#2563eb",
                              }}
                            >
                              (you)
                            </span>
                          )}
                        </td>
                        <td>
                          {row.score}/{row.total_questions}
                        </td>
                        <td>{formatPercent(row.percent)}</td>
                        <td>{row.is_passed ? "Yes" : "No"}</td>
                        <td>{formatDateTime(row.submitted_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!leaderboardLoading && leaderboard.length > 0 && (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.85rem",
                  color: "#555",
                }}
              >
                Showing top {leaderboard.length} learners for this course.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default TrainingLeaderboardPage;
