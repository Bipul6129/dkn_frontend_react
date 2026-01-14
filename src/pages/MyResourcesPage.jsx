// src/pages/MyResourcesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet, apiDelete, API_BASE } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/MyResourcesPage.css";

const MY_RESOURCES_ENDPOINT = "/knowledge/resources/mine/";
const BACKEND_BASE = API_BASE.replace("/api", "");
const PAGE_SIZE = 5;

function MyResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // sorting
  const [sortField, setSortField] = useState("CREATED_AT"); // CREATED_AT | TITLE | STATUS | REGION
  const [sortDirection, setSortDirection] = useState("DESC"); // ASC | DESC

  // pagination
  const [currentPage, setCurrentPage] = useState(1);

  // 1) Load data once
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      setDeleteError("");

      try {
        const data = await apiGet(MY_RESOURCES_ENDPOINT);
        setResources(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load your resources.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // 2) Sync URL query params -> React state
  useEffect(() => {
    const urlStatus = searchParams.get("status") || "ALL";
    const urlRegion = searchParams.get("region") || "ALL";
    const urlSearch = searchParams.get("q") || "";
    const urlSortField = searchParams.get("sort") || "CREATED_AT";
    const urlSortDirection = searchParams.get("dir") || "DESC";
    const urlPageRaw = parseInt(searchParams.get("page") || "1", 10);
    const urlPage =
      Number.isNaN(urlPageRaw) || urlPageRaw < 1 ? 1 : urlPageRaw;

    if (urlStatus !== statusFilter) setStatusFilter(urlStatus);
    if (urlRegion !== regionFilter) setRegionFilter(urlRegion);
    if (urlSearch !== search) setSearch(urlSearch);
    if (urlSortField !== sortField) setSortField(urlSortField);
    if (urlSortDirection !== sortDirection) setSortDirection(urlSortDirection);
    if (urlPage !== currentPage) setCurrentPage(urlPage);
  }, [
    searchParams,
    statusFilter,
    regionFilter,
    search,
    sortField,
    sortDirection,
    currentPage,
  ]);

  // unique regions for dropdown
  const regionOptions = useMemo(() => {
    const set = new Set();
    resources.forEach((r) => {
      if (r.region) set.add(r.region);
    });
    return Array.from(set);
  }, [resources]);

  // helper to update URL query params
  function updateParams(updates) {
    const params = new URLSearchParams(searchParams);

    if ("status" in updates) {
      const v = updates.status;
      if (!v || v === "ALL") params.delete("status");
      else params.set("status", v);
    }

    if ("region" in updates) {
      const v = updates.region;
      if (!v || v === "ALL") params.delete("region");
      else params.set("region", v);
    }

    if ("search" in updates) {
      const v = (updates.search || "").trim();
      if (!v) params.delete("q");
      else params.set("q", v);
    }

    if ("sortField" in updates) {
      const v = updates.sortField;
      if (!v || v === "CREATED_AT") params.delete("sort");
      else params.set("sort", v);
    }

    if ("sortDirection" in updates) {
      const v = updates.sortDirection;
      if (!v || v === "DESC") params.delete("dir");
      else params.set("dir", v);
    }

    if ("page" in updates) {
      const v = updates.page;
      if (!v || v === 1) params.delete("page");
      else params.set("page", String(v));
    }

    setSearchParams(params, { replace: true });
  }

  // ----- filtering -----
  const filteredResources = useMemo(() => {
    const s = search.trim().toLowerCase();

    return resources.filter((res) => {
      if (statusFilter !== "ALL" && res.status !== statusFilter) return false;
      if (regionFilter !== "ALL" && res.region !== regionFilter) return false;

      if (s) {
        const title = (res.title || "").toLowerCase();
        let tags = res.tags_display || [];
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
  }, [resources, statusFilter, regionFilter, search]);

  // ----- sorting -----
  const sortedResources = useMemo(() => {
    const copy = [...filteredResources];

    copy.sort((a, b) => {
      let comp = 0;

      if (sortField === "CREATED_AT") {
        const da = a.created_at ? new Date(a.created_at) : null;
        const db = b.created_at ? new Date(b.created_at) : null;
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        comp = ta - tb;
      } else if (sortField === "TITLE") {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        comp = ta.localeCompare(tb);
      } else if (sortField === "STATUS") {
        const sa = (a.status || "").toLowerCase();
        const sb = (b.status || "").toLowerCase();
        comp = sa.localeCompare(sb);
      } else if (sortField === "REGION") {
        const ra = (a.region || "").toLowerCase();
        const rb = (b.region || "").toLowerCase();
        comp = ra.localeCompare(rb);
      }

      return sortDirection === "ASC" ? comp : -comp;
    });

    return copy;
  }, [filteredResources, sortField, sortDirection]);

  // ----- pagination -----
  const totalPages = Math.max(1, Math.ceil(sortedResources.length / PAGE_SIZE));
  const safePage =
    currentPage > totalPages ? totalPages : currentPage < 1 ? 1 : currentPage;
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageItems = sortedResources.slice(startIndex, startIndex + PAGE_SIZE);

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    updateParams({ page });
  }

  function prevPage() {
    goToPage(safePage - 1);
  }

  function nextPage() {
    goToPage(safePage + 1);
  }

  // ----- helpers -----

  function formatStatus(value) {
    if (!value) return "";
    return value
      .toLowerCase()
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
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

  function renderTags(resource) {
    let tags = resource.tags_display || [];

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

  function renderMetadataSummary(resource) {
    const metadata = resource.metadata || {};
    const entries = Object.entries(metadata);

    if (entries.length === 0) {
      return <span style={{ fontSize: "0.8rem", color: "#777" }}>None</span>;
    }

    const visible = entries.slice(0, 2);
    const extra = entries.length - visible.length;

    return (
      <span style={{ fontSize: "0.8rem" }}>
        {visible.map(([k, v], idx) => (
          <span key={k}>
            {idx > 0 && "; "}
            <strong>{k}</strong>=<span>{String(v)}</span>
          </span>
        ))}
        {extra > 0 && (
          <span style={{ color: "#555" }}>; +{extra} more fields</span>
        )}
      </span>
    );
  }

  function renderAiFlags(resource) {
    const flags = resource.ai_flags || [];
    if (!Array.isArray(flags) || flags.length === 0) {
      return <span style={{ fontSize: "0.8rem", color: "#777" }}>None</span>;
    }
    return (
      <span style={{ fontSize: "0.8rem", color: "#b45309" }}>
        {flags.length} flag{flags.length > 1 ? "s" : ""}
      </span>
    );
  }

  function renderFile(resource) {
    const filePath =
      resource.submitted_file || resource.latest_file || resource.file;

    if (!filePath) {
      return (
        <span style={{ fontSize: "0.8rem", color: "#777" }}>
          Draft (no submitted file)
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

  // which statuses should show an enabled delete button
  function canDeleteResource(res) {
    return [
      "DRAFT",
      "REJECTED",
      "FLAGGED",
      "UNPUBLISHED",
    ].includes(res.status);
  }

  async function handleDeleteResource(res) {
    setDeleteError("");

    const ok = window.confirm(
      `Delete resource "${res.title}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      await apiDelete(`/knowledge/resources/${res.id}/`);

      // remove from local state
      setResources((prev) => prev.filter((r) => r.id !== res.id));
    } catch (err) {
      console.error(err);
      setDeleteError("Failed to delete resource. It may be published or under review, or you may not have permission.");
    }
  }

  if (loading) return <Loader />;

  return (
    <div className="page-card my-resources-page">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">My Resources</h1>
          <p className="page-subtitle">
            View and manage the knowledge resources you’ve uploaded.
          </p>
        </div>
      </header>

      <ErrorMessage message={error || deleteError} />

      {/* Filters + Sorting row */}
      <section className="filters-row">
        {/* Status filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              updateParams({ status: e.target.value, page: 1 })
            }
            className="filter-select"
          >
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="FLAGGED">Flagged</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED">Unpublished</option>
          </select>
        </div>

        {/* Region filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="region-filter">
            Region
          </label>
          <select
            id="region-filter"
            value={regionFilter}
            onChange={(e) =>
              updateParams({ region: e.target.value, page: 1 })
            }
            className="filter-select"
          >
            <option value="ALL">All</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Search box */}
        <div className="filter-group filter-search">
          <label className="filter-label" htmlFor="search-input">
            Search
          </label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by title or tag..."
            value={search}
            onChange={(e) =>
              updateParams({ search: e.target.value, page: 1 })
            }
          />
        </div>

        {/* Sorting controls */}
        <div className="filter-group filter-sort">
          <label className="filter-label" htmlFor="sort-field">
            Sort by
          </label>
          <div className="sort-controls">
            <select
              id="sort-field"
              value={sortField}
              onChange={(e) =>
                updateParams({ sortField: e.target.value, page: 1 })
              }
              className="filter-select"
            >
              <option value="CREATED_AT">Uploaded date</option>
              <option value="TITLE">Title</option>
              <option value="STATUS">Status</option>
              <option value="REGION">Region</option>
            </select>

            <button
              type="button"
              className="sort-toggle-btn"
              onClick={() =>
                updateParams({
                  sortDirection: sortDirection === "ASC" ? "DESC" : "ASC",
                  page: 1,
                })
              }
            >
              {sortDirection === "ASC" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>
      </section>

      {/* Table + pagination */}
      {sortedResources.length === 0 ? (
        <p className="empty-state">No resources match your filters.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="resources-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Tags</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Region</th>
                  <th>Uploaded</th>
                  <th>Metadata</th>
                  <th>Version</th>
                  <th>AI Flags</th>
                  <th>File</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((res) => (
                  <tr key={res.id}>
                    <td className="cell-primary">{res.title}</td>
                    <td>{renderTags(res)}</td>
                    <td>{formatStatus(res.status)}</td>
                    <td>{formatStatus(res.current_stage)}</td>
                    <td>{res.region || "-"}</td>
                    <td>{formatDate(res.created_at)}</td>
                    <td>{renderMetadataSummary(res)}</td>
                    <td>
                      {res.submitted_version_number ||
                        res.latest_version_number ||
                        "-"}
                    </td>
                    <td>{renderAiFlags(res)}</td>
                    <td>{renderFile(res)}</td>
                    <td className="mr-actions-cell">
                      <Link to={`/my-resources/${res.id}`} className="mr-view-link">
                        View
                      </Link>

                      <button
                        type="button"
                        className="mr-delete-btn"
                        onClick={() => handleDeleteResource(res)}
                        disabled={!canDeleteResource(res)}
                      >
                        Delete
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="pagination">
            <button
              onClick={prevPage}
              disabled={safePage === 1}
              className="pagination-btn"
            >
              Prev
            </button>
            <span className="pagination-info">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={safePage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MyResourcesPage;
