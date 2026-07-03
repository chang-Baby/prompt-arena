"""
players.py - 玩家注册和登录
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
from app.database import get_db
from app.models import Player

router = APIRouter()

# ====== 请求/响应模型 ======
class PlayerCreate(BaseModel):
    username: str
    password: str

class PlayerLogin(BaseModel):
    username: str
    password: str

class PlayerResponse(BaseModel):
    id: int
    username: str
    wins: int
    losses: int
    elo_score: int


# ====== 注册接口 ======
@router.post("/register", response_model=PlayerResponse)
def register(player: PlayerCreate, db: Session = Depends(get_db)):
    # 检查用户名是否已存在
    existing = db.query(Player).filter(Player.username == player.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已被占用")

    # 加密密码
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(player.password.encode('utf-8'), salt).decode('utf-8')

    # 创建新玩家
    new_player = Player(
        username=player.username,
        password_hash=hashed_password,
        elo_score=1200,
        wins=0,
        losses=0
    )

    db.add(new_player)
    db.commit()
    db.refresh(new_player)

    return PlayerResponse(
        id=new_player.id,
        username=new_player.username,
        wins=new_player.wins,
        losses=new_player.losses,
        elo_score=new_player.elo_score
    )


# ====== 登录接口 ======
@router.post("/login")
def login(player: PlayerLogin, db: Session = Depends(get_db)):
    # 查找玩家
    db_player = db.query(Player).filter(Player.username == player.username).first()
    if not db_player:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 验证密码
    is_valid = bcrypt.checkpw(
        player.password.encode('utf-8'),
        db_player.password_hash.encode('utf-8')
    )

    if not is_valid:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    return {
        "success": True,
        "message": "登录成功",
        "player": {
            "id": db_player.id,
            "username": db_player.username,
            "wins": db_player.wins,
            "losses": db_player.losses,
            "elo_score": db_player.elo_score
        }
    }


# ====== 获取所有玩家（排行榜） ======
@router.get("/")
def get_all_players(db: Session = Depends(get_db)):
    players = db.query(Player).order_by(Player.elo_score.desc()).all()
    return [
        {
            "id": p.id,
            "username": p.username,
            "wins": p.wins,
            "losses": p.losses,
            "elo_score": p.elo_score
        }
        for p in players
    ]