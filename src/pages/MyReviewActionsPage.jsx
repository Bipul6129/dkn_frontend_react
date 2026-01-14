// src/pages/MyReviewActionsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, API_BASE } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";

const MY_REVIEW_ACTIONS_ENDPOINT = "/knowledge/review-actions/mine/";
const BACKEND_BASE = API_BASE.replace("/api", "");
const PAGE_SIZE = 5;

function MyReviewActionsPage() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [decisionFilter, setDecisionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet(MY_REVIEW_ACTIONS_ENDPOINT);
        setActions(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load your review actions.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ---- helpers ----

  function formatStatus(value) {
    if (!value) return "";
    return value
      .toLowerCase()
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

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

  function renderTags(action) {
    let tags = action.tags_display || [];

    if (typeof tags === "string") {
      tags = tags.split(",").map((t) => t.trim());
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return <span style={{ fontSize: "0.8rem", color: "#777" }}>None</span>;
    }

    const visible = tags.slice(0, 3);
    const extraCount = tags.length - visible.length;

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
        {visible.map((tag, index) => (
          <span
            key={index}
            style={{
              padding: "0.15rem 0.4rem",
              borderRadius: "999px",
              border: "1px solid #ddd",
              fontSize: "0.8rem",
            }}
          >
            {tag}
          </span>
        ))}
        {extraCount > 0 && (
          <span style={{ fontSize: "0.8rem", color: "#555" }}>
            +{extraCount} more
          </span>
        )}
      </div>
    );
  }

  function renderAiFlags(action) {
    const flags = action.ai_flags || [];
    if (!Array.isArray(flags) || flags.length === 0) {
      return <span style={{ fontSize: "0.8rem", color: "#777" }}>None</span>;
    }
    return (
      <span style={{ fontSize: "0.8rem", color: "#b45309" }}>
        {flags.length} flag{flags.length > 1 ? "s" : ""}
      </span>
    );
  }

  function renderFile(action) {
    const filePath =
      action.submitted_file || action.latest_file || action.file || null;

    if (!filePath) {
      return (
        <span style={{ fontSize: "0.8rem", color: "#777" }}>
          No file available
        </span>
      );
    }

    const url =
      filePath.startsWith("http") || filePath.startsWith("https")
        ? filePath
        : BACKEND_BASE + filePath;

    return (
      <a href={url} target="_blank" rel="noreferrer">
        File
      </a>
    );
  }

  // ---- filtering ----

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return actions.filter((action) => {
      if (
        decisionFilter !== "ALL" &&
        action.decision &&
        action.decision !== decisionFilter
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        action.status &&
        action.status !== statusFilter
      ) {
        return false;
      }

      if (s) {
        const title = (action.title || "").toLowerCase();
        let tags = action.tags_display || [];
        if (typeof tags === "string") {
          tags = tags.split(",").map((t) => t.trim());
        }
        const tagsJoined = Array.isArray(tags)
          ? tags.join(" ").toLowerCase()
          : "";

        if (!title.includes(s) && !tagsJoined.includes(s)) {
          return false;
        }
      }

      return true;
    });
  }, [actions, decisionFilter, statusFilter, search]);

  // ---- pagination ----

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage =
    currentPage > totalPages ? totalPages : currentPage < 1 ? 1 : currentPage;

  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function prevPage() {
    if (safePage > 1) setCurrentPage(safePage - 1);
  }

  function nextPage() {
    if (safePage < totalPages) setCurrentPage(safePage + 1);
  }

  if (loading) return <Loader />;

  return (
    <div>
      <h1>My Review Actions</h1>

      <ErrorMessage message={error} />

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          margin: "0.75rem 0 0.5rem",
        }}
      >
        {/* Decision filter */}
        <div>
          <label style={{ fontSize: "0.85rem" }}>
            Decision
            <select
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ marginLeft: "0.4rem", padding: "0.25rem" }}
            >
              <option value="ALL">All</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FLAGGED">Flagged</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="PUBLISHED">Published</option>
              <option value="UNPUBLISHED">Unpublished</option>
            </select>
          </label>
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          <input
            type="text"
            placeholder="Search by title or tag..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "100%", padding: "0.25rem 0.5rem" }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p>No review actions match your filters.</p>
      ) : (
        <>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Decision</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle}>Region</th>
                <th style={thStyle}>Version</th>
                <th style={thStyle}>AI Flags</th>
                <th style={thStyle}>Comment</th>
                <th style={thStyle}>File</th>
                <th style={thStyle}>Details</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((action) => (
                <tr key={action.id}>
                  <td style={tdStyle}>{formatDateTime(action.created_at)}</td>
                  <td style={tdStyle}>{formatStatus(action.decision)}</td>
                  <td style={tdStyle}>{action.title}</td>
                  <td style={tdStyle}>{renderTags(action)}</td>
                  <td style={tdStyle}>{action.region || "-"}</td>
                  <td style={tdStyle}>{action.version_number || "-"}</td>
                  <td style={tdStyle}>{renderAiFlags(action)}</td>
                  <td style={tdStyle}>
                    {action.comment ? (
                      <span style={{ fontSize: "0.8rem" }}>
                        {action.comment}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#777" }}>
                        -
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>{renderFile(action)}</td>
                  <td style={tdStyle}>
                    <Link to={`/my-resources/${action.resource_id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            style={{
              marginTop: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <button onClick={prevPage} disabled={safePage === 1}>
              Prev
            </button>
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button onClick={nextPage} disabled={safePage === totalPages}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "1px solid #ddd",
  fontWeight: "600",
};

const tdStyle = {
  padding: "0.5rem",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
  fontSize: "0.85rem",
};

export default MyReviewActionsPage;
