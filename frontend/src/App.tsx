import { useRef, useState } from "react";
import FileDropzone from "./FileDropzone";

export function App() {
  return (
    <div className="m-auto w-full min-h-screen bg-[#edefeb]">
      <div className="px-48 py-8 flex flex-col">
        <h1 className="text-2xl">paper-grinder</h1>

        <FileDropzone />
      </div>
    </div>
  );
}
