import json
import os
import socketio
import time

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# #region agent log
def _agent_log(location: str, message: str, data: dict, hypothesis_id: str, run_id: str = "pre-fix") -> None:
    payload = {
        "sessionId": "e61c2c",
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
        "hypothesisId": hypothesis_id,
        "runId": run_id,
    }
    for log_path in (
        os.environ.get("DEBUG_SESSION_LOG", "debug-e61c2c.log"),
        "/app/debug-e61c2c.log",
    ):
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\n")
            break
        except Exception:
            continue
# #endregion

try:
    import redis
    r = redis.from_url(REDIS_URL, socket_timeout=1.0)
    r.ping()
    mgr = socketio.AsyncRedisManager(REDIS_URL)
    print("Redis connected successfully for Socket.io.")
except Exception:
    print("Redis not available. Using local in-memory manager for Socket.io.")
    mgr = None

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    client_manager=mgr,
)

class _SocketIOLoggingASGI:
    def __init__(self, inner_app):
        self._base_socket_app = inner_app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if scope.get("type") in ("http", "websocket") and path.startswith("/socket.io"):
            query = scope.get("query_string", b"").decode("utf-8", errors="replace")
            has_sid = "sid=" in query
            # #region agent log
            _agent_log(
                "relay.py:asgi",
                "socket.io request",
                {"pid": os.getpid(), "path": path, "query": query, "hasSid": has_sid},
                "A",
            )
            # #endregion
        await self._base_socket_app(scope, receive, send)


def wrap_socket_app(inner_app):
    return _SocketIOLoggingASGI(inner_app)

@sio.event
async def connect(sid, environ):
    # #region agent log
    _agent_log(
        "relay.py:connect",
        "client connected",
        {"pid": os.getpid(), "sid": sid},
        "A",
    )
    # #endregion
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def subscribe(sid, data):
    investigation_id = data.get('investigation_id')
    if investigation_id:
        await sio.enter_room(
            sid,
            f"investigation:{investigation_id}"
        )
        print(
            f"Client {sid} subscribed to investigation:{investigation_id}"
        )

@sio.event
async def unsubscribe(sid, data):
    investigation_id = data.get('investigation_id')
    if investigation_id:
        await sio.leave_room(
            sid,
            f"investigation:{investigation_id}"
        )