from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
import re
import asyncio
from io import BytesIO
import uuid
from utils.text import is_text_legible, clean_text

app = FastAPI()
app.state.jobs = {}

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def hello():
    return {"msg": "Hello, there."}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    pdf_bytes = await file.read()
    app.state.jobs[job_id] = {
        "pdf": pdf_bytes,
        "queue": asyncio.Queue(),
        "started": False
    }
    return { "job_id": job_id }

async def process_pdf(job_id: str):
    try:
        job = app.state.jobs[job_id]
        pdf_bytes = job["pdf"]
        queue: asyncio.Queue = job["queue"]
        
        reader = PdfReader(BytesIO(pdf_bytes))
        total_pages = len(reader.pages)
        chunk_size = 5
        
        for start in range(0, total_pages, chunk_size):
            end = min(start + chunk_size, total_pages)
            text_chunk = ""
            
            for page in reader.pages[start:end]:
                page_text = page.extract_text()
                text_chunk += page_text + "\n" if page_text else ""
            
            if not is_text_legible(text_chunk):
                pages_images = convert_from_bytes(pdf_bytes, first_page=start+1, last_page=end)
                text_chunk = ""
                for page_image in pages_images:
                    text_chunk += pytesseract.image_to_string(page_image, lang="pol") + "\n"
            
            text_chunk = clean_text(text_chunk)
            chunk_num = start // chunk_size + 1
            print(f"Putting chunk {chunk_num} into queue")
            
            await queue.put({
                "chunk_index": chunk_num,
                "total_chunks": (total_pages + chunk_size - 1) // chunk_size,
                "text": text_chunk,
            })
            
            await asyncio.sleep(0.01)
        
        await queue.put({"status": "done"})
        
    except Exception as e:
        print(f"Error in process_pdf: {e}")
        await queue.put({"status": "error", "message": str(e)})

@app.websocket("/ws/{job_id}")
async def ws_stream(websocket: WebSocket, job_id: str):
    await websocket.accept()
    
    if job_id not in app.state.jobs:
        await websocket.send_json({"error": "job not found"})
        await websocket.close()
        return
    
    job = app.state.jobs[job_id]
    
    if not job["started"]:
        job["started"] = True
        asyncio.create_task(process_pdf(job_id))
    
    queue: asyncio.Queue = job["queue"]
    
    while True:
        msg = await queue.get()
        
        try:
            await websocket.send_json(msg)
        except Exception as e:
            break
        
        if msg.get("status") == "done":
            break
    
    await websocket.close()
    del app.state.jobs[job_id]
