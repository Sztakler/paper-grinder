from fastapi import FastAPI, UploadFile, File
from pdf2image import convert_from_path
import pytesseract

app = FastAPI()

@app.get("/")
def hello():
    return {"msg": "Hello, there."}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    pages = convert_from_path("homer-iliada.pdf")
    text = ""
    for page in pages[:5]:
        text += pytesseract.image_to_string(page, lang="pol") + '\n'

    return {"text": text[:1000]}
