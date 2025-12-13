import React, { useState, DragEvent } from "react";

type FileDropzoneProps = {
  onFileDrop: (file: File) => void;
};

export default function FileDropzone({ onFileDrop }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

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

    onFileDrop(file);
  };

  const handleManualPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileDrop(file);
  };

  return (
    <form className={`flex justify-center`}>
      <div
        className={`mt-2 flex justify-center rounded-lg border border-dashed border-white/25 px-16 py-12 w-fit ${isDragging ? "bg-[#d4d6d2]" : ""}`}
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
                onChange={(e) => {
                  const file = e.target.files[0];
                  setFile(file);
                  handleUpload(file);
                }}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs/5 text-gray-600">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
    </form>

    // <div
    //   onDragOver={handleDragOver}
    //   onDragLeave={handleDragLeave}
    //   onDrop={handleDrop}
    // className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
    //     isDragging
    //       ? "bg-gray-200 border-blue-500"
    //       : "bg-gray-50 border-gray-400"
    //   }`}
    //   onClick={() => document.getElementById("fileInput")?.click()}
    // >
    //   <input
    //     id="fileInput"
    //     type="file"
    //     accept="application/pdf"
    //     className="hidden"
    //     onChange={handleManualPick}
    //   />

    //   <p className="text-xl font-semibold">
    //     {isDragging ? "Puść to kurwa" : "Przeciągnij PDF albo kliknij"}
    //   </p>
    //   <p className="text-gray-500 mt-2 text-sm">Obsługuję tylko pliki PDF</p>
    // </div>
  );
}
