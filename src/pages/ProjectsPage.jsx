// src/pages/ProjectsPage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import { useAuthStore } from "../store/authStore.js";
import "../css/ProjectsPage.css";

const PROJECTS_ENDPOINT = "/collab/projects/";
const PROJECT_DETAIL_ENDPOINT = (id) => `/collab/projects/${id}/`;
const REGIONS_ENDPOINT = "/accounts/regions/";

function ProjectsPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  const [projects, setProjects] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // create-project form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // simple search
  const [search, setSearch] = useState("");

  const canCreateProject = role === "EMPLOYEE" || role === "CHAMPION";

  // ---------- helpers ----------

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

  // ---------- load projects + regions ----------

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      setDeleteError("");

      try {
        const [projectsData, regionsData] = await Promise.all([
          apiGet(PROJECTS_ENDPOINT),
          apiGet(REGIONS_ENDPOINT),
        ]);

        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setRegions(Array.isArray(regionsData) ? regionsData : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load projects or regions.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // ---------- filtered list ----------

  const filteredProjects = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return projects;

    return projects.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const client = (p.client || "").toLowerCase();
      const region = (p.region || "").toLowerCase();
      return name.includes(s) || client.includes(s) || region.includes(s);
    });
  }, [projects, search]);

  // ---------- create project ----------

  function resetCreateForm() {
    setName("");
    setClient("");
    setRegion("");
    setDescription("");
    setStatus("ACTIVE");
    setCreateError("");
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    setCreateError("");

    if (!name.trim()) {
      setCreateError("Project name is required.");
      return;
    }

    if (!region) {
      setCreateError("Region is required.");
      return;
    }

    setCreateLoading(true);

    try {
      const body = {
        name: name.trim(),
        client: client.trim() || null,
        region: region || null, // e.g. "EU", "GLOBAL"
        description: description.trim() || "",
        status: status || "ACTIVE",
      };

      const created = await apiPost(PROJECTS_ENDPOINT, body);

      setProjects((prev) => [created, ...prev]);
      resetCreateForm();
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      setCreateError("Failed to create project.");
    } finally {
      setCreateLoading(false);
    }
  }

  // ---------- delete project (lead / creator) ----------

  async function handleDeleteProject(project) {
    if (!project) return;

    const ok = window.confirm(
      `Delete project "${project.name}" and all related workspaces / assignments?`
    );
    if (!ok) return;

    setDeleteError("");
    setDeleteLoadingId(project.id);

    try {
      await apiDelete(PROJECT_DETAIL_ENDPOINT(project.id));
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      console.error(err);
      setDeleteError("Failed to delete project.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  // ---------- render ----------

  if (loading) return <Loader />;

  return (
    <div className="proj-page">
      <h1 className="proj-title">Projects</h1>

      <ErrorMessage message={error || deleteError} />

      {/* top bar: search + create */}
      <div className="proj-topbar">
        <div className="proj-topbar-left">
          <input
            type="text"
            className="proj-search-input"
            placeholder="Search by project name, client, or region..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {canCreateProject && (
          <button
            type="button"
            className="proj-primary-btn"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateError("");
            }}
          >
            {showCreateForm ? "Cancel" : "Create Project"}
          </button>
        )}
      </div>

      {/* create form */}
      {canCreateProject && showCreateForm && (
        <form onSubmit={handleCreateProject} className="proj-form-card">
          <div className="proj-form-row">
            <div className="proj-form-group proj-form-col">
              <label className="proj-label">
                Project name *
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="proj-input"
                />
              </label>
            </div>

            <div className="proj-form-group proj-form-col">
              <label className="proj-label">
                Client
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="proj-input"
                />
              </label>
            </div>
          </div>

          <div className="proj-form-row">
            <div className="proj-form-group proj-form-col">
              <label className="proj-label">
                Region *
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="proj-input"
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
                <p className="proj-help-text">
                  No regions loaded – check the /accounts/regions/ endpoint.
                </p>
              )}
            </div>

            <div className="proj-form-group proj-form-col">
              <label className="proj-label">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="proj-input"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PLANNING">Planning</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
            </div>
          </div>

          <div className="proj-form-group">
            <label className="proj-label">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="proj-textarea"
              />
            </label>
          </div>

          {createError && <p className="proj-error-text">{createError}</p>}

          <button
            type="submit"
            disabled={createLoading}
            className="proj-primary-btn"
          >
            {createLoading ? "Creating..." : "Save Project"}
          </button>
        </form>
      )}

      {/* list */}
      {filteredProjects.length === 0 ? (
        <p className="proj-empty">
          No projects found.{" "}
          {canCreateProject && !showCreateForm && "You can create one above."}
        </p>
      ) : (
        <table className="proj-table">
          <thead>
            <tr>
              <th className="proj-th">Name</th>
              <th className="proj-th">Client</th>
              <th className="proj-th">Region</th>
              <th className="proj-th">Status</th>
              <th className="proj-th">Lead</th>
              <th className="proj-th">Created</th>
              <th className="proj-th">Details</th>
              <th className="proj-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              const isLead = p.lead && user && p.lead.id === user.id;
              const isCreator =
                typeof p.created_by === "number" &&
                user &&
                p.created_by === user.id;

              const canDelete = isLead || isCreator;

              return (
                <tr key={p.id}>
                  <td className="proj-td">{p.name}</td>
                  <td className="proj-td">{p.client || "-"}</td>
                  <td className="proj-td">{p.region || "-"}</td>
                  <td className="proj-td">{formatStatus(p.status)}</td>
                  <td className="proj-td">
                    {p.lead?.username || p.created_by_name || "-"}
                  </td>
                  <td className="proj-td">{formatDate(p.created_at)}</td>
                  <td className="proj-td">
                    <Link to={`/projects/${p.id}`} className="proj-link">
                      Open
                    </Link>
                  </td>
                  <td className="proj-td">
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(p)}
                        disabled={deleteLoadingId === p.id}
                        className="proj-danger-btn"
                      >
                        {deleteLoadingId === p.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : (
                      <span className="proj-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProjectsPage;
