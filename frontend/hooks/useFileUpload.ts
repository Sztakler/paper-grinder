import { useRef, useState } from "react";
import { uploadFileHTTP } from "../services/uploadService";
import { streamResultWS } from "../services/streamService";

export function useFileUpload() {
  const [text, setText] = useState("");
  const textRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const wsCancelRef = { current: null as null | (() => void) };

  async function upload(file: File) {
    setLoading(true);
    setText("");
    textRef.current = "";
    setProgress({ current: 0, total: 0 });
    setLoadingMessage(file.name);

    try {
      const { job_id } = await uploadFileHTTP(file);

      wsCancelRef.current = streamResultWS(job_id, {
        onChunk: (data: any) => {
          console.log("🔄 onChunk called with:", data.chunk_index);
          console.log("📝 Current text length:", text.length);
          setText((prev) => {
            const newText = prev + data.text;
            console.log("📝 New text length:", newText.length);
            return newText;
          });
          setProgress({ current: data.chunk_index, total: data.total_chunks });
        },
        onDone: () => setLoading(false),
        onError: (err: any) => {
          console.error(err);
          setLoading(false);
        },
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  function cancel() {
    wsCancelRef.current?.();
    setLoading(false);
  }

  return { upload, cancel, text, loading, loadingMessage, progress };
}
