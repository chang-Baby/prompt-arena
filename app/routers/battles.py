"""
battles.py - 战斗相关 API
处理：创建战斗、查询战斗历史、获取战斗详情
"""
from core.battle import create_fight_result
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import json
import random

from app.database import get_db
from app.models import Battle, Player, BattleStatus

# ====== 创建路由器 ======
router = APIRouter()


# ====== 请求模型 ======
class FightRequest(BaseModel):
    """发起战斗的请求格式"""
    scene: str  # 擂台场景
    player1_prompt: str  # 玩家1的角色描述
    player2_prompt: str  # 玩家2的角色描述


class FightResponse(BaseModel):
    """战斗结果返回格式"""
    battle_id: int
    scene: str
    player1_prompt: str
    player2_prompt: str
    battle_log: dict  # 战斗日志（JSON）
    winner: str  # 'player1', 'player2', 'draw'
    created_at: datetime


# ====== 预置场景列表 ======
SCENES = [
    "地下黑市拳场，铁笼和呐喊的观众",
    "赛博朋克街头，霓虹灯下雨水飞溅",
    "古罗马角斗场，烈日下沙地灼热",
    "废弃工厂顶楼，月光照亮锈蚀的钢铁",
    "亚马逊雨林空地，原始部落战鼓轰鸣"
]


# ====== 获取随机场景 ======
@router.get("/scenes")
def get_scenes():
    """返回所有预置场景"""
    return {"scenes": SCENES}


@router.get("/random-scene")
def random_scene():
    """返回一个随机场景"""
    return {"scene": random.choice(SCENES)}


# ====== 发起战斗 ======
@router.post("/fight", response_model=FightResponse)
def start_fight(
        request: FightRequest,
        db: Session = Depends(get_db)
):
    """
    发起一场新战斗
    流程：
    1. 获取或创建临时玩家（演示模式）
    2. 创建战斗记录
    3. 调用 AI 生成角色和战斗（TODO：后面集成 core/battle.py）
    4. 返回战斗结果
    """

    # 1. 获取或创建临时玩家
    # 演示模式：如果没有登录，使用固定的演示账号
    player1 = db.query(Player).filter(Player.username == "demo_player1").first()
    if not player1:
        player1 = Player(
            username="demo_player1",
            password_hash="demo_hash_demo1",
            elo_score=1200
        )
        db.add(player1)
        db.flush()

    player2 = db.query(Player).filter(Player.username == "demo_player2").first()
    if not player2:
        player2 = Player(
            username="demo_player2",
            password_hash="demo_hash_demo2",
            elo_score=1200
        )
        db.add(player2)
        db.flush()

    # 2. 创建战斗记录
    battle = Battle(
        theme=request.scene,
        player1_id=player1.id,
        player2_id=player2.id,
        player1_prompt=request.player1_prompt,
        player2_prompt=request.player2_prompt,
        status=BattleStatus.ACTIVE
    )
    db.add(battle)
    db.flush()  # 获取 battle.id

    # ====== 3. TODO: 调用 AI 生成角色和战斗 ======
    # 这里先用模拟数据，后面集成了 core/battle.py 再替换
    # 目前生成一个模拟的战斗日志

    # 模拟角色数据
    # ====== 调用 AI 生成角色和战斗 ======
    fight_result = create_fight_result(
        scene=request.scene,
        prompt1=request.player1_prompt,
        prompt2=request.player2_prompt
    )

    char1 = fight_result["player1_char"]
    char2 = fight_result["player2_char"]
    battle_log = {
        "player1_char": char1,
        "player2_char": char2,
        "story": fight_result["story"],
        "winner": fight_result["winner"],
        "reason": fight_result["reason"]
    }

    # 4. 更新战斗记录
    battle.battle_log = json.dumps(battle_log, ensure_ascii=False)
    battle.winner = "player1"  # 模拟胜者
    battle.status = BattleStatus.FINISHED
    battle.ended_at = datetime.now()

    # 5. 更新玩家统计（演示模式，简单处理）
    # 玩家1获胜
    player1.wins += 1
    player2.losses += 1

    db.commit()
    db.refresh(battle)

    # 6. 返回结果
    return FightResponse(
        battle_id=battle.id,
        scene=battle.theme,
        player1_prompt=battle.player1_prompt,
        player2_prompt=battle.player2_prompt,
        battle_log=battle_log,
        winner="player1",
        created_at=battle.created_at
    )


# ====== 获取战斗历史 ======
@router.get("/history")
def get_battle_history(
        limit: int = 20,
        db: Session = Depends(get_db)
):
    """
    获取最近的战斗记录
    """
    battles = db.query(Battle).order_by(
        Battle.created_at.desc()
    ).limit(limit).all()

    return [
        {
            "id": b.id,
            "scene": b.theme,
            "player1_prompt": b.player1_prompt[:50] + "..." if len(b.player1_prompt) > 50 else b.player1_prompt,
            "player2_prompt": b.player2_prompt[:50] + "..." if len(b.player2_prompt) > 50 else b.player2_prompt,
            "winner": b.winner,
            "created_at": b.created_at
        }
        for b in battles
    ]


# ====== 获取单场战斗详情 ======
@router.get("/{battle_id}")
def get_battle_detail(
        battle_id: int,
        db: Session = Depends(get_db)
):
    """
    获取某场战斗的完整详情
    """
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    if not battle:
        raise HTTPException(status_code=404, detail="战斗记录不存在")

    return {
        "id": battle.id,
        "scene": battle.theme,
        "player1_prompt": battle.player1_prompt,
        "player2_prompt": battle.player2_prompt,
        "battle_log": json.loads(battle.battle_log) if battle.battle_log else None,
        "winner": battle.winner,
        "status": battle.status.value,
        "created_at": battle.created_at,
        "ended_at": battle.ended_at
    }