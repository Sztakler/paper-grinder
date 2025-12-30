from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    root = client.get("/")
    assert root.status_code == 200
    assert root.json() == {"msg": "Hello, there."}

def tets_upload_pdf():
    fake_pdf = b"%PDF-1.4 fake pdf content"

    files = {
        "file": ("test.pdf", fake_pdf, "application/pdf")
    }

    root = client.post("/upload", files=files)
    assert root.status_code == 200
    assert "job_id" in root.json()
