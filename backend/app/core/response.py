"""
Reusable API response formatters.

Provides a standard envelope for every API response so clients
always receive a consistent shape.

Usage:
    from app.core.response import success, created, error, paginated

    @router.get("/tasks/{id}")
    async def get_task(...):
        task = ...
        return success(task)

    @router.post("/tasks")
    async def create_task(...):
        task = ...
        return created(task, "Task created")
"""
from typing import Any, Optional

from fastapi import status
from fastapi.responses import JSONResponse


def success(data: Any = None, message: str = "Success") -> dict:
    """Standard 200 OK response."""
    return {"success": True, "message": message, "data": data}


def created(data: Any = None, message: str = "Created") -> JSONResponse:
    """Standard 201 Created response."""
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"success": True, "message": message, "data": data},
    )


def error(
    detail: str = "Error",
    error_code: Optional[str] = None,
    status_code: int = 400,
) -> JSONResponse:
    """Standard error response with optional error code."""
    content: dict[str, Any] = {"success": False, "detail": detail}
    if error_code:
        content["error_code"] = error_code
    return JSONResponse(status_code=status_code, content=content)


def paginated(
    items: list[Any],
    total: int,
    page: int,
    size: int,
    pages: int,
    message: str = "Success",
) -> dict:
    """Standard paginated response envelope."""
    return {
        "success": True,
        "message": message,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        },
    }


def accepted(message: str = "Accepted") -> JSONResponse:
    """Standard 202 Accepted response."""
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"success": True, "message": message},
    )


def no_content() -> JSONResponse:
    """Standard 204 No Content response."""
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)
