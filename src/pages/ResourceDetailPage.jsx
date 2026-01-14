// src/pages/ResourceDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPostForm, API_BASE } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import { useAuthStore } from "../store/authStore";
import "../css/ResourceDetailPage.css";

const RESOURCE_DETAIL_ENDPOINT = (id) => `/knowledge/resources/${id}/`;
const VERSION_UPLOAD_ENDPOINT = (id) => `/knowledge/resources/${id}/versions/`;
const SUBMIT_ENDPOINT = (id) => `/knowledge/resources/${id}/submit/`;
const PUBLISH_ENDPOINT = (id) => `/knowledge/resources/${id}/publish/`;
const UNPUBLISH_ENDPOINT = (id) => `/knowledge/resources/${id}/unpublish/`;
const BACKEND_BASE = API_BASE.replace("/api", "");

function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const isCouncil = role === "COUNCIL";

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // submit-for-review state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // publish / unpublish state
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState("");
  const [unpublishLoading, setUnpublishLoading] = useState(false);
  const [unpublishError, setUnpublishError] = useState("");
  const [unpublishSuccess, setUnpublishSuccess] = useState("");

  // Upload-new-version state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [metadataPairs, setMetadataPairs] = useState([
    { key: "", value: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  // Review history filter
  const [reviewVersionFilter, setReviewVersionFilter] = useState("ALL");

  // ---------- load resource ----------

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
    // reset upload + submit + publish + review filter when changing resource
    setShowUploadForm(false);
    setTitle("");
    setDescription("");
    setTagsText("");
    setMetadataPairs([{ key: "", value: "" }]);
    setNotes("");
    setFile(null);
    setUploadError("");
    setSubmitError("");
    setSubmitLoading(false);
    setPublishError("");
    setPublishSuccess("");
    setPublishLoading(false);
    setUnpublishError("");
    setUnpublishSuccess("");
    setUnpublishLoading(false);
    setReviewVersionFilter("ALL");
  }, [id]);

  // ---------- helpers ----------

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

  function renderTags() {
    if (!resource) return null;
    let tags = resource.tags_display || [];

    if (typeof tags === "string") {
      tags = tags.split(",").map((t) => t.trim());
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return <span style={{ fontSize: "0.9rem", color: "#777" }}>None</span>;
    }

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {tags.map((tag, index) => (
          <span
            key={index}
            style={{
              padding: "0.2rem 0.5rem",
              borderRadius: "999px",
              border: "1px solid #ddd",
              fontSize: "0.85rem",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }

  function renderMetadata() {
    if (!resource) return null;
    const metadata = resource.metadata || {};
    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return <p style={{ fontSize: "0.9rem", color: "#777" }}>None</p>;
    }

    return (
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          maxWidth: "500px",
        }}
      >
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td
                style={{
                  padding: "0.3rem 0.5rem",
                  borderBottom: "1px solid #eee",
                  fontWeight: 600,
                  width: "30%",
                }}
              >
                {k}
              </td>
              <td
                style={{
                  padding: "0.3rem 0.5rem",
                  borderBottom: "1px solid #eee",
                }}
              >
                {String(v)}
              </td>
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
      return <p style={{ fontSize: "0.9rem", color: "#777" }}>None</p>;
    }

    return (
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          maxWidth: "650px",
        }}
      >
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

  function renderReviewSteps() {
    if (!resource) return null;

    const steps = resource.review_steps || [];
    if (!Array.isArray(steps) || steps.length === 0) {
      return <p style={{ fontSize: "0.9rem", color: "#777" }}>No reviews yet.</p>;
    }

    const versionsInSteps = Array.from(
      new Set(steps.map((s) => s.version_number).filter((v) => v != null))
    ).sort((a, b) => a - b);

    const filteredSteps =
      reviewVersionFilter === "ALL"
        ? steps
        : steps.filter(
            (s) => s.version_number === Number(reviewVersionFilter)
          );

    const sorted = [...filteredSteps].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });

    return (
      <div>
        <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          <label>
            Filter by version:{" "}
            <select
              value={reviewVersionFilter}
              onChange={(e) => setReviewVersionFilter(e.target.value)}
            >
              <option value="ALL">All versions</option>
              {versionsInSteps.map((v) => (
                <option key={v} value={String(v)}>
                  v{v}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            borderLeft: "2px solid #ddd",
            paddingLeft: "1rem",
            marginTop: "0.5rem",
          }}
        >
          {sorted.map((step) => {
            const stage = formatStatus(step.stage);
            const decision = formatStatus(step.decision);
            const reviewer = step.reviewer_name || "Unknown reviewer";

            return (
              <div
                key={step.id}
                style={{ marginBottom: "1rem", position: "relative" }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: "#555",
                    position: "absolute",
                    left: "-1.1rem",
                    top: "0.4rem",
                  }}
                ></div>

                <div style={{ fontSize: "0.9rem" }}>
                  <strong>{stage}</strong> — {decision} (v
                  {step.version_number})
                </div>
                <div style={{ fontSize: "0.85rem", color: "#555" }}>
                  by {reviewer} · {formatDateTime(step.created_at)}
                </div>
                {step.comment && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      padding: "0.35rem 0.5rem",
                      background: "#f9f9f9",
                      borderRadius: "4px",
                      border: "1px solid #eee",
                    }}
                  >
                    {step.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- AI flags renderer ----------

  function renderAiFlags() {
    if (!resource) return null;
    const flags = resource.ai_flags || [];

    if (!Array.isArray(flags) || flags.length === 0) {
      return (
        <p style={{ fontSize: "0.9rem", color: "#777" }}>
          No AI issues detected.
        </p>
      );
    }

    const severityColor = (severity) => {
      switch (severity) {
        case "HIGH":
          return "#fee2e2";
        case "MEDIUM":
          return "#fef3c7";
        case "LOW":
        default:
          return "#ecfdf3";
      }
    };

    const sorted = [...flags].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sorted.map((flag) => (
          <div
            key={flag.id}
            style={{
              padding: "0.5rem 0.7rem",
              borderRadius: "4px",
              border: "1px solid #ddd",
              backgroundColor: severityColor(flag.severity),
              fontSize: "0.85rem",
            }}
          >
            <div style={{ marginBottom: "0.15rem" }}>
              <strong>{flag.flag_type}</strong> · severity{" "}
              <strong>{flag.severity}</strong> · v{flag.version_number}
            </div>
            <div>{flag.message}</div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#555",
                marginTop: "0.2rem",
              }}
            >
              {flag.created_at ? formatDateTime(flag.created_at) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------- metadata key/value editor ----------

  function updateMetadataPair(index, field, value) {
    setMetadataPairs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function addMetadataRow() {
    setMetadataPairs((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeMetadataRow(index) {
    setMetadataPairs((prev) => prev.filter((_, i) => i !== index));
  }

  // ---------- prefill upload form from existing resource ----------

  function prefillUploadFormFromResource() {
    if (!resource) return;

    setTitle(resource.title || "");
    setDescription(resource.description || "");

    let tags = resource.tags_display || [];
    if (typeof tags === "string") {
      tags = tags.split(",").map((t) => t.trim());
    }
    if (Array.isArray(tags)) {
      setTagsText(tags.join(", "));
    } else {
      setTagsText("");
    }

    const metadata = resource.metadata || {};
    const entries = Object.entries(metadata);
    if (entries.length > 0) {
      setMetadataPairs(
        entries.map(([k, v]) => ({
          key: k,
          value: String(v),
        }))
      );
    } else {
      setMetadataPairs([{ key: "", value: "" }]);
    }

    setNotes("");
    setFile(null);
    setUploadError("");
  }

  function handleToggleUploadForm() {
    if (!showUploadForm) {
      prefillUploadFormFromResource();
      setShowUploadForm(true);
    } else {
      setShowUploadForm(false);
    }
  }

  // Can upload new version when status is DRAFT / FLAGGED / APPROVED / REJECTED / CHANGES_REQUESTED
  const canUploadNewVersion =
    resource &&
    ["DRAFT", "FLAGGED", "APPROVED", "REJECTED", "CHANGES_REQUESTED"].includes(
      resource.status
    );

  // Can submit for review only when draft (you can extend this later)
  const canSubmitForReview = resource && resource.status === "DRAFT";

    // ---------- publish/unpublish based on latest review history ----------

  // Find latest PUBLISHED / UNPUBLISHED decision in review history
  const latestPubDecision = (() => {
    if (!resource) return null;
    const steps = resource.review_steps || [];

    // Only care about publish/unpublish decisions
    const pubSteps = steps.filter(
      (s) => s.decision === "PUBLISHED" || s.decision === "UNPUBLISHED"
    );
    if (pubSteps.length === 0) return null;

    let lastDecision = null;
    let lastTime = 0;

    pubSteps.forEach((step) => {
      const t = step.created_at ? new Date(step.created_at).getTime() : 0;
      if (t >= lastTime) {
        lastTime = t;
        lastDecision = step.decision;
      }
    });

    return lastDecision; // "PUBLISHED" or "UNPUBLISHED"
  })();

  // Council-only:
  // - If latest decision is PUBLISHED -> show Unpublish
  // - If latest decision is UNPUBLISHED -> show Publish
  // - If no publish/unpublish yet -> allow first Publish when Approved at Council
  const canPublish =
    resource &&
    isCouncil &&
    (
      latestPubDecision === "UNPUBLISHED" || // toggle back on
      (
        latestPubDecision === null &&
        resource.status === "APPROVED" &&
        resource.current_stage === "GOV_COUNCIL"
      )
    );

  const canUnpublish =
    resource &&
    isCouncil &&
    latestPubDecision === "PUBLISHED";


  // ---------- submit for champion review ----------

  async function handleSubmitForReview() {
    if (!resource) return;

    const ok = window.confirm(
      "Submit this resource for Champion review? You won't be able to edit it while it is in review."
    );
    if (!ok) return;

    setSubmitLoading(true);
    setSubmitError("");

    try {
      await apiPost(SUBMIT_ENDPOINT(resource.id), {});
      await loadResource();
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to submit resource for review.");
    } finally {
      setSubmitLoading(false);
    }
  }

  // ---------- publish resource ----------

  async function handlePublish() {
    if (!resource) return;

    const ok = window.confirm(
      "Publish this resource so it appears in the global Published list?"
    );
    if (!ok) return;

    setPublishLoading(true);
    setPublishError("");
    setPublishSuccess("");
    setUnpublishError("");
    setUnpublishSuccess("");

    try {
      await apiPost(PUBLISH_ENDPOINT(resource.id), {});
      await loadResource();
      setPublishSuccess("Resource published successfully.");
    } catch (err) {
      console.error(err);
      setPublishError("Failed to publish resource.");
    } finally {
      setPublishLoading(false);
    }
  }

  // ---------- unpublish resource ----------

  async function handleUnpublish() {
    if (!resource) return;

    const ok = window.confirm(
      "Unpublish this resource so it no longer appears in the Published list?"
    );
    if (!ok) return;

    setUnpublishLoading(true);
    setUnpublishError("");
    setUnpublishSuccess("");
    setPublishError("");
    setPublishSuccess("");

    try {
      await apiPost(UNPUBLISH_ENDPOINT(resource.id), {});
      await loadResource();
      setUnpublishSuccess("Resource unpublished successfully.");
    } catch (err) {
      console.error(err);
      setUnpublishError("Failed to unpublish resource.");
    } finally {
      setUnpublishLoading(false);
    }
  }

  // ---------- upload new version ----------

  async function handleUploadNewVersion(e) {
    e.preventDefault();
    setUploadError("");

    if (!file) {
      setUploadError("Please select a file.");
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();

      if (title) formData.append("title", title);
      if (description) formData.append("description", description);
      formData.append("file", file);
      if (tagsText) formData.append("tags", tagsText);

      const metadataObj = {};
      metadataPairs.forEach((pair) => {
        const k = pair.key.trim();
        if (!k) return;
        metadataObj[k] = pair.value;
      });

      if (Object.keys(metadataObj).length > 0) {
        formData.append("metadata", JSON.stringify(metadataObj));
      }

      if (notes) formData.append("notes", notes);

      await apiPostForm(VERSION_UPLOAD_ENDPOINT(resource.id), formData);

      await loadResource();

      setShowUploadForm(false);
      setTitle("");
      setDescription("");
      setTagsText("");
      setMetadataPairs([{ key: "", value: "" }]);
      setNotes("");
      setFile(null);
    } catch (err) {
      console.error(err);
      setUploadError("Failed to upload new version.");
    } finally {
      setUploadLoading(false);
    }
  }

  // ---------- render ----------

  // ---------- render ----------

if (loading) return <Loader />;

return (
  <div className="page-card resource-detail-page">
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="rd-back-btn"
    >
      ← Back
    </button>

    <ErrorMessage message={error} />
    {!resource && !error && <p>Resource not found.</p>}

    {resource && (
      <>
        {/* Top header / summary */}
        <header className="rd-header">
          <h1 className="rd-title">{resource.title}</h1>

          <p className="rd-status-line">
            <strong>Status:</strong> {formatStatus(resource.status)} ·{" "}
            <strong>Stage:</strong> {formatStatus(resource.current_stage)} ·{" "}
            <strong>Region:</strong> {resource.region || "-"}
            {resource.ai_flags && resource.ai_flags.length > 0 && (
              <span className="rd-status-flags">
                • AI flags: {resource.ai_flags.length}
              </span>
            )}
          </p>

          <p className="rd-description">{resource.description}</p>

          <p className="rd-meta-line">
            Uploaded: {formatDate(resource.created_at)} · Last updated:{" "}
            {formatDateTime(resource.updated_at)}
          </p>
        </header>

        {/* MAIN LAYOUT: left = core actions, right = side panels */}
        <div className="rd-layout">
          {/* LEFT COLUMN */}
          <div className="rd-main-column">
            {/* File */}
            <section className="rd-section rd-file-row">
              <div>
                <h2 className="rd-section-title">File</h2>
                <p className="rd-file-meta">
                  Current file for this resource.
                </p>
              </div>

              {getFileUrl() ? (
                <a
                  href={getFileUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="rd-file-btn"
                >
                  Open document
                </a>
              ) : (
                <span className="rd-muted">No file available.</span>
              )}
            </section>


            {/* Submit for review (employee) */}
            {canSubmitForReview && (
              <section className="rd-section">
                <h2 className="rd-section-title">Submit for Review</h2>
                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={submitLoading}
                  className="rd-primary-btn"
                >
                  {submitLoading
                    ? "Submitting for Champion Review..."
                    : "Submit for Champion Review"}
                </button>
                {submitError && (
                  <p className="rd-error-text">{submitError}</p>
                )}
              </section>
            )}

            {/* Publish / Unpublish (Council only) */}
            {(canPublish || canUnpublish) && (
              <section className="rd-section">
                <h2 className="rd-section-title">Publish Controls</h2>

                <div className="rd-actions-row">
                  {canPublish && (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishLoading}
                      className="rd-primary-btn"
                    >
                      {publishLoading ? "Publishing..." : "Publish Resource"}
                    </button>
                  )}

                  {canUnpublish && (
                    <button
                      type="button"
                      onClick={handleUnpublish}
                      disabled={unpublishLoading}
                      className="rd-secondary-btn"
                    >
                      {unpublishLoading
                        ? "Unpublishing..."
                        : "Unpublish Resource"}
                    </button>
                  )}
                </div>

                {publishError && (
                  <p className="rd-error-text">{publishError}</p>
                )}
                {publishSuccess && (
                  <p className="rd-success-text">{publishSuccess}</p>
                )}

                {unpublishError && (
                  <p className="rd-error-text">{unpublishError}</p>
                )}
                {unpublishSuccess && (
                  <p className="rd-success-text">{unpublishSuccess}</p>
                )}
              </section>
            )}

            {/* Versions + upload form */}
            {canUploadNewVersion && (
              <section className="rd-section">
                <div className="rd-section-header">
                  <h2 className="rd-section-title">Versions</h2>
                  <button
                    type="button"
                    onClick={handleToggleUploadForm}
                    className="rd-secondary-btn"
                  >
                    {showUploadForm
                      ? "Cancel New Version"
                      : "Upload New Version"}
                  </button>
                </div>

                {showUploadForm && (
                  <form
                    onSubmit={handleUploadNewVersion}
                    className="rd-upload-form"
                  >
                    <div className="rd-form-group">
                      <label>
                        Title (optional)
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="rd-form-group">
                      <label>
                        Description (optional)
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                        />
                      </label>
                    </div>

                    <div className="rd-form-group">
                      <label>
                        File *
                        <input
                          type="file"
                          onChange={(e) =>
                            setFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>

                    <div className="rd-form-group">
                      <label>
                        Tags (comma-separated)
                        <input
                          type="text"
                          value={tagsText}
                          onChange={(e) => setTagsText(e.target.value)}
                          placeholder="ai, cloud, security"
                        />
                      </label>
                    </div>

                    <div className="rd-form-group">
                      <label>Metadata (key / value pairs)</label>

                      {metadataPairs.map((pair, index) => (
                        <div className="rd-meta-row" key={index}>
                          <input
                            type="text"
                            placeholder="key (e.g. confidentiality)"
                            value={pair.key}
                            onChange={(e) =>
                              updateMetadataPair(
                                index,
                                "key",
                                e.target.value
                              )
                            }
                          />
                          <input
                            type="text"
                            placeholder="value (e.g. Internal)"
                            value={pair.value}
                            onChange={(e) =>
                              updateMetadataPair(
                                index,
                                "value",
                                e.target.value
                              )
                            }
                          />
                          {metadataPairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMetadataRow(index)}
                              className="rd-remove-meta-btn"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addMetadataRow}
                        className="rd-link-btn"
                      >
                        + Add metadata field
                      </button>
                    </div>

                    <div className="rd-form-group">
                      <label>
                        Notes (for this version)
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                        />
                      </label>
                    </div>

                    {uploadError && (
                      <p className="rd-error-text">{uploadError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="rd-primary-btn"
                    >
                      {uploadLoading ? "Uploading..." : "Save New Version"}
                    </button>
                  </form>
                )}

                <div className="rd-subsection">{renderVersions()}</div>
              </section>
            )}

            {!canUploadNewVersion && (
              <section className="rd-section">
                <h2 className="rd-section-title">Versions</h2>
                <div className="rd-subsection">{renderVersions()}</div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN (SIDEBAR) */}
          <aside className="rd-side-column">
            <section className="rd-side-card">
              <h2 className="rd-section-title">Tags</h2>
              {renderTags()}
            </section>

            <section className="rd-side-card">
              <h2 className="rd-section-title">Metadata</h2>
              {renderMetadata()}
            </section>

            <section className="rd-side-card">
              <h2 className="rd-section-title">AI Checks</h2>
              {renderAiFlags()}
            </section>

            <section className="rd-side-card">
              <h2 className="rd-section-title">Review History</h2>
              {renderReviewSteps()}
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

export default ResourceDetailPage;
