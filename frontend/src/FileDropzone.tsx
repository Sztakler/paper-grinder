import { useFileUpload } from "hooks/useFileUpload";
import React, { useState, DragEvent } from "react";

type FileDropzoneProps = {};

export default function FileDropzone({}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { upload, loading, loadingMessage, text, progress } = useFileUpload();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    handleFile(file);
  };

  const handleManualPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Currently this app supports only PDF files. Sorry :/");
      return;
    }
    upload(file);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={`mt-8 flex justify-center rounded-lg border border-dashed border-white/25 px-16  w-fit ${isDragging ? "bg-[#d4d6d2]" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
                onChange={handleManualPick}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs/5 text-gray-600">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
      {loading && (
        <div className="flex flex-col items-center justify-center gap-2">
          <p>{loadingMessage}</p>
          <p>
            Progress: {progress.current}/{progress.total} chunks
          </p>
        </div>
      )}
      {text && <pre className="w-prose text-wrap">{text}</pre>}
    </div>
  );
}
