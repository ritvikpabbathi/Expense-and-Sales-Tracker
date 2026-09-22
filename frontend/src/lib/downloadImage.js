export async function downloadImage(url, label) {
  const res = await fetch(url);
  const blob = await res.blob();
  const ext = url.split(".").pop().split("?")[0] || "jpg";
  const safeName = (label || "photo").trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${safeName}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
