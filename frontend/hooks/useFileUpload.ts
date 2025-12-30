import { useRef, useState } from "react";
import { uploadFileHTTP } from "../services/uploadService";
import { streamResultWS } from "../services/streamService";

export function useFileUpload() {
  const [text, setText] = useState("");
  const textRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [jobId, setJobId] = useState<string | null>(null);
  const [processingDone, setProcessingDone] = useState(false);
  const wsCancelRef = { current: null as null | (() => void) };

  async function upload(file: File) {
    setLoading(true);
    setProcessingDone(false);
    setJobId(null);
    setText("");
    textRef.current = "";
    setProgress({ current: 0, total: 0 });
    setLoadingMessage(`Loading ${file.name}...`);

    try {
      const { job_id } = await uploadFileHTTP(file);
      setJobId(job_id);

      wsCancelRef.current = streamResultWS(job_id, {
        onChunk: (data: any) => {
          textRef.current += data.text;
          setText(textRef.current);
          setProgress({
            current: data.chunk_index,
            total: data.total_chunks,
          });
        },
        onDone: () => {
          setLoading(false);
          setProcessingDone(true);
        },
        onError: (err: any) => {
          console.error("WebSocket error:", err);
          setLoading(false);
          setLoadingMessage("Processing error");
          setProcessingDone(true);
        },
      });
      return job_id;
    } catch (err) {
      console.error("Upload error:", err);
      setLoading(false);
      setLoadingMessage("Upload error");
      setProcessingDone(true);
      return null;
    }
  }

  function cancel() {
    wsCancelRef.current?.();
    setLoading(false);
  }

  return {
    upload,
    cancel,
    text,
    loading,
    loadingMessage,
    progress,
    jobId,
    processingDone,
  };
}
