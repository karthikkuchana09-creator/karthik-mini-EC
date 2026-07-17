from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    entity_type: str
    config: dict = {}
    is_shared: bool = False


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    config: Optional[dict] = None
    is_shared: Optional[bool] = None


class ReportOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    entity_type: str
    config: dict | Any
    created_by: int
    is_shared: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportDataOut(BaseModel):
    report_id: int
    title: str
    entity_type: str
    columns: list[str]
    rows: list[dict]
    summary: Optional[dict] = None
    chart_data: Optional[Any] = None


class EntityReportDataOut(BaseModel):
    entity_type: str
    columns: list[str]
    rows: list[dict]
    summary: Optional[dict] = None
    page: int
    size: int
    total: int


class ReportList(BaseModel):
    items: list[ReportOut]
    total: int
    page: int
    size: int
    pages: int
