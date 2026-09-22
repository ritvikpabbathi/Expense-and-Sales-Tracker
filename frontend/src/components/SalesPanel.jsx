import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Lightbox from "./Lightbox";
import PhotoUploadField from "./PhotoUploadField";

const emptyForm = {
  product_name: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  time_minutes: "",
  buyer_name: "",
};

export default function SalesPanel({ settings }) {
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState(null);
  const fileInputRef = useRef(null);

  const load = () => api.listSales().then(setSales).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setEditingImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.product_name || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        time_minutes: form.time_minutes ? parseFloat(form.time_minutes) : null,
      };
      let saleId = editingId;
      if (editingId) {
        await api.updateSale(editingId, payload);
      } else {
        const created = await api.createSale(payload);
        saleId = created.id;
      }
      if (imageFile) {
        await api.uploadSaleImage(saleId, imageFile);
      }
      resetForm();
      load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (sale) => {
    setEditingId(sale.id);
    setEditingImage(sale.image_path);
    setImageFile(null);
    setForm({
      product_name: sale.product_name,
      amount: String(sale.amount),
      date: sale.date,
      notes: sale.notes || "",
      time_minutes: sale.time_minutes ? String(sale.time_minutes) : "",
      buyer_name: sale.buyer_name || "",
    });
  };

  const remove = async (id) => {
    await api.deleteSale(id);
    load();
  };

  const removeCurrentImage = async () => {
    if (!editingId) return;
    await api.deleteSaleImage(editingId);
    setEditingImage(null);
    load();
  };

  const showTime = settings?.time_tracking_enabled;

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>{editingId ? "Edit Sale" : "Add Sale"}</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <input
              placeholder="Product (e.g. Painting)"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Sold for"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <input
              placeholder="Buyer (e.g. Sarah)"
              value={form.buyer_name}
              onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
            />
            {showTime && (
              <input
                type="number"
                step="1"
                placeholder="Time spent (minutes)"
                value={form.time_minutes}
                onChange={(e) => setForm({ ...form, time_minutes: e.target.value })}
              />
            )}
          </div>
          <div className="form-row">
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
          />

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save Changes" : "Add Sale"}
          </button>
          {editingId && (
            <button type="button" className="btn-ghost" style={{ marginLeft: 10 }} onClick={resetForm}>
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Sales</h3>
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : sales.length === 0 ? (
          <p className="empty-state">No sales logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Product</th>
                <th>Date</th>
                <th>Sold For</th>
                <th>Buyer</th>
                {showTime && <th>Time</th>}
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.image_path ? (
                      <button
                        type="button"
                        className="thumb-btn"
                        onClick={() => setViewingImage({ url: api.imageUrl(s.image_path), alt: s.product_name })}
                      >
                        <img className="thumb" src={api.imageUrl(s.image_path)} alt={s.product_name} />
                      </button>
                    ) : (
                      <span className="thumb-empty">—</span>
                    )}
                  </td>
                  <td>{s.product_name}</td>
                  <td>{s.date}</td>
                  <td className="amount">${s.amount.toFixed(2)}</td>
                  <td>{s.buyer_name || "—"}</td>
                  {showTime && <td>{s.time_minutes ? `${s.time_minutes} min` : "—"}</td>}
                  <td>{s.notes}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => edit(s)}>Edit</button>
                      <button onClick={() => remove(s.id)}>Delete</button>
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
