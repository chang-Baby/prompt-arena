"""
websocket.py - WebSocket 实时通信
用于：实时观战、多人投票、在线状态
（目前是占位，后面可以扩展）
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

router = APIRouter()


# ====== 存储所有活跃连接 ======
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
        """广播消息给所有连接的客户端"""
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass


manager = ConnectionManager()


# ====== WebSocket 连接端点 ======
@router.websocket("/connect")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket 连接入口
    客户端连接 ws://127.0.0.1:8000/api/ws/connect
    """
    await manager.connect(websocket)

    # 发送欢迎消息
    await websocket.send_text(json.dumps({
        "type": "system",
        "message": "连接成功！欢迎来到 AI 格斗擂台"
    }))

    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()

            # 处理消息
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "unknown")

                if msg_type == "ping":
                    # 心跳检测
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": msg.get("timestamp")
                    }))
                elif msg_type == "chat":
                    # 聊天消息（广播给所有人）
                    await manager.broadcast(json.dumps({
                        "type": "chat",
                        "message": msg.get("message", ""),
                        "sender": msg.get("sender", "anonymous")
                    }))
                else:
                    # 未知消息类型
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"未知消息类型: {msg_type}"
                    }))

            except json.JSONDecodeError:
                # 不是 JSON 格式
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "消息必须是 JSON 格式"
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # 广播有人离开
        await manager.broadcast(json.dumps({
            "type": "system",
            "message": "有人离开了观战席"
        }))


# ====== 获取在线人数 ======
@router.get("/online-count")
def get_online_count():
    """获取当前在线人数"""
    return {"online_count": len(manager.active_connections)}