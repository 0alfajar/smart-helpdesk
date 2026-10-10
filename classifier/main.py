"""Ticket classifier API used by the ServiceNow Smart Helpdesk demo.

POST /classify  {"text": "..."}  ->  {"category": "network", "confidence": 0.71}
GET  /health

If the AITRIAGE_API_KEY environment variable is set, requests must send it in
the X-API-Key header.
"""
import hmac
import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline

from data import TRAIN

API_KEY = os.getenv("AITRIAGE_API_KEY")

texts, labels = zip(*TRAIN)
model = make_pipeline(
    # character n-grams cope better with typos and mixed English/Indonesian text
    TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), lowercase=True),
    LogisticRegression(max_iter=1000, C=10),
)
model.fit(texts, labels)
CLASSES = list(model.steps[-1][1].classes_)

app = FastAPI(title="Ticket Classifier", version="1.0")


class Ticket(BaseModel):
    text: str = Field(..., min_length=3, max_length=5000)


@app.get("/health")
def health():
    return {"status": "ok", "classes": CLASSES}


@app.post("/classify")
def classify(ticket: Ticket, x_api_key: Optional[str] = Header(default=None)):
    if API_KEY and not hmac.compare_digest(x_api_key or "", API_KEY):
        raise HTTPException(status_code=401, detail="invalid api key")
    probs = model.predict_proba([ticket.text])[0]
    best = int(probs.argmax())
    return {"category": CLASSES[best], "confidence": round(float(probs[best]), 3)}
