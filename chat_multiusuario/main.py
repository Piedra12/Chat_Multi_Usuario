from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Dict
import asyncio
import json
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Chat Multiusuario")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Zona horaria del servidor: México centro. Puede cambiarse con la variable TZ_CHAT.
TIME_ZONE = os.getenv("TZ_CHAT", "America/Mexico_City")

class ChatManager:
    def __init__(self):
        self.connections: Dict[WebSocket, str] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        async with self.lock:
            self.connections[websocket] = username
            users = sorted(set(self.connections.values()))
        await self.broadcast({
            "type": "system",
            "message": f"{username} se conectó al chat.",
            "time": self.timestamp(),
            "users": users
        })

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            username = self.connections.pop(websocket, None)
            users = sorted(set(self.connections.values()))
        if username:
            await self.broadcast({
                "type": "system",
                "message": f"{username} salió del chat.",
                "time": self.timestamp(),
                "users": users
            })

    async def broadcast(self, data: dict):
        # Copiar las conexiones evita iterar sobre un diccionario que cambie durante el envío.
        async with self.lock:
            sockets = list(self.connections.keys())
        stale = []
        for socket in sockets:
            try:
                await socket.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                stale.append(socket)
        # Limpiar conexiones que ya no responden.
        for socket in stale:
            await self.disconnect(socket)

    async def send_users(self):
        async with self.lock:
            users = sorted(set(self.connections.values()))
        await self.broadcast({
            "type": "users",
            "users": users,
            "time": self.timestamp()
        })

    @staticmethod
    def timestamp():
        return datetime.now(ZoneInfo(TIME_ZONE)).isoformat(timespec="seconds")

manager = ChatManager()

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    username = (websocket.query_params.get("username") or "").strip()
    if not username:
        await websocket.close(code=1008, reason="Se requiere un nombre")
        return
    username = username[:24]

    await manager.connect(websocket, username)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                incoming = json.loads(raw)
            except json.JSONDecodeError:
                continue

            message = str(incoming.get("message", "")).strip()
            if not message:
                continue
            message = message[:1000]
            await manager.broadcast({
                "type": "message",
                "username": username,
                "message": message,
                "time": manager.timestamp()
            })
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
