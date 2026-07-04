#FastAPI启动
"""
main.py - FastAPI 应用入口
这是整个项目的"总开关"，所有功能都在这里注册和启动
"""

# ====== 第1部分：导入需要的库 ======
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.routers import players, battles, websocket


# ====== 第2部分：生命周期管理 ======
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 AI 格斗擂台 启动中...")
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表检查/创建完成")
    yield
    print("🛑 AI 格斗擂台 已关闭")


# ====== 第3部分：创建 FastAPI 应用 ======
app = FastAPI(
    title="AI 格斗擂台",
    description="用AI生成角色，让它们格斗！",
    version="1.0.0",
    lifespan=lifespan
)


# ====== 第4部分：CORS 中间件 ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====== 第5部分：挂载静态文件 ======
app.mount("/static", StaticFiles(directory="static"), name="static")


# ====== 第6部分：注册路由 ======
app.include_router(players.router, prefix="/api/players", tags=["玩家"])
app.include_router(battles.router, prefix="/api/battles", tags=["战斗"])
app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])


# ====== 第7部分：根路径 ======
@app.get("/")
async def root():
    return FileResponse("static/index.html")


# ====== 第8部分：健康检查 ======
@app.get("/health")
async def health():
    return {"status": "ok"}


# ====== 第9部分：直接运行 ======
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )