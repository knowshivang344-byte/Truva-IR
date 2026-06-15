"""Debug-session NDJSON logger (session 5eb48a)."""
import json
import os
import time
import traceback
from typing import Callable, Awaitable, Any

LOG_PATH = os.environ.get("DEBUG_LOG_PATH", "debug-5eb48a.log")
SESSION_ID = "5eb48a"


def _write_log(payload: dict) -> None:
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception:
        pass


def agent_log(
    location: str,
    message: str,
    data: dict,
    hypothesis_id: str,
    run_id: str = "pre-fix",
) -> None:
    payload = {
        "sessionId": SESSION_ID,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
        "hypothesisId": hypothesis_id,
        "runId": run_id,
    }
    _write_log(payload)


def node_log(
    event: str,
    node_name: str,
    investigation_id: str,
    *,
    exception: str | None = None,
    traceback_str: str | None = None,
    extra: dict | None = None,
) -> None:
    """Log LangGraph node lifecycle events to debug-5eb48a.log."""
    data: dict[str, Any] = {
        "investigation_id": investigation_id,
        "node_name": node_name,
        "event": event,
    }
    if exception is not None:
        data["exception"] = exception
    if traceback_str is not None:
        data["traceback"] = traceback_str
    if extra:
        data.update(extra)

    _write_log(
        {
            "sessionId": SESSION_ID,
            "message": event,
            "location": f"node:{node_name}",
            "data": data,
            "timestamp": int(time.time() * 1000),
            "hypothesisId": "NODE",
            "runId": "pipeline",
        }
    )


def with_node_logging(
    node_name: str,
    fn: Callable[[Any], Awaitable[dict]],
) -> Callable[[Any], Awaitable[dict]]:
    """Wrap an async LangGraph node with NODE_START/SUCCESS/ERROR logging."""

    async def wrapped(state) -> dict:
        investigation_id = state.get("investigation_id", "unknown")
        node_log("NODE_START", node_name, investigation_id)
        try:
            result = await fn(state)
            node_log("NODE_SUCCESS", node_name, investigation_id)
            return result
        except Exception as exc:
            node_log(
                "NODE_ERROR",
                node_name,
                investigation_id,
                exception=str(exc),
                traceback_str=traceback.format_exc(),
            )
            raise

    wrapped.__name__ = getattr(fn, "__name__", node_name)
    return wrapped
