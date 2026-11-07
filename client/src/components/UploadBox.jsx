import { useState } from "react";

export default function UploadBox({ onUpload, loading }) {
  const [file, setFile] = useState(null);

  return (
    <section className="upload">
      <input
        type="file"
        accept=".pdf,.mp3,.wav,.m4a"
        onChange={(e) => setFile(e.target.files[0] || null)}
      />
      <button disabled={!file || loading} onClick={() => onUpload(file)}>
        {loading ? "Summarizing..." : "Summarize"}
      </button>
      <small>PDF, MP3, WAV or M4A, up to 25 MB</small>
    </section>
  );
}
