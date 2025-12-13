import { useRef, useState } from "react";
import { uploadFileWS } from "../services/uploadService";

export function useFileUpload() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const wsCleanupRef = useRef<null | (() => void)>(null);

  function upload(file: File) {
    setLoading(true);
    setText("");
    setLoadingMessage(file.name);

    wsCleanupRef.current = uploadFileWS(file, {
      onChunk: (data) => {
        setText((prev) => prev + data.text);
        setProgress({ current: data.chunk_index, total: data.total_chunks });
      },
      onDone: () => {
        setLoading(false);
      },
    });
  }

  function cancel() {
    wsCleanupRef.current?.();
    setLoading(false);
  }

  return { upload, cancel, text, loading, loadingMessage, progress };
}
