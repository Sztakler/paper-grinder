import { useRef, useState } from "react";

export function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const wsRef = useRef(null);

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

  const handleWSUpload = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const pdfArrayBuffer = reader.result;
      wsRef.current = new WebSocket("ws://localhost:8000/ws/upload");
      wsRef.current.binaryType = "arrayBuffer";

      wsRef.current.onopen = () => {
        wsRef.current.send(pdfArrayBuffer);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === "done") {
          console.log("Upload finished");
        } else {
          setText((prev) => prev + data.text);
          setProgress({ current: data.chunk_index, total: data.total_chunks });
        }
      };
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="m-auto w-full min-h-screen bg-[#edefeb]">
      <div className="px-48 py-8 flex flex-col">
        <h1 className="text-2xl">paper-grinder</h1>

        <form>
          <div className="col-span-full">
            <label
              htmlFor="cover-photo"
              className="block text-sm/6 font-medium text-[#1a1c16]"
            >
              Select document
            </label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-white/25 px-6 py-10">
              <div className="text-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="mx-auto size-12 text-[#1a1c16]"
                >
                  <path
                    d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
                <div className="mt-4 flex text-sm/6 text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md bg-transparent font-semibold text-[#1a1c16] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gray-500 hover:opacity-60"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      type="file"
                      name="file-upload"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setFile(file);
                        handleWSUpload(file);
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs/5 text-gray-600">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>
        </form>

        {loading && <p>{loadingMessage}</p>}
        <p>
          Progress: {progress.current}/{progress.total} chunks
        </p>
        {!loading && <pre className="w-prose bg-red-500 text-wrap">{text}</pre>}
      </div>
    </div>
  );
}
