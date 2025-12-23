from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
import re
import asyncio
from io import BytesIO
import uuid

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

def is_text_legible(text: str) -> bool:
    alnum = len(re.findall(r"[a-zA-Z0-9żźćńąśęóŻŹĆŃĄŚŁĘÓ]", text))
    total = len(text)
    return total > 0 and (alnum / total) > 0.6

def clean_text(text):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r'(?<!\.)\.(?!\.)|[!?]', lambda m: m.group(0) + '\n', text)
    return text

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    pdf_bytes = await file.read()

    app.state.jobs[job_id] = {
        "pdf": pdf_bytes,
        "queue": asyncio.Queue()
    }

    asyncio.create_task(process_pdf(job_id))

    return { "job_id": job_id }


async def process_pdf(job_id: str):
    job = app.state.jobs[job_id]
    pdf_bytes = job["pdf"]
    queue = job["queue"]

    # process PDF
    reader = PdfReader(BytesIO(pdf_bytes))
    total_pages = len(reader.pages)
    chunk_size = 5

    for start in range(0, total_pages, chunk_size):
        end = min(start + chunk_size, total_pages)
        text_chunk = "" # pages

        for page in reader.pages[start:end]:
            page_text = page.extract_text()
            text_chunk += page_text + "\n" if page_text else ""

        if not is_text_legible(text_chunk):
            pages_images = convert_from_bytes(pdf_bytes, first_page=start+1, last_page=end)
            text_chunk = ""
            for page_image in pages_images:
                text_chunk += pytesseract.image_to_string(page_image, lang="pol") + "\n"
        text_chunk = clean_text(text_chunk)

        await queue.put({
                            "chunk_index": start // chunk_size + 1,
                            "total_chunks": (total_pages + chunk_size - 1) // chunk_size,
                            "text": text_chunk,
                        })
        
    await queue.put({"status": "done"})
    


@app.websocket("/ws/{job_id}")
async def ws_stream(websocket: WebSocket, job_id: str):
    await websocket.accept()
    queue = app.state.jobs[job_id]["queue"]

    while True:
        msg = await queue.get()
        await websocket.send_json(msg)
        if msg.get("status") == "done":
            break

