from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from server import workbench

app = FastAPI(title="CMP workbench")


class InspectRequest(BaseModel):
    mnemonic: str = Field(max_length=4096)


class GenerateRequest(BaseModel):
    moves: int = Field(default=24, ge=1, le=256, strict=True)


@app.post("/api/inspect")
def inspect(request: InspectRequest):
    try:
        return workbench.inspect(request.mnemonic)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@app.post("/api/generate")
def generate(request: GenerateRequest):
    return workbench.generate(request.moves)


dist = Path(__file__).resolve().parent.parent / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="site")
