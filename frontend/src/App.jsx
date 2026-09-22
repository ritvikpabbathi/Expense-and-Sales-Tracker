import { useEffect, useState } from "react";
import "./App.css";
import { api } from "./api";
import Dashboard from "./components/Dashboard";
import ExpensesPanel from "./components/ExpensesPanel";
import SalesPanel from "./components/SalesPanel";
import SettingsPanel from "./components/SettingsPanel";
import SearchBar from "./components/SearchBar";

const TABS = [
  ["dashboard", "Dashboard"],
  ["expenses", "Expenses"],
  ["sales", "Sales"],
  ["settings", "Settings"],
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>Tejoh Collective</h1>
        <p>Expense &amp; Sales Tracker</p>
      </div>

      <SearchBar />

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <Dashboard />}
      {tab === "expenses" && <ExpensesPanel />}
      {tab === "sales" && <SalesPanel settings={settings} />}
      {tab === "settings" && settings && (
        <SettingsPanel settings={settings} onUpdated={setSettings} />
      )}
    </div>
  );
}
