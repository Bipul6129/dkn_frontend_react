// src/pages/WorkspacePage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiGet, apiPostForm, apiDelete, API_BASE } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import { useAuthStore } from "../store/authStore";
import "../css/WorkspacePage.css";

const WORKSPACE_DETAIL_ENDPOINT = (id) => `/collab/spaces/${id}/`;
const WORKSPACE_POSTS_ENDPOINT = (id) => `/collab/spaces/${id}/posts/`;
const WORKSPACE_POST_DETAIL_ENDPOINT = (spaceId, postId) =>
  `/collab/spaces/${spaceId}/posts/${postId}/`;

const BACKEND_BASE = API_BASE.replace("/api", "");

function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;

  const [workspace, setWorkspace] = useState(null);
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // create-post form
  const [message, setMessage] = useState("");
  const [fileObj, setFileObj] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // ---------- load workspace + posts ----------

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const ws = await apiGet(WORKSPACE_DETAIL_ENDPOINT(workspaceId));

      let pData = [];
      try {
        const raw = await apiGet(WORKSPACE_POSTS_ENDPOINT(workspaceId));
        pData = Array.isArray(raw) ? raw : [];
      } catch (err) {
        console.warn("Failed to load posts", err);
      }

      setWorkspace(ws);
      setPosts(pData);
    } catch (err) {
      console.error(err);
      setError("Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

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

  function fileUrl(path) {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return BACKEND_BASE + path;
  }

  // ---------- create post (message + optional file) ----------

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!message.trim() && !fileObj) {
      setCreateError("Write a message or attach a file.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");

    try {
      const formData = new FormData();
      if (message.trim()) formData.append("message", message.trim());
      if (fileObj) formData.append("file", fileObj);

      const newPost = await apiPostForm(
        WORKSPACE_POSTS_ENDPOINT(workspaceId),
        formData
      );

      if (newPost) {
        setPosts((prev) => [...prev, newPost]);
      }

      setMessage("");
      setFileObj(null);
    } catch (err) {
      console.error(err);
      setCreateError("Failed to post to workspace.");
    } finally {
      setCreateLoading(false);
    }
  }

  // ---------- delete post (author only) ----------

  async function handleDeletePost(postId) {
    const ok = window.confirm("Delete this post? This cannot be undone.");
    if (!ok) return;

    try {
      await apiDelete(WORKSPACE_POST_DETAIL_ENDPOINT(workspaceId, postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete post.");
    }
  }

  // ---------- render posts ----------

  function renderPosts() {
    if (!posts || posts.length === 0) {
      return (
        <p className="ws-muted">
          No posts yet. Start the conversation with your team!
        </p>
      );
    }

    const sorted = [...posts].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });

    return (
      <div className="ws-posts-scroll">
        {sorted.map((post) => {
          const isOwner = currentUserId && post.author?.id === currentUserId;
          const url = fileUrl(post.file);

          return (
            <article key={post.id} className="ws-post-card">
              <div className="ws-post-header">
                <div>
                  <strong>{post.author?.username || "Unknown"}</strong>
                  <span className="ws-post-date">
                    · {formatDateTime(post.created_at)}
                  </span>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="ws-btn-text-danger"
                  >
                    Delete
                  </button>
                )}
              </div>

              {post.message && (
                <div
                  className={
                    "ws-post-body" + (url ? " ws-post-body-with-attachment" : "")
                  }
                >
                  {post.message}
                </div>
              )}

              {url && (
                <div className="ws-post-attachment">
                  <a href={url} target="_blank" rel="noreferrer">
                    View attachment
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  }

  // ---------- render ----------

  if (loading) return <Loader />;

  return (
    <div className="ws-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="ws-back-btn"
      >
        ← Back
      </button>

      <ErrorMessage message={error} />
      {!workspace && !error && <p>Workspace not found.</p>}

      {workspace && (
        <>
          {/* Header */}
          <header className="ws-header">
            <h1 className="ws-title">{workspace.title}</h1>

            {workspace.description && (
              <p className="ws-subtitle">{workspace.description}</p>
            )}

            <p className="ws-meta-line">
              Project ID: {workspace.project} · Created:{" "}
              {formatDateTime(workspace.created_at)}
              {workspace.is_default && (
                <span className="ws-default-pill"> · Default workspace</span>
              )}
            </p>

            {workspace.project && (
              <p className="ws-link-line">
                <Link to={`/projects/${workspace.project}`}>
                  ← Back to project details
                </Link>
              </p>
            )}
          </header>

          {/* Two-column layout: posts left, new post right */}
          <div className="ws-layout">
            {/* LEFT: Posts */}
            <div className="ws-main">
              <section className="ws-card">
                <h2 className="ws-section-title">Posts</h2>
                {renderPosts()}
              </section>
            </div>

            {/* RIGHT: New Post */}
            <div className="ws-side">
              <section className="ws-card">
                <h2 className="ws-section-title">New Post</h2>

                <form
                  onSubmit={handleCreatePost}
                  className="ws-form-vertical"
                  encType="multipart/form-data"
                >
                  <div className="ws-form-group">
                    <label className="ws-label">
                      Message
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Share an update, decision, or question with the project team..."
                      />
                    </label>
                  </div>

                  <div className="ws-form-group">
                    <label className="ws-label">
                      Optional attachment
                      <input
                        type="file"
                        onChange={(e) =>
                          setFileObj(e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  </div>

                  {createError && (
                    <p className="ws-error-text">{createError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="ws-btn-primary"
                  >
                    {createLoading ? "Posting..." : "Post to workspace"}
                  </button>
                </form>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WorkspacePage;
