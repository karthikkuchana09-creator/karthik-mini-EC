from __future__ import annotations

import re
from dataclasses import dataclass, field
from math import ceil
from typing import Any, Generic, Optional, TypeVar, Sequence

from fastapi import Query
from pydantic import BaseModel
from sqlalchemy import Column, asc, desc
from sqlalchemy.orm import Query as SAQuery
from sqlalchemy.orm import Session

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


@dataclass
class PageParams:
    page: int = field(default=1)
    size: int = field(default=20)
    sort_by: Optional[str] = field(default=None)
    sort_order: str = field(default="desc")
    search: Optional[str] = field(default=None)


def paginate_query(
    db: Session,
    query: SAQuery,
    page: int = 1,
    size: int = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "desc",
    search: Optional[str] = None,
    search_columns: Optional[list[Column]] = None,
) -> dict:
    if search and search_columns:
        like_pattern = f"%{_escape_like(search)}%"
        filters = [c.ilike(like_pattern) for c in search_columns]
        query = query.filter(*filters)

    total = query.count()

    if sort_by:
        try:
            column = getattr(query.entity_zero.class_, sort_by)
            order_fn = desc if sort_order == "desc" else asc
            query = query.order_by(order_fn(column))
        except AttributeError:
            pass

    pages = max(ceil(total / size), 0) if total else 0
    items = query.offset((page - 1) * size).limit(size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


def paginate(
    items: Sequence,
    total: int,
    page: int = 1,
    size: int = 20,
) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": max(ceil(total / size), 0) if total else 0,
    }


def _escape_like(pattern: str) -> str:
    for ch in ("%", "_", "\\"):
        pattern = pattern.replace(ch, f"\\{ch}")
    return pattern
