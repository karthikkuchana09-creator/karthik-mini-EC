"""
Shared pagination utilities + reusable QueryBuilder.

Provides a consistent interface for paginated, filtered, sorted,
and searchable queries across all repository and service layers.

Usage:
    from app.core.pagination import QueryBuilder

    # Service layer
    query = select(SLARule).where(SLARule.is_active.is_(True))
    qb = QueryBuilder(db, SLARule, query)

    result = (
        qb
        .search(filters.q, [SLARule.module_name, SLARule.priority])
        .filter_exact(module_name=filters.module_name, priority=filters.priority, is_active=filters.is_active)
        .date_range(SLARule.created_at, filters.date_from, filters.date_to)
        .sort(filters.sort_by, filters.sort_order, ["module_name", "priority", "created_at"])
        .paginate(filters.page, filters.size)
    )
    # result is a fastapi_pagination Page[T] with items, total, page, size, pages
"""
from datetime import datetime
from typing import Any, Generic, Optional, TypeVar

from fastapi_pagination import Params, Page as PaginationPage
from fastapi_pagination.ext.sqlalchemy import paginate
from pydantic import BaseModel
from sqlalchemy import Select, or_, and_, desc as sa_desc, asc as sa_asc
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import ColumnElement

from app.db.base import Base

T = TypeVar("T")


class PageParams(BaseModel):
    """Standard pagination request parameters."""

    page: int = 1
    size: int = 20

    def to_fastapi_params(self) -> Params:
        return Params(page=self.page, size=self.size)


class PaginatedResult(BaseModel, Generic[T]):
    """Standard paginated response envelope."""

    items: list[T]
    total: int
    page: int
    size: int
    pages: int


def paginate_query(
    db: Session,
    query: Select,
    params: Optional[PageParams] = None,
) -> PaginatedResult:
    """
    Execute a paginated query and return a typed result.

    Args:
        db: SQLAlchemy session.
        query: A ``select()`` statement.
        params: Page number and size.

    Returns:
        PaginatedResult with items, total, page, size, pages.
    """
    if params is None:
        params = PageParams()

    page_result = paginate(db, query, params.to_fastapi_params())

    return PaginatedResult(
        items=page_result.items,
        total=page_result.total,
        page=page_result.page,
        size=page_result.size,
        pages=page_result.pages,
    )


def calculate_pages(total: int, size: int) -> int:
    """Calculate total pages given total records and page size."""
    if size <= 0:
        return 0
    return (total + size - 1) // size


# ── QueryBuilder ────────────────────────────────────────────────────

class QueryBuilder:
    """
    Reusable query builder for filtered, sorted, searchable, paginated
    SQLAlchemy queries.

    All mutation methods return ``self`` for method chaining.

    Typical usage in a service layer:

        query = select(MyModel)
        qb = QueryBuilder(db, MyModel, query)

        page: PaginationPage[MyModel] = (
            qb
            .search(filters.q, [MyModel.name, MyModel.email])
            .filter_exact(status=filters.status, is_active=filters.is_active)
            .date_range(MyModel.created_at, filters.date_from, filters.date_to)
            .sort(filters.sort_by, filters.sort_order, ["name", "created_at"])
            .paginate(filters.page, filters.size)
        )
        return page  # ← fastapi_pagination Page[T] with .items, .total, .page, .size, .pages
    """

    def __init__(self, db: Session, model: type[Base], query: Select):
        self.db = db
        self.model = model
        self.query = query

    # ── Search ────────────────────────────────────────────────────

    def search(self, term: Optional[str], columns: list[ColumnElement]) -> "QueryBuilder":
        """
        Apply a LIKE search across the given columns.

        Args:
            term: Search string (None/empty = no-op).
            columns: Model columns to search against.
        """
        if term:
            conditions = [col.ilike(f"%{term}%") for col in columns]
            self.query = self.query.where(or_(*conditions))
        return self

    # ── Exact filters ─────────────────────────────────────────────

    def filter_exact(self, **kwargs: Any) -> "QueryBuilder":
        """
        Apply exact-match WHERE clauses, skipping ``None`` values.

        Usage:
            .filter_exact(status="active", is_active=True, module_name=None)
            # → WHERE status = 'active' AND is_active = 1
        """
        conditions = []
        for key, value in kwargs.items():
            if value is not None:
                col = getattr(self.model, key, None)
                if col is not None:
                    conditions.append(col == value)
        if conditions:
            self.query = self.query.where(and_(*conditions))
        return self

    # ── Date-range filter ─────────────────────────────────────────

    def date_range(
        self,
        column: ColumnElement,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> "QueryBuilder":
        """
        Apply a date-range filter on a column.

        Args:
            column: Model column (e.g. ``MyModel.created_at``).
            date_from: Inclusive lower bound (None = no bound).
            date_to: Inclusive upper bound (None = no bound).
        """
        if date_from:
            self.query = self.query.where(column >= date_from)
        if date_to:
            self.query = self.query.where(column <= date_to)
        return self

    # ── Sorting ───────────────────────────────────────────────────

    def sort(
        self,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        allowed_columns: Optional[list[str]] = None,
    ) -> "QueryBuilder":
        """
        Apply an ORDER BY clause with column allow-listing.

        Args:
            sort_by: Column name to sort by.
            sort_order: ``"asc"`` or ``"desc"``.
            allowed_columns: List of column names permitted for sorting.
                             ``None`` = allow any column on the model.
        """
        if not sort_by:
            return self

        if allowed_columns is not None and sort_by not in allowed_columns:
            return self

        col = getattr(self.model, sort_by, None)
        if col is None:
            return self

        order_func = sa_asc if sort_order == "asc" else sa_desc
        self.query = self.query.order_by(order_func(col))

        return self

    # ── Execution ─────────────────────────────────────────────────

    def paginate(self, page: int = 1, size: int = 20) -> PaginationPage[T]:
        """
        Execute the query and return a fastapi_pagination Page.

        Returns:
            ``Page[T]`` with ``.items``, ``.total``, ``.page``, ``.size``, ``.pages``.
        """
        return paginate(self.db, self.query, Params(page=page, size=size))
