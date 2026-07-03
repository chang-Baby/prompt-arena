#FastAPI启动
"""
main.py - FastAPI 应用入口
这是整个项目的"总开关"，所有功能都在这里注册和启动
"""

# ====== 第1部分：导入需要的库 ======

# FastAPI：Web框架核心
from fastapi import FastAPI

# StaticFiles：用来提供静态文件（HTML/CSS/JS）
from fastapi.staticfiles import StaticFiles

# CORSMiddleware：处理跨域请求（后面部署时需要）
from fastapi.middleware.cors import CORSMiddleware

# 上下文管理器：在启动/关闭时执行特定代码
from contextlib import asynccontextmanager

# 导入数据库相关：用来创建表
from app.database import engine, Base

# 导入路由（后面会创建）
from app.routers import players, battles, websocket


# ====== 第2部分：生命周期管理 ======

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    这个函数管理应用的"生命周期"：
    - 启动时做什么
    - 关闭时做什么

    为什么需要这个？
    因为我们需要在启动时自动创建数据库表，不用手动去MySQL执行
    """
    # --- 启动时执行 ---
    print("🚀 AI 格斗擂台 启动中...")

    # 创建所有数据表（如果不存在）
    # 这句代码会根据 models.py 里的定义，在 MySQL 里创建表
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表检查/创建完成")

    # yield 表示"应用运行期间"（相当于程序正常运行）
    yield

    # --- 关闭时执行 ---
    print("🛑 AI 格斗擂台 已关闭")


# ====== 第3部分：创建 FastAPI 应用 ======

app = FastAPI(
    title="AI 格斗擂台",  # API文档标题
    description="用AI生成角色，让它们格斗！",  # API文档描述
    version="1.0.0",  # 版本号
    lifespan=lifespan  # 绑定生命周期管理
)

# ====== 第4部分：CORS 中间件（解决跨域问题） ======

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有域名访问（开发阶段）
    allow_credentials=True,  # 允许携带凭证
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有请求头
)

# ====== 第5部分：挂载静态文件 ======

# 把 static 文件夹挂载到 /static 路径
# 这样浏览器访问 /static/index.html 就能看到页面
app.mount("/static", StaticFiles(directory="static"), name="static")

# ====== 第6部分：注册路由 ======

# 把各个路由文件注册到应用
# 前缀 /api/players 表示所有 players 路由都以 /api/players 开头
app.include_router(players.router, prefix="/api/players", tags=["玩家"])
app.include_router(battles.router, prefix="/api/battles", tags=["战斗"])
app.include_router(websocket.router, prefix="/api/ws", tags=["WebSocket"])


# ====== 第7部分：根路径 ======

@app.get("/")
async def root():
    """
    访问 http://localhost:8000 时返回的信息
    告诉用户服务在运行，并提供文档地址
    """
    return {
        "message": "⚔️ AI 格斗擂台 已启动！",
        "docs": "/docs",  # FastAPI 自动生成的API文档
        "前端页面": "/static/index.html"  # 前端页面地址
    }


# ====== 第8部分：健康检查 ======

@app.get("/health")
async def health():
    """
    健康检查接口，用于部署时验证服务是否正常
    返回 {"status": "ok"} 表示服务正常运行
    """
    return {"status": "ok"}


# ====== 第9部分：直接运行 ======

if __name__ == "__main__":
    """
    如果直接运行 python main.py，启动 uvicorn 服务器
    如果被其他文件导入（import），则不执行这部分
    """
    import uvicorn

    uvicorn.run(
        "app.main:app",  # 指向 app/main.py 里的 app 对象
        host="0.0.0.0",  # 监听所有网络接口（允许局域网访问）
        port=8000,  # 端口号
        reload=True  # 代码改动后自动重启（开发模式）
    )