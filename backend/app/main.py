from fastapi import FastAPI, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
import re
import asyncio
from io import BytesIO
import uuid
from rank_bm25 import BM25Okapi
from groq import Groq
import os
from dotenv import load_dotenv
from app.utils.text import is_text_legible, clean_text

app = FastAPI()
app.state.jobs = {}

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise RuntimeError("Missing GROP_API_KEY in the .env file. Add it and try again.")
client = Groq(api_key=groq_api_key)

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
        "started": False,
        "chunks": [],
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

            job["chunks"].append({
                                      "chunk_index": chunk_num,
                                      "text": text_chunk,
                                  })
            
            await queue.put({
                "chunk_index": chunk_num,
                "total_chunks": (total_pages + chunk_size - 1) // chunk_size,
                "text": text_chunk,
            })
            
            await asyncio.sleep(0.01)

        if job["chunks"]:
            tokenized_chunks = [text_chunk["text"].lower().split() for text_chunk in job["chunks"]]
            job["bm25"] = BM25Okapi(tokenized_chunks)
        else:
            job["bm25"] = None
        
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
    # del app.state.jobs[job_id]

@app.websocket("/ws/chat/{job_id}")
async def ws_chat(websocket: WebSocket, job_id: str):
    print(f"\n[CHAT_WS] ⚡ Nowy klient próbuje połączyć się z job_id = {job_id}")
    
    try:
        await websocket.accept()
        print(f"[CHAT_WS] ✅ Połączenie zaakceptowane dla {job_id}")

        if job_id not in app.state.jobs:
            print(f"[CHAT_WS] ❌ Job {job_id} NIE ISTNIEJE w app.state.jobs")
            await websocket.send_json({"error": "Job not found"})
            await websocket.close()
            return

        job = app.state.jobs[job_id]
        print(f"[CHAT_WS] ✅ Job znaleziony. Zawartość kluczy: {list(job.keys())}")
        print(f"[CHAT_WS] 📄 Liczba zapisanych chunków: {len(job.get('chunks', []))}")
        print(f"[CHAT_WS] 🔍 Czy bm25 istnieje? {'bm25' in job} → {job.get('bm25') is not None}")

        # Czekamy na zakończenie przetwarzania PDF-a
        # queue: asyncio.Queue = job["queue"]
        # print(f"[CHAT_WS] Oczekiwanie na sygnał 'done' z kolejki przetwarzania...")

        # try:
        #     while True:
        #         msg = await asyncio.wait_for(queue.get(), timeout=30.0)
        #         print(f"[CHAT_WS] Otrzymano z kolejki: {msg}")
        #         if msg.get("status") == "done":
        #             print(f"[CHAT_WS] Przetwarzanie PDF-a zakończone!")
        #             break
        # except asyncio.TimeoutError:
        #     print(f"[CHAT_WS] Timeout! Przetwarzanie nie zakończyło się w ciągu 30s")
        #     await websocket.send_json({"error": "Przetwarzanie PDF-a nie zakończone (timeout)"})
        #     await websocket.close()
        #     return

        # Check if chunks are available
        if not job.get("chunks"):
            print(f"[CHAT_WS] ❌ Brak chunków tekstu – PDF pusty lub błąd OCR")
            await websocket.send_json({"error": "Brak przetworzonych fragmentów tekstu z PDF-a"})
            await websocket.close()
            return

        if job.get("bm25") is None:
            print(f"[CHAT_WS] ❌ Indeks BM25 nie został zbudowany (prawdopodobnie brak chunków)")
            await websocket.send_json({"error": "Nie udało się zbudować indeksu wyszukiwania"})
            await websocket.close()
            return

        print(f"[CHAT_WS] Wszystko gotowe! BM25 działa, mamy {len(job['chunks'])} chunków.")
        print(f"[CHAT_WS] Czekam na pytania od użytkownika...\n")

        # Główna pętla czatu
        while True:
            try:
                data = await websocket.receive_json()
                print(f"[CHAT_WS] Otrzymano wiadomość od klienta: {data}")

                if "query" not in data:
                    print("[CHAT_WS] Brak klucza 'query' – ignoruję")
                    continue

                query = data["query"].strip()
                if not query:
                    print("[CHAT_WS] Puste pytanie – ignoruję")
                    continue

                print(f"[CHAT_WS] Przetwarzam pytanie: '{query}'")

                # Retrieval
                tokenized_query = query.lower().split()
                scores = job["bm25"].get_scores(tokenized_query)
                top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:5]
                relevant_chunks = [job["chunks"][i] for i in top_indices if scores[i] > 0]

                if not relevant_chunks:
                    print("[CHAT_WS] Nie znaleziono żadnych pasujących fragmentów")
                    await websocket.send_json({
                        "response": "Nie znalazłem żadnych pasujących fragmentów w dokumencie."
                    })
                    continue

                context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])
                print(f"[CHAT_WS] Znaleziono {len(relevant_chunks)} pasujących chunków – wysyłamy do LLM")

                # Prompt do Groq
                system_prompt = "Jesteś pomocnym asystentem analizującym treść PDF. Odpowiadaj po polsku, opierając się wyłącznie na podanym kontekście."
                user_prompt = f"Kontekst z PDF:\n{context}\n\nPytanie użytkownika: {query}\nOdpowiedź:"

                # Streaming odpowiedzi
                stream = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1024,
                    stream=True,
                )

                full_response = ""
                print("[CHAT_WS] Streaming odpowiedzi z Groq...")
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        token = chunk.choices[0].delta.content
                        full_response += token
                        await websocket.send_json({"token": token})

                await websocket.send_json({"done": True, "full_response": full_response})
                print(f"[CHAT_WS] Odpowiedź zakończona (długość: {len(full_response)} znaków)\n")

            except Exception as recv_error:
                print(f"[CHAT_WS] Błąd podczas odbierania/przetwarzania wiadomości: {recv_error}")
                break

    except Exception as e:
        print(f"[CHAT_WS] Krytyczny błąd w WebSocket chat: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_json({"error": f"Błąd serwera: {str(e)}"})
        except:
            pass
    finally:
        print(f"[CHAT_WS] Zamykam połączenie dla job_id = {job_id}\n")
