import { useState } from "react";
import { api } from "../api";

const MAX_HISTORY_TURNS = 3;

export default function SearchBar() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]); // [{question, answer, filter}], newest last
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    const asked = question.trim();
    if (!asked) return;
    setLoading(true);
    setError(null);
    setQuestion("");
    try {
      const contextTurns = history.slice(-MAX_HISTORY_TURNS).map((h) => ({
        question: h.question,
        filter: h.filter,
      }));
      const res = await api.search(asked, contextTurns);
      setHistory((prev) => [
        ...prev,
        { question: asked, answer: res.answer, filter: res.data?.filter || {} },
      ]);
    } catch (err) {
      setError(err.message);
      setQuestion(asked);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setHistory([]);
    setError(null);
  };

  const latest = history[history.length - 1];

  return (
    <>
      <form className="search-bar" onSubmit={ask}>
        <input
          placeholder="Ask e.g. “How much did I spend on resin this month?”"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          autoFocus={history.length > 0}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {latest && (
        <div className="search-answer">
          {latest.answer}
          <button type="button" className="search-clear-link" onClick={clearConversation}>
            Start a new question
          </button>
        </div>
      )}
      {error && <div className="search-error">{error}</div>}
    </>
  );
}
