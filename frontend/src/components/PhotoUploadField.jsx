import { api } from "../api";

export default function PhotoUploadField({
  editingImage,
  imageFile,
  onFileSelected,
  onClearSelection,
  onRemoveCurrent,
  fileInputRef,
  label = "Add a photo",
}) {
  return (
    <div className="photo-row">
      {editingImage && !imageFile && (
        <div className="photo-preview">
          <img src={api.imageUrl(editingImage)} alt="Current" />
          <button type="button" className="btn-ghost" onClick={onRemoveCurrent}>
            Remove photo
          </button>
        </div>
      )}
      {imageFile && (
        <div className="photo-preview">
          <img src={URL.createObjectURL(imageFile)} alt="Selected" />
          <button type="button" className="btn-ghost" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      )}
      <label className="photo-upload-label">
        {editingImage || imageFile ? "Replace photo" : label}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}
