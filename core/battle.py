"""
battle.py - AI 格斗核心逻辑
调用 DeepSeek API 生成角色和战斗故事
这是整个项目最核心的部分！
"""

import json
import os
from openai import OpenAI
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# ====== 初始化 DeepSeek 客户端 ======
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
)


def generate_character(scene: str, player_prompt: str, player_num: int) -> dict:
    """
    根据玩家的文字描述，调用 AI 生成结构化的角色数据

    参数:
        scene: 擂台场景（如 "古罗马角斗场"）
        player_prompt: 玩家的角色描述（如 "一个200公斤的相扑选手"）
        player_num: 玩家编号（1 或 2）

    返回:
        角色数据字典，包含 name, description, hp, attack, defense, skill
    """

    # ====== 构造 Prompt ======
    system_prompt = """你是一个游戏角色设计师。根据玩家的描述，生成一个格斗角色。
必须输出纯 JSON 格式，不要包含其他文字。
"""

    user_prompt = f"""
擂台场景：{scene}

玩家{player_num}的角色描述：{player_prompt}

请生成角色数据，格式如下：
{{
    "name": "角色名（3-10个字）",
    "description": "角色外观和特点（50字以内）",
    "hp": 100,
    "attack": 10,
    "defense": 5,
    "skill": "必杀技名称（4-8个字）"
}}

属性范围：
- hp: 80-120
- attack: 8-15
- defense: 3-8

只输出 JSON，不要其他内容！
"""

    # ====== 调用 DeepSeek ======
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.8,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        # 解析返回的 JSON
        character = json.loads(response.choices[0].message.content)
        return character

    except Exception as e:
        # 如果 AI 调用失败，返回默认角色
        print(f"⚠️ AI 生成角色失败: {e}")
        return {
            "name": f"战士{player_num}",
            "description": f"来自{scene}的勇猛战士",
            "hp": 100,
            "attack": 10,
            "defense": 5,
            "skill": "全力一击"
        }


def simulate_fight(char1: dict, char2: dict, scene: str) -> dict:
    """
    调用 AI 模拟两个角色的格斗，返回战斗故事和胜者

    参数:
        char1: 玩家1的角色数据
        char2: 玩家2的角色数据
        scene: 擂台场景

    返回:
        {
            "story": "完整的战斗故事",
            "winner": "player1" 或 "player2" 或 "draw",
            "reason": "胜负理由"
        }
    """

    # ====== 构造 Prompt ======
    system_prompt = """你是一个格斗解说员，擅长用生动的语言描述战斗。
根据两个角色的属性，模拟一场精彩的格斗。
最终必须判定谁赢，并给出令人信服的理由。

输出必须是 JSON 格式：
{
    "story": "完整的战斗故事（200-400字，有画面感）",
    "winner": "player1" 或 "player2" 或 "draw",
    "reason": "胜负理由（50字以内）"
}
"""

    user_prompt = f"""
擂台场景：{scene}

【玩家1的角色】
名字：{char1.get('name', '战士1')}
描述：{char1.get('description', '')}
血量：{char1.get('hp', 100)}
攻击力：{char1.get('attack', 10)}
防御力：{char1.get('defense', 5)}
必杀技：{char1.get('skill', '全力一击')}

【玩家2的角色】
名字：{char2.get('name', '战士2')}
描述：{char2.get('description', '')}
血量：{char2.get('hp', 100)}
攻击力：{char2.get('attack', 10)}
防御力：{char2.get('defense', 5)}
必杀技：{char2.get('skill', '全力一击')}

请模拟这场格斗，综合考虑：
1. 攻击力高的人更有优势
2. 防御力高的人更能抗
3. 血量大的人更持久
4. 但也要有意外和反转（增加观赏性）

输出 JSON 格式！
"""

    # ====== 调用 DeepSeek ======
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.9,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return {
            "story": result.get("story", "战斗激烈..."),
            "winner": result.get("winner", "draw"),
            "reason": result.get("reason", "势均力敌")
        }

    except Exception as e:
        print(f"⚠️ AI 模拟战斗失败: {e}")
        return {
            "story": f"在{scene}中，{char1.get('name', '战士1')}和{char2.get('name', '战士2')}展开了激烈对决！",
            "winner": "draw",
            "reason": "双方势均力敌"
        }


def create_fight_result(scene: str, prompt1: str, prompt2: str) -> dict:
    """
    完整战斗流程：生成角色 → 模拟战斗 → 返回结果

    这是 battles.py 调用的主入口函数
    """

    # 第1步：生成两个角色
    char1 = generate_character(scene, prompt1, 1)
    char2 = generate_character(scene, prompt2, 2)

    # 第2步：模拟战斗
    fight_result = simulate_fight(char1, char2, scene)

    # 第3步：组装最终结果
    return {
        "player1_char": char1,
        "player2_char": char2,
        "story": fight_result["story"],
        "winner": fight_result["winner"],
        "reason": fight_result["reason"]
    }