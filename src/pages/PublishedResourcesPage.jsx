// src/pages/PublishedResourcesPage.jsx
import { useEffect, useState } from "react";
import { apiGet, API_BASE } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/PublishedResourcesPage.css";

const BACKEND_BASE = API_BASE.replace("/api", "");

function PublishedResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet("/knowledge/resources/published/");
        setResources(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load published resources.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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

  function formatStatus(value) {
    if (!value) return "";
    return value
      .toLowerCase()
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  function getFileUrl(resource) {
    if (!resource) return null;
    const filePath = resource.latest_file || resource.submitted_file || null;
    if (!filePath) return null;
    if (filePath.startsWith("http")) return filePath;
    return BACKEND_BASE + filePath;
  }

  function renderTags(r) {
    let tags = r.tags_display || [];

    if (typeof tags === "string") {
      tags = tags.split(",").map((t) => t.trim());
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return <span className="pr-muted">None</span>;
    }

    return (
      <div className="pr-tags-row">
        {tags.map((tag, idx) => (
          <span key={idx} className="pr-tag-chip">
            {tag}
          </span>
        ))}
      </div>
    );
  }

  function renderMetadata(r) {
    const metadata = r.metadata || {};
    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return <p className="pr-muted">None</p>;
    }

    return (
      <div className="pr-meta-grid">
        {entries.map(([k, v]) => (
          <div key={k} className="pr-meta-row">
            <span className="pr-meta-key">{k}</span>
            <span className="pr-meta-value">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  const filtered = resources.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(s)) ||
      (r.description && r.description.toLowerCase().includes(s))
    );
  });

  if (loading) return <Loader />;

  return (
    <div className="pr-page">
      <header className="pr-header">
        <h1 className="pr-title">Published Knowledge Resources</h1>
        <p className="pr-subtitle">
          Browse published content that&apos;s available across the DKN.
        </p>

        <div className="pr-search-row">
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-search-input"
          />
        </div>
      </header>

      <ErrorMessage message={error} />

      {filtered.length === 0 ? (
        <p className="pr-muted">No resources found.</p>
      ) : (
        <ul className="pr-list">
          {filtered.map((r) => {
            const fileUrl = getFileUrl(r);
            return (
              <li key={r.id} className="pr-card">
                <div className="pr-card-main">
                  {/* LEFT SIDE: title + description */}
                  <div className="pr-card-left">
                    <h2 className="pr-card-title">{r.title}</h2>

                    {r.description && (
                      <p className="pr-card-description">{r.description}</p>
                    )}

                    <p className="pr-card-status">
                      <strong>Status:</strong> {formatStatus(r.status)} ·{" "}
                      <strong>Stage:</strong>{" "}
                      {formatStatus(r.current_stage)} ·{" "}
                      <strong>Region:</strong> {r.region || "-"}
                    </p>

                    <p className="pr-card-dates">
                      Submitted at: {formatDateTime(r.submitted_at)} <br />
                      Last updated: {formatDateTime(r.updated_at)}
                    </p>
                  </div>

                  {/* RIGHT SIDE: file + tags + metadata summary */}
                  <div className="pr-card-right">
                    <div className="pr-card-file">
                      <span className="pr-card-label">File</span>
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pr-file-link"
                        >
                          Open document
                        </a>
                      ) : (
                        <span className="pr-muted">No file available.</span>
                      )}
                    </div>

                    <div className="pr-card-section">
                      <span className="pr-card-label">Tags</span>
                      {renderTags(r)}
                    </div>

                    <div className="pr-card-section">
                      <span className="pr-card-label">Metadata</span>
                      {renderMetadata(r)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PublishedResourcesPage;
