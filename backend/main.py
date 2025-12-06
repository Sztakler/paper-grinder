from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
import re

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

    return {"text": text[:1000]}

