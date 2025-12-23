export function streamResultWS(
  jobId: string,
  { onChunk, onDone, onError }: any,
) {
  const ws = new WebSocket(`ws://localhost:8000/ws/${jobId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.status === "done") {
      onDone();
      ws.close();
    } else {
      onChunk(data);
    }
  };

  ws.onerror = onError ?? (() => {});

  return () => ws.close();
}
