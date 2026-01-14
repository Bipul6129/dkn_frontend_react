// src/pages/ReviewQueuePage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/ReviewQueuePage.css";

const REVIEW_QUEUE_ENDPOINT = "/knowledge/review-queue/";
const PAGE_SIZE = 5;

function ReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // simple client-side pagination
  const [page, setPage] = useState(1);

  async function loadQueue() {
    setLoading(true);
    setError("");

    try {
      const data = await apiGet(REVIEW_QUEUE_ENDPOINT);
      const sorted = (data || []).slice().sort((a, b) => {
        const da = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const db = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return db - da; // newest submitted first
      });
      setItems(sorted);
    } catch (err) {
      console.error(err);
      setError("Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
    [items.length]
  );
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visible = items.slice(startIndex, startIndex + PAGE_SIZE);

  function goToPage(newPage) {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  }

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

  // TAG RENDERING
  function renderTags(item) {
    let tags = item.tags_display || [];

    if (typeof tags === "string") {
      tags = tags.split(",").map((t) => t.trim());
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return <span className="rq-muted">None</span>;
    }

    const visibleTags = tags.slice(0, 3);
    const extraCount = tags.length - visibleTags.length;

    return (
      <div className="rq-tags">
        {visibleTags.map((tag, index) => (
          <span key={index} className="rq-tag-chip">
            {tag}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="rq-tags-more">+{extraCount} more</span>
        )}
      </div>
    );
  }

  function summarizeAiFlags(aiFlags) {
    const flags = aiFlags || [];
    if (!Array.isArray(flags) || flags.length === 0) {
      return <span className="rq-ai-pill rq-ai-ok">No issues</span>;
    }

    const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    let worst = "LOW";
    flags.forEach((f) => {
      const sev = f.severity || "LOW";
      if (order[sev] > order[worst]) worst = sev;
    });

    let severityClass = "rq-ai-low";
    if (worst === "MEDIUM") severityClass = "rq-ai-medium";
    if (worst === "HIGH") severityClass = "rq-ai-high";

    return (
      <span className={`rq-ai-pill ${severityClass}`}>
        {flags.length} flag{flags.length > 1 ? "s" : ""} (
        {worst.toLowerCase()})
      </span>
    );
  }

  if (loading) return <Loader />;

  return (
    <div className="rq-page">
      <header className="rq-header">
        <h1 className="rq-title">Review Queue</h1>
        <p className="rq-subtitle">
          Resources waiting for review in your region and stage.
        </p>
      </header>

      <ErrorMessage message={error} />

      {items.length === 0 && !error && (
        <p className="rq-empty">No resources in the queue.</p>
      )}

      {items.length > 0 && (
        <>
          <div className="rq-table-wrapper">
            <table className="rq-table">
              <thead>
                <tr>
                  <th className="rq-th">Title</th>
                  <th className="rq-th">Tags</th>
                  <th className="rq-th">Status</th>
                  <th className="rq-th">Stage</th>
                  <th className="rq-th">Region</th>
                  <th className="rq-th">Submitted at</th>
                  <th className="rq-th">AI flags</th>
                  <th className="rq-th">Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td className="rq-td">
                      <div className="rq-title-cell-main">{item.title}</div>
                      <div className="rq-title-cell-sub">ID: {item.id}</div>
                    </td>
                    <td className="rq-td">{renderTags(item)}</td>
                    <td className="rq-td">{formatStatus(item.status)}</td>
                    <td className="rq-td">
                      {formatStatus(item.current_stage)}
                    </td>
                    <td className="rq-td">{item.region || "-"}</td>
                    <td className="rq-td">
                      {formatDateTime(item.submitted_at)}
                    </td>
                    <td className="rq-td">{summarizeAiFlags(item.ai_flags)}</td>
                    <td className="rq-td">
                      <Link to={`/review-queue/${item.id}`} className="rq-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="rq-pagination">
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="rq-page-btn"
            >
              ‹ Prev
            </button>
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="rq-page-btn"
            >
              Next ›
            </button>
            <span className="rq-pagination-info">
              Showing {startIndex + 1}–
              {Math.min(startIndex + PAGE_SIZE, items.length)} of{" "}
              {items.length} results
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default ReviewQueuePage;
