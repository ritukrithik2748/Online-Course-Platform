"""HTTP gateway for the course platform.

The gateway is the only service the browser talks to. It owns CORS, request IDs,
timeouts and error shaping, and forwards every /api/* call to the backend service.
"""
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8001").rstrip("/")
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("gateway")

HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
}
REQUEST_HEADERS_TO_SKIP = HOP_BY_HOP | {"host", "content-length", "origin", "accept-encoding"}
RESPONSE_HEADERS_TO_KEEP = {
    "content-type", "content-disposition", "cache-control", "etag", "last-modified",
    "www-authenticate",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.client = httpx.AsyncClient(
        base_url=BACKEND_URL,
        timeout=httpx.Timeout(REQUEST_TIMEOUT),
        follow_redirects=False,
    )
    logger.info("Gateway forwarding to %s", BACKEND_URL)
    yield
    await app.state.client.aclose()


app = FastAPI(title="Course Platform Gateway", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health(request: Request):
    try:
        upstream = await request.app.state.client.get("/api/health")
        backend = "ok" if upstream.status_code == 200 else "degraded"
        status = "ok" if upstream.status_code == 200 else "degraded"
    except httpx.HTTPError:
        backend, status = "unavailable", "degraded"
    return JSONResponse(
        status_code=200 if status == "ok" else 503,
        content={"status": status, "backend": backend, "gateway": "ok"},
    )


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def forward(path: str, request: Request) -> Response:
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    started = time.perf_counter()
    body = await request.body()
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in REQUEST_HEADERS_TO_SKIP
    }
    headers["x-request-id"] = request_id

    try:
        upstream = await request.app.state.client.request(
            method=request.method,
            url=f"/{path}",
            params=request.query_params,
            content=body or None,
            headers=headers,
        )
    except httpx.TimeoutException:
        logger.warning("%s %s timed out rid=%s", request.method, request.url.path, request_id)
        return JSONResponse(
            status_code=504,
            content={"detail": "The API took too long to respond", "request_id": request_id},
        )
    except httpx.RequestError as exc:
        logger.error("%s %s failed rid=%s: %s", request.method, request.url.path, request_id, exc)
        return JSONResponse(
            status_code=502,
            content={"detail": "The API is unavailable", "request_id": request_id},
        )

    duration_ms = round((time.perf_counter() - started) * 1000)
    logger.info(
        "%s %s -> %s in %sms rid=%s",
        request.method, request.url.path, upstream.status_code, duration_ms, request_id,
    )

    response_headers: dict[str, Any] = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() in RESPONSE_HEADERS_TO_KEEP
    }
    response_headers["x-request-id"] = request_id

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
