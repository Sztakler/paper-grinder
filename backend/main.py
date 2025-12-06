from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
import re
import asyncio
from io import BytesIO

app = FastAPI()

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
    
    reader = PdfReader(file.file)
    text = ""
    for page in reader.pages[:5]:
        page_text = page.extract_text()
        text += page_text + '\n' if page_text else ""

    if not is_text_legible(text):
        file.file.seek(0)
        content = file.file.read()
        pages = convert_from_bytes(content)
        text = ""
        for page in pages[:5]:
            text += pytesseract.image_to_string(page, lang="pol") + "\n"
            text = clean_text(text)

    return {"text": text[:1000]}


@app.websocket("/ws/upload")
async def websocket_upload(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"status": "connected"})

    pdf_bytes = await websocket.receive_bytes()
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

        await websocket.send_json({
                                      "chunk_index": start/chunk_size + 1,
                                      "total_chunks": (total_pages + chunk_size - 1) // chunk_size,
                                      "text": text_chunk,
                                  })
        await asyncio.sleep(0.05)

    await websocket.send_json({"status": "done"})
    await websocket.close()
