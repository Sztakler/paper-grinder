export async function uploadFileHTTP(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:8000/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export function uploadFileWS(
  file: File,
  {
    onChunk,
    onDone,
    onError,
  }: {
    onChunk: (data: any) => void;
    onDone: () => void;
    onError?: (err: Event) => void;
  },
) {
  const ws = new WebSocket("ws://localhost:8000/ws/upload");
  ws.binaryType = "arraybuffer";

  ws.onopen = () => ws.send(file);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.status === "done") onDone();
    else onChunk(data);
  };

  ws.onerror = onError ?? (() => {});
}
