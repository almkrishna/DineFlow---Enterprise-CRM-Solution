from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from jose import jwt, JWTError
from app.config import settings

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()


def is_staff_token(token: str) -> bool:
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload.get("role") in {"admin", "chef"}
    except JWTError:
        return False


@router.websocket("/ws/kitchen")
async def websocket_kitchen(websocket: WebSocket):
    if not is_staff_token(websocket.query_params.get("token")):
        await websocket.close(code=1008)
        return
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
