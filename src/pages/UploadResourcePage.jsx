// src/pages/UploadResourcePage.jsx
import { useState } from "react";
import { apiPostForm } from "../api/client.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/UploadResourcePage.css";

const UPLOAD_ENDPOINT = "/knowledge/upload/"; // adjust if needed

function UploadResourcePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState(null);

  const [metadataPairs, setMetadataPairs] = useState([{ key: "", value: "" }]);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // --- metadata handlers ---
  function handleMetadataChange(index, field, value) {
    setMetadataPairs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleAddMetadataPair() {
    setMetadataPairs((prev) => [...prev, { key: "", value: "" }]);
  }

  function handleRemoveMetadataPair(index) {
    setMetadataPairs((prev) => prev.filter((_, i) => i !== index));
  }

  // --- file handler ---
  function handleFileChange(e) {
    const selected = e.target.files && e.target.files[0];
    setFile(selected || null);
  }

  // --- submit handler ---
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);
      if (tagsInput.trim()) formData.append("tags", tagsInput);

      const metadata = {};
      metadataPairs.forEach((pair) => {
        const key = pair.key.trim();
        const value = pair.value.trim();
        if (key && value) {
          metadata[key] = value;
        }
      });

      if (Object.keys(metadata).length > 0) {
        formData.append("metadata", JSON.stringify(metadata));
      }

      formData.append("file", file); // name must match serializer

      const resource = await apiPostForm(UPLOAD_ENDPOINT, formData);

      setSuccessMessage(
        `Resource '${resource.title}' uploaded as draft. You can submit it for review from My Resources.`
      );

      // reset form
      setTitle("");
      setDescription("");
      setTagsInput("");
      setFile(null);
      setMetadataPairs([{ key: "", value: "" }]);
    } catch (err) {
      console.error(err);
      setError("Failed to upload resource.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-card upload-page">
      <header className="upload-header">
        <h1 className="upload-title">Upload Knowledge Resource</h1>
        <p className="upload-subtitle">
          Create a new knowledge resource. You can add tags and metadata to make
          it easier to find later. It will be saved as a draft first.
        </p>
      </header>

      {loading && <Loader />}
      <ErrorMessage message={error} />

      {successMessage && (
        <div className="upload-success">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Title */}
        <div className="upload-field">
          <label>
            <span className="upload-label">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="upload-input"
            />
          </label>
        </div>

        {/* Description */}
        <div className="upload-field">
          <label>
            <span className="upload-label">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="upload-textarea"
            />
          </label>
        </div>

        {/* Tags */}
        <div className="upload-field">
          <label>
            <span className="upload-label">
              Tags (comma-separated, e.g. "AI, Cloud, Security")
            </span>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="upload-input"
            />
          </label>
        </div>

        {/* Dynamic Metadata */}
        <div className="upload-field">
          <div className="upload-label-row">
            <span className="upload-label">Metadata (optional)</span>
            <span className="upload-help">
              Add any key/value pairs (e.g. confidentiality = Internal,
              language = en, product = VX-2100).
            </span>
          </div>

          {metadataPairs.map((pair, index) => (
            <div className="upload-meta-row" key={index}>
              <input
                type="text"
                placeholder="Key (e.g. confidentiality)"
                value={pair.key}
                onChange={(e) =>
                  handleMetadataChange(index, "key", e.target.value)
                }
                className="upload-input"
              />
              <input
                type="text"
                placeholder="Value (e.g. Internal)"
                value={pair.value}
                onChange={(e) =>
                  handleMetadataChange(index, "value", e.target.value)
                }
                className="upload-input"
              />

              {metadataPairs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveMetadataPair(index)}
                  className="upload-remove-meta-btn"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddMetadataPair}
            className="upload-link-btn"
          >
            + Add metadata field
          </button>
        </div>

        {/* File */}
        <div className="upload-field">
          <label>
            <span className="upload-label">Upload File</span>
            <input
              type="file"
              onChange={handleFileChange}
              className="upload-file-input"
            />
          </label>
        </div>

        <div className="upload-actions">
          <button type="submit" disabled={loading} className="upload-primary">
            {loading ? "Uploading..." : "Upload Draft"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UploadResourcePage;
