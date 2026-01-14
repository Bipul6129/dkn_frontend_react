// src/pages/ReviewResourceDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, API_BASE } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/ReviewResourceDetailPage.css";

const RESOURCE_DETAIL_ENDPOINT = (id) => `/knowledge/resources/${id}/`;
const DECISION_ENDPOINT = (id) => `/knowledge/resources/${id}/decision/`;
const BACKEND_BASE = API_BASE.replace("/api", "");

function ReviewResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // decision form state
  const [decision, setDecision] = useState("APPROVED");
  const [comments, setComments] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionSuccess, setDecisionSuccess] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  async function loadResource() {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(RESOURCE_DETAIL_ENDPOINT(id));
      setResource(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load resource details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResource();
  }, [id]);

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

  function getFileUrl() {
    if (!resource) return null;
    const filePath = resource.submitted_file || resource.latest_file || null;
    if (!filePath) return null;
    if (filePath.startsWith("http")) return filePath;
    return BACKEND_BASE + filePath;
  }

  // ----- render helpers -----

  function renderTags() {
    if (!resource) return null;
    let tags = resource.tags_display || [];

    if (typeof tags === "string") {
      tags = tags.split(",").map((t) => t.trim());
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return <span className="rr-muted">None</span>;
    }

    const visible = tags.slice(0, 3);
    const extraCount = tags.length - visible.length;

    return (
      <div className="rr-tag-row">
        {visible.map((tag, index) => (
          <span key={index} className="rr-tag">
            {tag}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="rr-tag-more">+{extraCount} more</span>
        )}
      </div>
    );
  }

  function renderMetadata() {
    if (!resource) return null;
    const metadata = resource.metadata || {};
    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return <p className="rr-muted">None</p>;
    }

    return (
      <table className="rr-table">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="rr-table-label">{k}</td>
              <td className="rr-table-value">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderVersions() {
    if (!resource) return null;
    const versions = resource.versions || [];

    if (!Array.isArray(versions) || versions.length === 0) {
      return <p className="rr-muted">None</p>;
    }

    return (
      <table className="rr-table">
        <thead>
          <tr>
            <th style={thSmall}>Version</th>
            <th style={thSmall}>File</th>
            <th style={thSmall}>Created by</th>
            <th style={thSmall}>Created at</th>
            <th style={thSmall}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {versions
            .slice()
            .sort((a, b) => a.version_number - b.version_number)
            .map((v) => {
              const filePath = v.file;
              const url = filePath
                ? filePath.startsWith("http")
                  ? filePath
                  : BACKEND_BASE + filePath
                : null;
              return (
                <tr key={v.id}>
                  <td style={tdSmall}>{v.version_number}</td>
                  <td style={tdSmall}>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer">
                        File
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={tdSmall}>{v.created_by_name || "-"}</td>
                  <td style={tdSmall}>{formatDateTime(v.created_at)}</td>
                  <td style={tdSmall}>{v.notes || "-"}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    );
  }

  function renderAiFlags() {
    if (!resource) return null;
    const flags = resource.ai_flags || [];

    if (!Array.isArray(flags) || flags.length === 0) {
      return <p className="rr-muted">None</p>;
    }

    return (
      <ul className="rr-ai-list">
        {flags.map((f) => (
          <li key={f.id}>
            <strong>{f.flag_type}</strong> ({f.severity}) – {f.message}
          </li>
        ))}
      </ul>
    );
  }

  function renderReviewSteps() {
    if (!resource) return null;

    const steps = resource.review_steps || [];
    if (!Array.isArray(steps) || steps.length === 0) {
      return <p className="rr-muted">No reviews yet.</p>;
    }

    const sorted = [...steps].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });

    return (
      <div className="rr-timeline">
        {sorted.map((step) => {
          const stage = formatStatus(step.stage);
          const decisionText = formatStatus(step.decision);
          const reviewer = step.reviewer_name || "Unknown reviewer";

          return (
            <div key={step.id} className="rr-timeline-item">
              <div className="rr-timeline-dot" />
              <div>
                <div className="rr-timeline-title">
                  <strong>{stage}</strong> — {decisionText} (v
                  {step.version_number})
                </div>
                <div className="rr-timeline-meta">
                  by {reviewer} · {formatDateTime(step.created_at)}
                </div>
                {step.comment && (
                  <div className="rr-timeline-comment">{step.comment}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ---- decision submit ----

  const canMakeDecision =
    resource && resource.status === "PENDING_REVIEW";

  async function handleSubmitDecision(e) {
    e.preventDefault();
    if (!resource) return;

    setDecisionError("");
    setDecisionSuccess("");
    setDecisionLoading(true);

    try {
      await apiPost(DECISION_ENDPOINT(resource.id), {
        decision,
        comments,
      });

      setDecisionSuccess("Decision saved.");
      setComments("");
      await loadResource();
    } catch (err) {
      console.error(err);
      setDecisionError("Failed to submit decision.");
    } finally {
      setDecisionLoading(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="rr-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="rr-back-btn"
      >
        ← Back
      </button>

      <ErrorMessage message={error} />
      {!resource && !error && <p>Resource not found.</p>}

      {resource && (
        <>
          {/* Header */}
          <header className="rr-header">
            <h1 className="rr-title">{resource.title}</h1>

            <p className="rr-status-line">
              <strong>Status:</strong> {formatStatus(resource.status)} ·{" "}
              <strong>Stage:</strong> {formatStatus(resource.current_stage)} ·{" "}
              <strong>Region:</strong> {resource.region || "-"}
            </p>

            {resource.description && (
              <p className="rr-description">{resource.description}</p>
            )}

            <p className="rr-meta">
              Uploaded: {formatDate(resource.created_at)} · Last updated:{" "}
              {formatDateTime(resource.updated_at)}
            </p>
          </header>

          {/* Two-column layout */}
          <div className="rr-layout">
            {/* LEFT: details */}
            <div className="rr-main">
              <section className="rr-card">
                <h2 className="rr-section-title">File</h2>
                {getFileUrl() ? (
                  <a href={getFileUrl()} target="_blank" rel="noreferrer">
                    Open document
                  </a>
                ) : (
                  <span className="rr-muted">No file available.</span>
                )}
              </section>

              <section className="rr-card">
                <h2 className="rr-section-title">Tags</h2>
                {renderTags()}
              </section>

              <section className="rr-card">
                <h2 className="rr-section-title">Metadata</h2>
                {renderMetadata()}
              </section>

              <section className="rr-card">
                <h2 className="rr-section-title">Versions</h2>
                {renderVersions()}
              </section>

              <section className="rr-card">
                <h2 className="rr-section-title">AI Flags</h2>
                {renderAiFlags()}
              </section>

              <section className="rr-card">
                <h2 className="rr-section-title">Review History</h2>
                {renderReviewSteps()}
              </section>
            </div>

            {/* RIGHT: decision card */}
            <aside className="rr-side">
              <section className="rr-card rr-decision-card">
                <h2 className="rr-section-title">Record Decision</h2>

                {!canMakeDecision && (
                  <p className="rr-muted" style={{ marginBottom: "0.75rem" }}>
                    This resource is not currently in a state where you can
                    make a decision (status: {formatStatus(resource.status)}).
                  </p>
                )}

                {canMakeDecision && (
                  <form onSubmit={handleSubmitDecision}>
                    <div className="rr-form-group">
                      <label className="rr-label">
                        Decision
                        <select
                          value={decision}
                          onChange={(e) => setDecision(e.target.value)}
                          className="rr-select"
                        >
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="FLAGGED">Flagged</option>
                          <option value="CHANGES_REQUESTED">
                            Changes Requested
                          </option>
                        </select>
                      </label>
                    </div>

                    <div className="rr-form-group">
                      <label className="rr-label">
                        Comments{" "}
                        <span className="rr-label-hint">
                          (especially for FLAGGED / CHANGES_REQUESTED)
                        </span>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={3}
                          className="rr-textarea"
                          placeholder="Explain your decision for the uploader and next reviewers..."
                        />
                      </label>
                    </div>

                    {decisionError && (
                      <p className="rr-error-text">{decisionError}</p>
                    )}
                    {decisionSuccess && (
                      <p className="rr-success-text">{decisionSuccess}</p>
                    )}

                    <button
                      type="submit"
                      disabled={decisionLoading}
                      className="rr-primary-btn"
                    >
                      {decisionLoading ? "Saving..." : "Submit Decision"}
                    </button>
                  </form>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

const thSmall = {
  textAlign: "left",
  padding: "0.3rem 0.5rem",
  borderBottom: "1px solid #ddd",
  fontWeight: 600,
  fontSize: "0.85rem",
};

const tdSmall = {
  padding: "0.3rem 0.5rem",
  borderBottom: "1px solid #eee",
  fontSize: "0.85rem",
  verticalAlign: "top",
};

export default ReviewResourceDetailPage;
