import { useState } from "react";
import FileDropzone from "./FileDropzone";

export function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleUpload = async (selectedFile: File) => {
    if (!selectedFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoadingMessage(`Processing file: ${selectedFile.name} 🐢`);
    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("data", data);
      setText(data.text);
    } catch (err) {
      console.error("Upload error:", err);
      setText(`Error uploading selected file: ${selectedFile.name}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="m-auto w-full min-h-screen bg-[#edefeb]">
      <div className="px-48 py-8 flex flex-col">
        <h1 className="text-2xl">paper-grinder</h1>

        <FileDropzone onFileDrop={handleUpload} />

        {loading && <p>{loadingMessage}</p>}
        {!loading && <pre className="">{text}</pre>}
      </div>
    </div>
  );
}
