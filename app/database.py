#读取.env → 组装数据库地址 → 创建连接池 → 提供会话工具
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@127.0.0.1:3306/{os.getenv('MYSQL_DATABASE')}?charset=utf8mb4"
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,

)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind =engine )
Base = declarative_base()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
