import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Lightbox from "./Lightbox";
import PhotoUploadField from "./PhotoUploadField";

const empty = {
  name: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  store_name: "",
  tax_amount: "",
};

export default function ExpensesPanel() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState(null);
  const fileInputRef = useRef(null);

  const load = () => api.listExpenses().then(setExpenses).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(empty);
    setEditingId(null);
    setEditingImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        tax_amount: form.tax_amount ? parseFloat(form.tax_amount) : null,
      };
      let expenseId = editingId;
      if (editingId) {
        await api.updateExpense(editingId, payload);
      } else {
        const created = await api.createExpense(payload);
        expenseId = created.id;
      }
      if (imageFile) {
        await api.uploadExpenseImage(expenseId, imageFile);
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (expense) => {
    setEditingId(expense.id);
    setEditingImage(expense.image_path);
    setImageFile(null);
    setForm({
      name: expense.name,
      amount: String(expense.amount),
      date: expense.date,
      notes: expense.notes || "",
      store_name: expense.store_name || "",
      tax_amount: expense.tax_amount != null ? String(expense.tax_amount) : "",
    });
  };

  const remove = async (id) => {
    await api.deleteExpense(id);
    load();
  };

  const removeCurrentImage = async () => {
    if (!editingId) return;
    await api.deleteExpenseImage(editingId);
    setEditingImage(null);
    load();
  };

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>{editingId ? "Edit Expense" : "Add Expense"}</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <input
              placeholder="Item (e.g. Resin)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <input
              placeholder="Store (e.g. Michaels)"
              value={form.store_name}
              onChange={(e) => setForm({ ...form, store_name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <input
              type="number"
              step="0.01"
              placeholder="Tax (optional)"
              value={form.tax_amount}
              onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <PhotoUploadField
            editingImage={editingImage}
            imageFile={imageFile}
            onFileSelected={setImageFile}
            onClearSelection={() => setImageFile(null)}
            onRemoveCurrent={removeCurrentImage}
            fileInputRef={fileInputRef}
            label="Upload a bill"
          />

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save Changes" : "Add Expense"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-ghost"
              style={{ marginLeft: 10 }}
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Expenses</h3>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : expenses.length === 0 ? (
          <p className="empty-state">No expenses logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Item</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Tax</th>
                <th>Store</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.image_path ? (
                      <button
                        type="button"
                        className="thumb-btn"
                        onClick={() => setViewingImage({ url: api.imageUrl(e.image_path), alt: e.name })}
                      >
                        <img className="thumb" src={api.imageUrl(e.image_path)} alt={e.name} />
                      </button>
                    ) : (
                      <span className="thumb-empty">—</span>
                    )}
                  </td>
                  <td>{e.name}</td>
                  <td>{e.date}</td>
                  <td className="amount">${e.amount.toFixed(2)}</td>
                  <td>{e.tax_amount != null ? `$${e.tax_amount.toFixed(2)}` : "—"}</td>
                  <td>{e.store_name || "—"}</td>
                  <td>{e.notes}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => edit(e)}>Edit</button>
                      <button onClick={() => remove(e.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Lightbox image={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  );
}
