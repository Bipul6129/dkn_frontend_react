// src/pages/TrainingCourseDetailPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  apiGet,
  apiPost,
  apiPostForm,
  apiDelete,
  API_BASE,
} from "../api/client.js";
import { useAuthStore } from "../store/authStore.js";
import Loader from "../components/common/Loader.jsx";
import ErrorMessage from "../components/common/ErrorMessage.jsx";
import "../css/TrainingCourseDetailPage.css";

const COURSE_DETAIL_ENDPOINT = (id) => `/training/courses/${id}/`;
const QUIZ_ENDPOINT = (id) => `/training/courses/${id}/quiz/`;
const QUIZ_SUBMIT_ENDPOINT = (id) => `/training/courses/${id}/quiz/submit/`;
const MY_ATTEMPTS_ENDPOINT = "/training/my-attempts/";

// Champion quiz-management endpoints
const MANAGE_QUESTIONS_ENDPOINT = (courseId) =>
  `/training/courses/${courseId}/questions/`;
const MANAGE_QUESTION_ENDPOINT = (courseId, questionId) =>
  `/training/courses/${courseId}/questions/${questionId}/`;
const MANAGE_OPTIONS_ENDPOINT = (courseId, questionId) =>
  `/training/courses/${courseId}/questions/${questionId}/options/`;
const MANAGE_OPTION_ENDPOINT = (courseId, questionId, optionId) =>
  `/training/courses/${courseId}/questions/${questionId}/options/${optionId}/`;

// training materials endpoints
const COURSE_MATERIALS_ENDPOINT = (courseId) =>
  `/training/courses/${courseId}/materials/`;
const MATERIAL_DETAIL_ENDPOINT = (materialId) =>
  `/training/materials/${materialId}/`;

const BACKEND_BASE = API_BASE.replace("/api", "");

function TrainingCourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const username = user?.username;
  const isChampion = role === "CHAMPION";
  const isEmployee = role === "EMPLOYEE";

  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [courseError, setCourseError] = useState("");

  // learner quiz data
  const [questions, setQuestions] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [answers, setAnswers] = useState({}); // { [questionId]: optionId }
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // attempts (for progress)
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // champion quiz management
  const [manageQuestions, setManageQuestions] = useState([]);
  const [loadingManage, setLoadingManage] = useState(false);
  const [manageError, setManageError] = useState("");

  // new question form
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionOrder, setNewQuestionOrder] = useState("");
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // new option per question
  const [newOptionTextByQ, setNewOptionTextByQ] = useState({});
  const [newOptionCorrectByQ, setNewOptionCorrectByQ] = useState({});

  // champion training material management
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialFile, setMaterialFile] = useState(null);
  const [materialLinkUrl, setMaterialLinkUrl] = useState("");
  const [materialError, setMaterialError] = useState("");
  const [materialLoading, setMaterialLoading] = useState(false);

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

  const isCourseOwnerChampion =
    isChampion && course && course.created_by_name === username;

  // ---------- load course detail ----------

  useEffect(() => {
    async function loadCourse() {
      setLoadingCourse(true);
      setCourseError("");
      setQuizResult(null);
      setAnswers({});
      setQuestions([]);
      setManageQuestions([]);
      setManageError("");
      setMaterialError("");

      try {
        const data = await apiGet(COURSE_DETAIL_ENDPOINT(id));
        setCourse(data);
      } catch (err) {
        console.error(err);
        setCourseError("Failed to load course details.");
      } finally {
        setLoadingCourse(false);
      }
    }

    loadCourse();
  }, [id]);

  // helper: reload course (after materials change)
  async function reloadCourse() {
    if (!id) return;
    try {
      const data = await apiGet(COURSE_DETAIL_ENDPOINT(id));
      setCourse(data);
    } catch (err) {
      console.error("Failed to reload course", err);
    }
  }

  // ---------- helper: load learner quiz (employees only) ----------

  async function fetchQuiz(courseId) {
    setLoadingQuiz(true);
    setQuizError("");
    setQuestions([]);
    setAnswers({});
    setQuizResult(null);

    try {
      const data = await apiGet(QUIZ_ENDPOINT(courseId));
      const arr = Array.isArray(data) ? data : [];
      setQuestions(arr);
    } catch (err) {
      console.error(err);
      setQuizError("Quiz not available for this course or access denied.");
    } finally {
      setLoadingQuiz(false);
    }
  }

  // load quiz whenever course is available – employees only
  useEffect(() => {
    if (!course || !isEmployee) return;
    fetchQuiz(course.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, isEmployee]);

  // ---------- load my attempts (for this course – employees only) ----------

  useEffect(() => {
    if (!isEmployee) return;

    async function loadAttempts() {
      setLoadingAttempts(true);
      try {
        const data = await apiGet(MY_ATTEMPTS_ENDPOINT);
        const arr = Array.isArray(data) ? data : [];
        setAttempts(arr);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAttempts(false);
      }
    }

    loadAttempts();
  }, [isEmployee]);

  const courseAttempts = useMemo(() => {
    if (!course || !Array.isArray(attempts)) return [];
    return attempts.filter((a) => a.course === course.id);
  }, [attempts, course]);

  const lastAttempt = courseAttempts.length > 0 ? courseAttempts[0] : null;

  // ---------- helper: load champion manage questions ----------

  async function fetchManageQuestions(courseId) {
    if (!isChampion) {
      setManageQuestions([]);
      return;
    }

    setLoadingManage(true);
    setManageError("");
    try {
      const data = await apiGet(MANAGE_QUESTIONS_ENDPOINT(courseId));
      const arr = Array.isArray(data) ? data : [];
      setManageQuestions(arr);
    } catch (err) {
      console.error(err);
      setManageError(
        "Unable to load quiz management data (you may not be the course owner)."
      );
      setManageQuestions([]);
    } finally {
      setLoadingManage(false);
    }
  }

  // load manage questions for champions when course available
  useEffect(() => {
    if (!course || !isChampion) return;
    fetchManageQuestions(course.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, isChampion]);

  // ---------- materials rendering (read-only list) ----------

  function renderMaterialsList() {
    if (!course || !Array.isArray(course.materials)) {
      return <p className="tc-muted">No materials have been added yet.</p>;
    }

    if (course.materials.length === 0) {
      return <p className="tc-muted">No materials have been added yet.</p>;
    }

    return (
      <ul className="tc-materials-list">
        {course.materials.map((m) => {
          const hasFile = !!m.file;
          const hasLink = !!m.link_url;
          let fileUrl = null;
          if (hasFile) {
            fileUrl = m.file.startsWith("http")
              ? m.file
              : BACKEND_BASE + m.file;
          }

          return (
            <li key={m.id} className="tc-material-item">
              <div className="tc-material-main">
                <div className="tc-material-title">{m.title}</div>
                {m.description && (
                  <div className="tc-material-description">
                    {m.description}
                  </div>
                )}
                <div className="tc-material-links">
                  {hasFile && (
                    <a href={fileUrl} target="_blank" rel="noreferrer">
                      Download file
                    </a>
                  )}
                  {hasLink && (
                    <a href={m.link_url} target="_blank" rel="noreferrer">
                      Open link
                    </a>
                  )}
                  {!hasFile && !hasLink && (
                    <span className="tc-muted">No file or link.</span>
                  )}
                </div>
              </div>

              {isCourseOwnerChampion && (
                <button
                  type="button"
                  onClick={() => handleDeleteMaterial(m)}
                  className="tc-link-danger"
                >
                  Delete
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  // ---------- champion: create/delete materials ----------

  function resetMaterialForm() {
    setMaterialTitle("");
    setMaterialDescription("");
    setMaterialFile(null);
    setMaterialLinkUrl("");
    setMaterialError("");
  }

  async function handleCreateMaterial(e) {
    e.preventDefault();
    if (!course) return;

    setMaterialError("");

    if (!materialTitle.trim()) {
      setMaterialError("Title is required.");
      return;
    }

    if (!materialFile && !materialLinkUrl.trim()) {
      setMaterialError("Provide at least a file or a link URL.");
      return;
    }

    setMaterialLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", materialTitle.trim());
      if (materialDescription.trim()) {
        formData.append("description", materialDescription.trim());
      }
      if (materialFile) {
        formData.append("file", materialFile);
      }
      if (materialLinkUrl.trim()) {
        formData.append("link_url", materialLinkUrl.trim());
      }

      await apiPostForm(COURSE_MATERIALS_ENDPOINT(course.id), formData);

      await reloadCourse();
      resetMaterialForm();
      setShowMaterialForm(false);
    } catch (err) {
      console.error(err);
      setMaterialError("Failed to create training material.");
    } finally {
      setMaterialLoading(false);
    }
  }

  async function handleDeleteMaterial(material) {
    if (!material) return;

    const ok = window.confirm(
      `Delete material "${material.title.slice(0, 60)}..."?`
    );
    if (!ok) return;

    try {
      setMaterialError("");
      await apiDelete(MATERIAL_DETAIL_ENDPOINT(material.id));
      await reloadCourse();
    } catch (err) {
      console.error(err);
      setMaterialError("Failed to delete training material.");
    }
  }

  // ---------- learner quiz UI (employees only) ----------

  function handleOptionChange(questionId, optionId) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  }

  async function handleSubmitQuiz(e) {
    e.preventDefault();
    if (!course || questions.length === 0) return;

    const payload = {
      answers: Object.entries(answers).map(([qId, optId]) => ({
        question: Number(qId),
        option: Number(optId),
      })),
    };

    if (payload.answers.length === 0) {
      alert("Please select at least one answer before submitting.");
      return;
    }

    setSubmittingQuiz(true);
    setQuizError("");
    setQuizResult(null);

    try {
      const result = await apiPost(QUIZ_SUBMIT_ENDPOINT(course.id), payload);
      setQuizResult(result);

      // refresh attempts list
      try {
        const data = await apiGet(MY_ATTEMPTS_ENDPOINT);
        setAttempts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to refresh attempts after quiz submit", err);
      }
    } catch (err) {
      console.error(err);
      setQuizError("Failed to submit quiz. Please try again.");
    } finally {
      setSubmittingQuiz(false);
    }
  }

  function renderQuiz() {
    if (!isEmployee) {
      return (
        <p className="tc-muted">
          Quiz view is only shown for employees. Use the &quot;Manage Quiz&quot;
          section to configure questions and options.
        </p>
      );
    }

    if (loadingQuiz) {
      return <p>Loading quiz…</p>;
    }

    if (quizError && questions.length === 0) {
      return <p className="tc-muted">{quizError}</p>;
    }

    if (!questions || questions.length === 0) {
      return (
        <p className="tc-muted">
          No quiz has been configured for this course yet.
        </p>
      );
    }

    return (
      <form onSubmit={handleSubmitQuiz}>
        <div className="tc-quiz-questions">
          {questions.map((q, idx) => (
            <div key={q.id} className="tc-quiz-question-card">
              <div className="tc-quiz-question-title">
                Q{q.order || idx + 1}. {q.text}
              </div>

              {(!q.options || q.options.length === 0) && (
                <div className="tc-muted">
                  No options configured for this question.
                </div>
              )}

              {q.options && q.options.length > 0 && (
                <div className="tc-quiz-options">
                  {q.options.map((opt) => (
                    <label key={opt.id} className="tc-quiz-option">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.id}
                        checked={answers[q.id] === opt.id}
                        onChange={() => handleOptionChange(q.id, opt.id)}
                      />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {quizError && <p className="tc-error-text">{quizError}</p>}

        <button
          type="submit"
          disabled={submittingQuiz}
          className="tc-primary-btn"
        >
          {submittingQuiz ? "Submitting..." : "Submit Quiz"}
        </button>
      </form>
    );
  }

  // ---------- learner progress ----------

  function renderLastAttempt() {
    if (!isEmployee) {
      return (
        <p className="tc-muted">
          Progress tracking is shown on the employee view.
        </p>
      );
    }

    if (loadingAttempts) {
      return <p>Loading your previous attempts…</p>;
    }

    if (!lastAttempt) {
      return (
        <p className="tc-muted">
          You haven&apos;t completed this quiz yet.
        </p>
      );
    }

    const { score, total_questions, is_passed, submitted_at } = lastAttempt;
    const percent =
      total_questions > 0 ? Math.round((score / total_questions) * 100) : 0;

    return (
      <div
        className={
          "tc-progress-card " +
          (is_passed ? "tc-progress-pass" : "tc-progress-fail")
        }
      >
        <div>
          Last attempt: {score}/{total_questions} ({percent}%)
        </div>
        <div>
          Status:{" "}
          <strong>{is_passed ? "Passed 🎉" : "Not passed yet"}</strong>
        </div>
        <div className="tc-progress-date">
          Taken on {formatDateTime(submitted_at)}
        </div>
      </div>
    );
  }

  // ---------- champion quiz management helpers ----------

  async function handleCreateQuestion(e) {
    e.preventDefault();
    if (!course) return;
    setManageError("");

    if (!newQuestionText.trim()) {
      setManageError("Question text is required.");
      return;
    }

    setCreatingQuestion(true);
    try {
      const body = {
        text: newQuestionText.trim(),
      };
      if (newQuestionOrder) {
        body.order = Number(newQuestionOrder);
      }

      await apiPost(MANAGE_QUESTIONS_ENDPOINT(course.id), body);

      // refresh management view + learner quiz (for employees)
      await fetchManageQuestions(course.id);
      if (isEmployee) {
        await fetchQuiz(course.id);
      }

      setNewQuestionText("");
      setNewQuestionOrder("");
    } catch (err) {
      console.error(err);
      setManageError("Failed to create question.");
    } finally {
      setCreatingQuestion(false);
    }
  }

  async function handleDeleteQuestion(q) {
    if (!course || !q) return;

    const ok = window.confirm(
      `Delete question "${q.text.slice(0, 60)}..." and all its options?`
    );
    if (!ok) return;

    try {
      setManageError("");
      await apiDelete(MANAGE_QUESTION_ENDPOINT(course.id, q.id));
      await fetchManageQuestions(course.id);
      if (isEmployee) {
        await fetchQuiz(course.id);
      }
    } catch (err) {
      console.error(err);
      setManageError("Failed to delete question.");
    }
  }

  function handleNewOptionTextChange(questionId, value) {
    setNewOptionTextByQ((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  function handleNewOptionCorrectChange(questionId, checked) {
    setNewOptionCorrectByQ((prev) => ({
      ...prev,
      [questionId]: checked,
    }));
  }

  async function handleCreateOption(questionId) {
    if (!course) return;

    const text = (newOptionTextByQ[questionId] || "").trim();
    const isCorrect = !!newOptionCorrectByQ[questionId];

    if (!text) {
      setManageError("Option text is required.");
      return;
    }

    try {
      setManageError("");
      await apiPost(MANAGE_OPTIONS_ENDPOINT(course.id, questionId), {
        text,
        is_correct: isCorrect,
      });

      await fetchManageQuestions(course.id);
      if (isEmployee) {
        await fetchQuiz(course.id);
      }

      setNewOptionTextByQ((prev) => ({ ...prev, [questionId]: "" }));
      setNewOptionCorrectByQ((prev) => ({ ...prev, [questionId]: false }));
    } catch (err) {
      console.error(err);
      setManageError("Failed to add option.");
    }
  }

  async function handleDeleteOption(questionId, option) {
    if (!course || !option) return;

    const ok = window.confirm(
      `Delete option "${option.text.slice(0, 60)}..."?`
    );
    if (!ok) return;

    try {
      setManageError("");
      await apiDelete(
        MANAGE_OPTION_ENDPOINT(course.id, questionId, option.id)
      );
      await fetchManageQuestions(course.id);
      if (isEmployee) {
        await fetchQuiz(course.id);
      }
    } catch (err) {
      console.error(err);
      setManageError("Failed to delete option.");
    }
  }

  // ---------- champion quiz management UI ----------

  function renderManageQuiz() {
    if (!isChampion) return null;

    return (
      <section className="tc-card tc-main-card">
        <h2 className="tc-section-title">Manage Quiz (Champion)</h2>

        {loadingManage && <p>Loading quiz configuration…</p>}

        {manageError && (
          <p className="tc-error-text" style={{ marginBottom: "0.5rem" }}>
            {manageError}
          </p>
        )}

        {/* Create question */}
        <form onSubmit={handleCreateQuestion} className="tc-form-card">
          <div className="tc-form-group">
            <label className="tc-label">
              New question text *
              <textarea
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                rows={2}
                className="tc-textarea"
              />
            </label>
          </div>

          <div className="tc-form-group">
            <label className="tc-label">
              Order (optional)
              <input
                type="number"
                value={newQuestionOrder}
                onChange={(e) => setNewQuestionOrder(e.target.value)}
                className="tc-input-sm"
                min={1}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={creatingQuestion}
            className="tc-primary-btn"
          >
            {creatingQuestion ? "Creating…" : "Add Question"}
          </button>
        </form>

        {/* Questions + options list */}
        {(!manageQuestions || manageQuestions.length === 0) ? (
          <p
            style={{
              fontSize: "0.85rem",
              color: "#555",
              marginTop: "0.6rem",
            }}
          >
            No questions configured yet.
          </p>
        ) : (
          <div className="tc-manage-questions">
            {manageQuestions.map((q, idx) => (
              <div key={q.id} className="tc-manage-question-card">
                <div className="tc-manage-question-header">
                  <div className="tc-manage-question-title">
                    Q{q.order || idx + 1}. {q.text}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q)}
                    className="tc-btn-text"
                  >
                    Delete question
                  </button>
                </div>

                {/* Options */}
                <div className="tc-manage-options-block">
                  <div className="tc-manage-options-heading">Options</div>
                  {(!q.options || q.options.length === 0) && (
                    <p className="tc-muted-small">
                      No options yet. Add at least one correct option.
                    </p>
                  )}
                  {q.options &&
                    q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={
                          "tc-option-row" +
                          (opt.is_correct ? " tc-option-row--correct" : "")
                        }
                      >
                        <div>
                          {opt.text}{" "}
                          {opt.is_correct && (
                            <span className="tc-option-correct-label">
                              (Correct)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(q.id, opt)}
                          className="tc-btn-text"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                </div>

                {/* Add option form */}
                <div className="tc-add-option-block">
                  <div className="tc-add-option-label">Add option</div>

                  <div className="tc-add-option-row">
                    <input
                      type="text"
                      placeholder="Option text"
                      value={newOptionTextByQ[q.id] || ""}
                      onChange={(e) =>
                        handleNewOptionTextChange(q.id, e.target.value)
                      }
                      className="tc-input"
                    />
                    <label className="tc-add-option-cb">
                      <input
                        type="checkbox"
                        checked={!!newOptionCorrectByQ[q.id]}
                        onChange={(e) =>
                          handleNewOptionCorrectChange(
                            q.id,
                            e.target.checked
                          )
                        }
                      />
                      Correct option
                    </label>
                    <button
                      type="button"
                      onClick={() => handleCreateOption(q.id)}
                      className="tc-secondary-btn"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // ---------- render ----------

  if (loadingCourse) return <Loader />;

  return (
    <div className="tc-page">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="tc-back-btn"
      >
        ← Back
      </button>

      <ErrorMessage message={courseError} />
      {!course && !courseError && <p>Course not found.</p>}

      {course && (
        <>
          {/* Header */}
          <header className="tc-header">
            <h1 className="tc-title">{course.title}</h1>

            {course.description && (
              <p className="tc-subtitle">{course.description}</p>
            )}

            <p className="tc-meta-line">
              <strong>Status:</strong> {formatStatus(course.status)} ·{" "}
              <strong>Region:</strong> {course.region || "-"}
            </p>

            <p className="tc-meta-line-small">
              <strong>Created by:</strong> {course.created_by_name || "—"}
            </p>

            <p className="tc-meta-line-small">
              Created: {formatDateTime(course.created_at)} · Last updated:{" "}
              {formatDateTime(course.updated_at)}
            </p>
          </header>

          {/* Two-column layout */}
          <div className="tc-layout">
            {/* LEFT COLUMN */}
            <div className="tc-main">
              {isChampion ? (
                renderManageQuiz()
              ) : (
                <section className="tc-card tc-main-card">
                  <h2 className="tc-section-title">Quiz</h2>
                  {renderQuiz()}

                  {/* Inline result card for this submission */}
                  {isEmployee && quizResult && (
                    <div
                      className={
                        "tc-progress-card tc-quiz-result " +
                        (quizResult.passed
                          ? "tc-progress-pass"
                          : "tc-progress-fail")
                      }
                    >
                      <div>
                        You scored {quizResult.score}/
                        {quizResult.total_questions} ({quizResult.percent}%)
                      </div>
                      <div>
                        Status:{" "}
                        <strong>
                          {quizResult.passed ? "Passed 🎉" : "Not passed yet"}
                        </strong>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="tc-side">
              {/* Training Materials (always on the right) */}
              <section className="tc-card">
                <h2 className="tc-section-title">Training Materials</h2>
                {renderMaterialsList()}

                {isCourseOwnerChampion && (
                  <div className="tc-material-add-block">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMaterialForm((prev) => !prev);
                        setMaterialError("");
                      }}
                      className="tc-secondary-btn"
                    >
                      {showMaterialForm ? "Cancel" : "Add Material"}
                    </button>

                    {showMaterialForm && (
                      <form
                        onSubmit={handleCreateMaterial}
                        className="tc-material-form tc-form-card"
                        encType="multipart/form-data"
                      >
                        <div className="tc-form-group">
                          <label className="tc-label">
                            Title *
                            <input
                              type="text"
                              value={materialTitle}
                              onChange={(e) =>
                                setMaterialTitle(e.target.value)
                              }
                              className="tc-input"
                            />
                          </label>
                        </div>

                        <div className="tc-form-group">
                          <label className="tc-label">
                            Description
                            <textarea
                              value={materialDescription}
                              onChange={(e) =>
                                setMaterialDescription(e.target.value)
                              }
                              rows={2}
                              className="tc-textarea"
                            />
                          </label>
                        </div>

                        <div className="tc-form-group">
                          <label className="tc-label">
                            File
                            <input
                              type="file"
                              onChange={(e) =>
                                setMaterialFile(e.target.files?.[0] || null)
                              }
                            />
                          </label>
                        </div>

                        <div className="tc-form-group">
                          <label className="tc-label">
                            Link URL
                            <input
                              type="url"
                              value={materialLinkUrl}
                              onChange={(e) =>
                                setMaterialLinkUrl(e.target.value)
                              }
                              placeholder="https://example.com/..."
                              className="tc-input"
                            />
                          </label>
                          <p className="tc-help-text">
                            Provide at least a file or a link.
                          </p>
                        </div>

                        {materialError && (
                          <p className="tc-error-text">{materialError}</p>
                        )}

                        <button
                          type="submit"
                          disabled={materialLoading}
                          className="tc-primary-btn"
                        >
                          {materialLoading
                            ? "Saving material..."
                            : "Save Material"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </section>

              {/* Quiz info (champion) */}
              {isChampion && (
                <section className="tc-card">
                  <h2 className="tc-section-title">Quiz</h2>
                  {renderQuiz()}
                </section>
              )}

              {/* Your Progress (right side for both) */}
              <section className="tc-card">
                <h2 className="tc-section-title">Your Progress</h2>
                {renderLastAttempt()}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TrainingCourseDetailPage;
