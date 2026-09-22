import { useEffect, useState } from "react";
import { api } from "../api";

function periodToRange(period) {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start: fmt(start), end: fmt(end) };
  }
  return { start: null, end: null };
}

export default function Dashboard() {
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { start, end } = periodToRange(period);
    setLoading(true);
    api
      .getSummary(start, end)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <div className="period-select">
        {[
          ["month", "This Month"],
          ["year", "This Year"],
          ["all", "All Time"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={period === key ? "active" : ""}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading || !summary ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <div className="summary-grid">
          <div className="stat">
            <div className="label">Total Expenses</div>
            <div className="value">${summary.total_expenses.toFixed(2)}</div>
          </div>
          <div className="stat">
            <div className="label">Total Sales</div>
            <div className="value">${summary.total_sales.toFixed(2)}</div>
          </div>
          <div className="stat profit">
            <div className="label">Profit</div>
            <div className={`value ${summary.profit >= 0 ? "positive" : "negative"}`}>
              ${summary.profit.toFixed(2)}
            </div>
          </div>
          <div className="stat">
            <div className="label">Margin</div>
            <div className="value">
              {summary.margin_pct !== null ? `${summary.margin_pct.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>
      )}

      {summary && summary.labor_cost > 0 && (
        <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", textAlign: "center" }}>
          Includes ${summary.labor_cost.toFixed(2)} in labor cost
        </p>
      )}
    </div>
  );
}
