import importlib

import pytest
from fastapi.testclient import TestClient

import main

# Held-out sentences, written separately from data.py (not copies of training rows).
HELD_OUT = [
    ("wifi di kantor lemot banget hari ini", "network"),
    ("VPN error 809 when connecting", "network"),
    ("touchpad laptop saya tidak berfungsi", "hardware"),
    ("printer shows a paper jam error", "hardware"),
    ("aplikasi Outlook crash terus setiap dibuka", "software"),
    ("installer for Docker Desktop fails at 90%", "software"),
    ("query ke tabel transaksi timeout", "database"),
    ("PostgreSQL connection refused on port 5432", "database"),
    ("tolong reset password akun saya", "inquiry"),
    ("need access to the shared drive for the design team", "inquiry"),
]


@pytest.fixture()
def client():
    return TestClient(main.app)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert set(r.json()["classes"]) == {"network", "hardware", "software", "database", "inquiry"}


def test_response_shape(client):
    r = client.post("/classify", json={"text": "laptop tidak mau menyala"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"category", "confidence"}
    assert 0.0 <= body["confidence"] <= 1.0


def test_validation(client):
    assert client.post("/classify", json={}).status_code == 422
    assert client.post("/classify", json={"text": "x"}).status_code == 422


def test_held_out_accuracy(client):
    correct = 0
    for text, expected in HELD_OUT:
        got = client.post("/classify", json={"text": text}).json()["category"]
        correct += got == expected
        print(f"{'OK ' if got == expected else 'BAD'} {expected:9s} <- {got:9s} | {text}")
    print(f"held-out accuracy: {correct}/{len(HELD_OUT)}")
    assert correct >= 7


def test_api_key_enforced(monkeypatch):
    monkeypatch.setenv("AITRIAGE_API_KEY", "secret")
    importlib.reload(main)
    c = TestClient(main.app)
    assert c.post("/classify", json={"text": "wifi mati"}).status_code == 401
    assert c.post("/classify", json={"text": "wifi mati"}, headers={"X-API-Key": "wrong"}).status_code == 401
    assert c.post("/classify", json={"text": "wifi mati"}, headers={"X-API-Key": "secret"}).status_code == 200
