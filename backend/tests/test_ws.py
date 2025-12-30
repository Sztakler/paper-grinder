import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

async def fake_process_pdf(job_id: str):
    job = app.state.jobs[job_id]
    queue = job["queue"]

    await queue.put({
                        "chunk_index": 1,
                        "total_chunks": 1,
                        "text": "Hello from test",
                    })
    await queue.put({"status": "done"})


async def fake_process_pdf_chunks(job_id: str):
    job = app.state.jobs[job_id]
    queue = job["queue"]
    n_chunks = 3
    for i in range(n_chunks):
        await queue.put({
                            "chunk_index": i+1,
                            "total_chunks": n_chunks,
                            "text": f"Chunk {i+1}",
                        })

    await queue.put({"status": "done"})

def test_ws_stream(monkeypatch):

    monkeypatch.setattr("app.main.process_pdf", fake_process_pdf)

    root = client.post("/upload", files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")})
    job_id = root.json()["job_id"]

    with client.websocket_connect(f"/ws/{job_id}") as ws:
        msg1 = ws.receive_json()
        assert msg1["text"] == "Hello from test"

        msg2 = ws.receive_json()
        assert msg2["status"] == "done"

def test_ws_chunking(monkeypatch):

    monkeypatch.setattr("app.main.process_pdf", fake_process_pdf_chunks)

    root = client.post("/upload", files={"file": ("test.pdf", b"%PDF-1.4", "application/pdf")})
    job_id = root.json()["job_id"]

    with client.websocket_connect(f"/ws/{job_id}") as ws:
        chunks = []
        while True:
            msg = ws.receive_json()
            if msg.get("status") == "done":
                break
            chunks.append(msg)

    assert len(chunks) == 3
    assert chunks[0]["text"] == "Chunk 1"
