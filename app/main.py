from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def home():
    return {"message": "欢迎来到 Prompt Battle Arena!"}