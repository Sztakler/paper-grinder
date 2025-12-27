export function streamResultWS(
  jobId: string,
  { onChunk, onDone, onError }: any,
) {
  const ws = new WebSocket(`ws://localhost:8000/ws/${jobId}`);

  ws.onopen = () => {};

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.status === "done") {
      onDone();
      ws.close();
    } else {
      onChunk(data);
    }
  };

  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
    onError?.(error);
  };

  return () => ws.close();
}
