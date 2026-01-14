// src/pages/ProjectDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../api/client.js";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/ProjectDetailPage.css";

const PROJECT_DETAIL_ENDPOINT = (id) => `/collab/projects/${id}/`;
const PROJECT_ASSIGNMENTS_ENDPOINT = (id) =>
  `/collab/projects/${id}/assignments/`;
const PROJECT_WORKSPACES_ENDPOINT = (id) => `/collab/projects/${id}/spaces/`;
const SPACE_DETAIL_ENDPOINT = (spaceId) => `/collab/spaces/${spaceId}/`;
const PROJECT_AVAILABLE_USERS_ENDPOINT = (id) =>
  `/collab/projects/${id}/available-users/`;
// We pass user_id (member id) in the URL, NOT assignment.id
const ASSIGNMENT_DETAIL_ENDPOINT = (projectId, userId) =>
  `/collab/projects/${projectId}/assignments/${userId}/`;

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [project, setProject] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  // add-member (lead only)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableUsersError, setAvailableUsersError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");
  const [addError, setAddError] = useState("");

  // create-workspace (lead only)
  const [showCreateWorkspaceForm, setShowCreateWorkspaceForm] = useState(false);
  const [wsTitle, setWsTitle] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [wsIsDefault, setWsIsDefault] = useState(false);
  const [wsCreateLoading, setWsCreateLoading] = useState(false);
  const [wsCreateError, setWsCreateError] = useState("");
  const [wsCreateSuccess, setWsCreateSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    setActionError("");
    setAddError("");
    setAddSuccess("");
    setAvailableUsersError("");
    setWsCreateError("");
    setWsCreateSuccess("");

    try {
      const proj = await apiGet(PROJECT_DETAIL_ENDPOINT(id));
      setProject(proj);

      const assignList = await apiGet(PROJECT_ASSIGNMENTS_ENDPOINT(id));
      setAssignments(assignList);

      const wsData = await apiGet(PROJECT_WORKSPACES_ENDPOINT(id));
      const wsArray = Array.isArray(wsData)
        ? wsData
        : wsData
        ? [wsData]
        : [];
      setWorkspaces(wsArray);

      // if current user is lead, load available users
      if (user && proj.lead && user.id === proj.lead.id) {
        try {
          const avUsers = await apiGet(PROJECT_AVAILABLE_USERS_ENDPOINT(id));
          setAvailableUsers(avUsers);
        } catch (err) {
          console.error(err);
          setAvailableUsersError(
            "Could not load users available for assignment."
          );
        }
      } else {
        setAvailableUsers([]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isProjectLead =
    project && user && project.lead && project.lead.id === user.id;

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

  function formatStatus(value) {
    if (!value) return "";
    return value
      .toLowerCase()
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  // ---------- add member ----------

  async function handleAddMember(e) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!selectedUserId) {
      setAddError("Please select a user to add.");
      return;
    }

    setAddLoading(true);
    try {
      await apiPost(PROJECT_ASSIGNMENTS_ENDPOINT(id), {
        user_id: selectedUserId,
        role: selectedRole, // MEMBER / REVIEWER / STAKEHOLDER
      });

      const updatedAssignments = await apiGet(
        PROJECT_ASSIGNMENTS_ENDPOINT(id)
      );
      setAssignments(updatedAssignments);

      try {
        const avUsers = await apiGet(PROJECT_AVAILABLE_USERS_ENDPOINT(id));
        setAvailableUsers(avUsers);
      } catch (err) {
        console.error(err);
        setAvailableUsersError(
          "Could not refresh users available for assignment."
        );
      }

      setSelectedUserId("");
      setSelectedRole("MEMBER");
      setAddSuccess("Member added to project.");
    } catch (err) {
      console.error(err);
      setAddError("Failed to add member. Check role / permissions.");
    } finally {
      setAddLoading(false);
    }
  }

  // ---------- remove member ----------

  async function handleRemoveMember(assignment) {
    if (!assignment) return;

    const username = assignment.user?.username || "this member";
    const userId = assignment.user?.id;

    if (!userId) {
      setActionError("Could not determine user id for this member.");
      return;
    }

    const ok = window.confirm(`Remove ${username} from the project team?`);
    if (!ok) return;

    try {
      setActionError("");
      await apiDelete(ASSIGNMENT_DETAIL_ENDPOINT(id, userId));

      const updatedAssignments = await apiGet(
        PROJECT_ASSIGNMENTS_ENDPOINT(id)
      );
      setAssignments(updatedAssignments);

      if (isProjectLead) {
        try {
          const avUsers = await apiGet(PROJECT_AVAILABLE_USERS_ENDPOINT(id));
          setAvailableUsers(avUsers);
        } catch (err) {
          console.error(err);
        }
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to remove project member.");
    }
  }

  // ---------- delete workspace ----------

  async function handleDeleteWorkspace(ws) {
    if (!ws) return;

    const ok = window.confirm(
      `Delete workspace "${ws.title}" and all its posts?`
    );
    if (!ok) return;

    try {
      setActionError("");
      await apiDelete(SPACE_DETAIL_ENDPOINT(ws.id));
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete workspace.");
    }
  }

  // ---------- create workspace (lead only) ----------

  function resetWorkspaceForm() {
    setWsTitle("");
    setWsDescription("");
    setWsIsDefault(false);
    setWsCreateError("");
    setWsCreateSuccess("");
  }

  async function handleCreateWorkspace(e) {
    e.preventDefault();
    setWsCreateError("");
    setWsCreateSuccess("");

    if (!wsTitle.trim()) {
      setWsCreateError("Workspace title is required.");
      return;
    }

    setWsCreateLoading(true);
    try {
      const body = {
        title: wsTitle.trim(),
        description: wsDescription.trim() || "",
        is_default: wsIsDefault,
      };

      const created = await apiPost(PROJECT_WORKSPACES_ENDPOINT(id), body);

      setWorkspaces((prev) => [created, ...prev]);

      resetWorkspaceForm();
      setShowCreateWorkspaceForm(false);
      setWsCreateSuccess("Workspace created.");
    } catch (err) {
      console.error(err);
      setWsCreateError("Failed to create workspace.");
    } finally {
      setWsCreateLoading(false);
    }
  }

  // ---------- render helper sections ----------

  function renderAssignmentsTable() {
    if (!assignments || assignments.length === 0) {
      return <p className="proj-muted">No project members yet.</p>;
    }

    return (
      <table className="proj-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Email</th>
            <th>Role</th>
            <th>Assigned at</th>
            {isProjectLead && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => (
            <tr key={a.id}>
              <td>{a.user?.username || "-"}</td>
              <td>{a.user?.email || "-"}</td>
              <td>{formatStatus(a.role)}</td>
              <td>{formatDateTime(a.assigned_at)}</td>
              {isProjectLead && (
                <td>
                  {a.role === "LEAD" ? (
                    <span className="proj-tag">Lead</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(a)}
                      className="proj-btn-text"
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderWorkspacesList() {
    if (!workspaces || workspaces.length === 0) {
      return <p className="proj-muted">No workspaces created yet.</p>;
    }

    return (
      <div className="proj-workspace-list">
        {workspaces.map((ws) => (
          <div key={ws.id} className="proj-workspace-card">
            <div className="proj-workspace-main">
              <div className="proj-workspace-title">{ws.title}</div>
              {ws.description && (
                <div className="proj-workspace-desc">{ws.description}</div>
              )}
              <div className="proj-workspace-meta">
                Created: {formatDateTime(ws.created_at)}
                {ws.is_default && (
                  <span className="proj-default-pill">· Default workspace</span>
                )}
              </div>
            </div>

            <div className="proj-workspace-actions">
              <button
                type="button"
                onClick={() => navigate(`/workspaces/${ws.id}`)}
                className="proj-btn-secondary"
              >
                Open
              </button>

              {isProjectLead && (
                <button
                  type="button"
                  onClick={() => handleDeleteWorkspace(ws)}
                  className="proj-btn-danger"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------- render ----------

  if (loading) return <Loader />;

  return (
    <div className="proj-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="proj-back-btn"
      >
        ← Back
      </button>

      <ErrorMessage message={error || actionError} />
      {!project && !error && <p>Project not found.</p>}

      {project && (
        <>
          {/* Header */}
          <header className="proj-header">
            <h1 className="proj-title">{project.name}</h1>

            {project.description && (
              <p className="proj-subtitle">{project.description}</p>
            )}

            <p className="proj-meta-line">
              <strong>Status:</strong> {formatStatus(project.status)} ·{" "}
              <strong>Region:</strong> {project.region || "-"}
            </p>

            <p className="proj-meta-line-small">
              <strong>Client:</strong> {project.client || "—"}
            </p>

            <p className="proj-meta-line-small">
              <strong>Lead:</strong>{" "}
              {project.lead?.username || "—"}
              {project.lead?.email ? ` (${project.lead.email})` : ""}
            </p>

            <p className="proj-meta-line-small">
              Created: {formatDateTime(project.created_at)} · Last updated:{" "}
              {formatDateTime(project.updated_at)}
            </p>
          </header>

          {/* Two-column layout */}
          <div className="proj-layout">
            {/* LEFT COLUMN: team + workspaces list */}
            <div className="proj-main">
              <section className="proj-card">
                <h2 className="proj-section-title">Project Team</h2>
                {renderAssignmentsTable()}
              </section>

              <section className="proj-card">
                <h2 className="proj-section-title">Workspaces</h2>
                {renderWorkspacesList()}
              </section>
            </div>

            {/* RIGHT COLUMN: lead-only actions */}
            <div className="proj-side">
              {isProjectLead && (
                <section className="proj-card">
                  <h2 className="proj-section-title">Add Project Member</h2>

                  {availableUsersError && (
                    <p className="proj-error-text">{availableUsersError}</p>
                  )}

                  {availableUsers.length === 0 ? (
                    <p className="proj-muted">
                      No more users available to add.
                    </p>
                  ) : (
                    <form
                      onSubmit={handleAddMember}
                      className="proj-form-inline"
                    >
                      <div className="proj-form-field">
                        <label className="proj-label">
                          User
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                          >
                            <option value="">Select user…</option>
                            {availableUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username} ({u.email})
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="proj-form-field">
                        <label className="proj-label">
                          Role
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                          >
                            <option value="MEMBER">Team Member</option>
                            <option value="REVIEWER">Reviewer / QA</option>
                            <option value="STAKEHOLDER">Stakeholder</option>
                          </select>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={addLoading}
                        className="proj-btn-primary proj-form-submit"
                      >
                        {addLoading ? "Adding..." : "Add Member"}
                      </button>
                    </form>
                  )}

                  {addError && (
                    <p className="proj-error-text proj-mt-xs">{addError}</p>
                  )}
                  {addSuccess && (
                    <p className="proj-success-text proj-mt-xs">
                      {addSuccess}
                    </p>
                  )}
                </section>
              )}

              {isProjectLead && (
                <section className="proj-card">
                  <h2 className="proj-section-title">Create Workspace</h2>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateWorkspaceForm((prev) => !prev);
                      setWsCreateError("");
                      setWsCreateSuccess("");
                    }}
                    className="proj-btn-secondary proj-mb-sm"
                  >
                    {showCreateWorkspaceForm
                      ? "Cancel Workspace"
                      : "New Workspace"}
                  </button>

                  {showCreateWorkspaceForm && (
                    <form
                      onSubmit={handleCreateWorkspace}
                      className="proj-form-vertical"
                    >
                      <div className="proj-form-group">
                        <label className="proj-label">
                          Title *
                          <input
                            type="text"
                            value={wsTitle}
                            onChange={(e) => setWsTitle(e.target.value)}
                          />
                        </label>
                      </div>

                      <div className="proj-form-group">
                        <label className="proj-label">
                          Description
                          <textarea
                            value={wsDescription}
                            onChange={(e) => setWsDescription(e.target.value)}
                            rows={2}
                          />
                        </label>
                      </div>

                      <div className="proj-form-group proj-checkbox-row">
                        <label className="proj-label-inline">
                          <input
                            type="checkbox"
                            checked={wsIsDefault}
                            onChange={(e) => setWsIsDefault(e.target.checked)}
                          />
                          Set as default workspace
                        </label>
                      </div>

                      {wsCreateError && (
                        <p className="proj-error-text proj-mb-xs">
                          {wsCreateError}
                        </p>
                      )}
                      {wsCreateSuccess && (
                        <p className="proj-success-text proj-mb-xs">
                          {wsCreateSuccess}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={wsCreateLoading}
                        className="proj-btn-primary"
                      >
                        {wsCreateLoading ? "Creating..." : "Save Workspace"}
                      </button>
                    </form>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProjectDetailPage;
