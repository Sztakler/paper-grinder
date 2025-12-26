import asyncio
import websockets
import requests
import json

PDF_PATH = "jp2.pdf"
UPLOAD_URL = "http://127.0.0.1:8000/upload"
WS_URL = "ws://127.0.0.1:8000/ws/{}"

def upload_pdf():
    """Upload PDF via HTTP and get job_id"""
    with open(PDF_PATH, "rb") as f:
        files = {"file": f}
        res = requests.post(UPLOAD_URL, files=files)
    res.raise_for_status()
    job_id = res.json()["job_id"]
    print(f"Uploaded PDF, got job_id: {job_id}")
    return job_id

async def stream_job(job_id: str):
    uri = f"ws://localhost:8000/ws/{job_id}"
    async with websockets.connect(uri) as ws:
        while True:
            try:
                msg = await ws.recv()
                data = json.loads(msg)
                print(data)
                if data.get("status") == "done":
                    break
                await asyncio.sleep(2)
            except websockets.ConnectionClosedOK:
                break


if __name__ == "__main__":
    job_id = upload_pdf()
    asyncio.run(stream_job(job_id))

