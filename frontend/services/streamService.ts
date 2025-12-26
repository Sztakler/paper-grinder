export function streamResultWS(
  jobId: string,
  { onChunk, onDone, onError }: any,
) {
  const ws = new WebSocket(`ws://localhost:8000/ws/${jobId}`);

  ws.onopen = () => {
    console.log("✅ WebSocket connected");
  };

  ws.onmessage = (event) => {
    console.log("📦 Raw message:", event.data.slice(0, 50));
    const data = JSON.parse(event.data);
    console.log("📦 Parsed data:", data);

    if (data.status === "done") {
      console.log("✔️ Done received");
      onDone();
      ws.close();
    } else {
      console.log("📄 Chunk", data.chunk_index, "received");
      onChunk(data);
    }
  };

  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
    onError?.(error);
  };

  return () => ws.close();
}
