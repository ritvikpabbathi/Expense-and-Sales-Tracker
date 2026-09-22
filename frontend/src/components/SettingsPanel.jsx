import { useState } from "react";
import { api } from "../api";

export default function SettingsPanel({ settings, onUpdated }) {
  const [enabled, setEnabled] = useState(settings?.time_tracking_enabled ?? false);
  const [rate, setRate] = useState(settings?.hourly_rate ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const updated = await api.updateSettings({
      time_tracking_enabled: enabled,
      hourly_rate: enabled && rate ? parseFloat(rate) : null,
    });
    onUpdated(updated);
    setSaving(false);
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: 18 }}>Settings</h3>

      <div className="toggle-row">
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="slider"></span>
        </label>
        <div>
          <div style={{ fontWeight: 600 }}>Track time spent per sale</div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
            Optionally include labor cost in profit calculations
          </div>
        </div>
      </div>

      {enabled && (
        <div className="form-row">
          <input
            type="number"
            step="0.01"
            placeholder="Hourly rate ($)"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      )}

      <button className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
