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
          console.log(
            "🔄 Before - textRef.current length:",
            textRef.current.length,
          );
          textRef.current += data.text;
          console.log(
            "🔄 After - textRef.current length:",
            textRef.current.length,
          );
          console.log("🔄 Setting text to state...");
          setText(textRef.current);
          console.log("🔄 State updated");
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
