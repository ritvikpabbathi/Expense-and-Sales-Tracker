const BASE = "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function uploadFile(path, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listExpenses: () => request("/expenses"),
  createExpense: (data) => request("/expenses", { method: "POST", body: JSON.stringify(data) }),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: "DELETE" }),
  uploadExpenseImage: (id, file) => uploadFile(`/expenses/${id}/image`, file),
  deleteExpenseImage: (id) => request(`/expenses/${id}/image`, { method: "DELETE" }),

  listSales: () => request("/sales"),
  createSale: (data) => request("/sales", { method: "POST", body: JSON.stringify(data) }),
  updateSale: (id, data) => request(`/sales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSale: (id) => request(`/sales/${id}`, { method: "DELETE" }),
  uploadSaleImage: (id, file) => uploadFile(`/sales/${id}/image`, file),
  deleteSaleImage: (id) => request(`/sales/${id}/image`, { method: "DELETE" }),
  imageUrl: (path) => `${BASE}/images/${path}`,

  getSettings: () => request("/settings"),
  updateSettings: (data) => request("/settings", { method: "PUT", body: JSON.stringify(data) }),

  getSummary: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const qs = params.toString();
    return request(`/summary${qs ? `?${qs}` : ""}`);
  },

  search: (question, history = []) =>
    request("/search", { method: "POST", body: JSON.stringify({ question, history }) }),
};
