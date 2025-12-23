import { useState } from "react";
import { uploadFileHTTP } from "../services/uploadService";
import { streamResultWS } from "services/streamService";

const [text, setText] = useState("");
const [progress, setProgress] = useState({ current: 0, total: 0 });
const [loading, setLoading] = useState(false);

async function uploadAndStream(file: File) {
  setLoading(true);
  setText("");

  const { job_id } = await uploadFileHTTP(file);

  streamResultWS(job_id, {
    onChunk: (data: any) => {
      setText((prev) => prev + data.text);
      setProgress({ current: data.chunk_index, total: data.total_chunks });
    },
    onDone: () => setLoading(false),
  });
}
