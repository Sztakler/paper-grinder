import asyncio
import websockets

async def test_pdf():
    uri = "ws://localhost:8000/ws/upload"
    async with websockets.connect(uri) as ws:
        greeting = await ws.recv()
        print(greeting)

        with open("homer-iliada.pdf", "rb") as f:
            data = f.read()
            await ws.send(data)  # jeśli plik duży, lepiej w chunkach

        while True:
            try:
                msg = await ws.recv()
                print("MSG:", msg)
            except websockets.ConnectionClosedOK:
                print("Connection closed properly")
                break
            except websockets.ConnectionClosedError:
                print("Connection closed with error")
                break

asyncio.run(test_pdf())
