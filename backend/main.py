from fastapi import FastAPI, UploadFile, File
from pypdf import PdfReader

app = FastAPI()

@app.get("/")
def hello():
    return {"msg": "Hello, there."}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    reader = PdfReader("homer-iliada.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    return {"text": text[:500]}
