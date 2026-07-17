from pydantic import BaseModel
from typing import Optional


class SearchResultItem(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    entity_type: str
    url: str


class SearchResultGroup(BaseModel):
    entity_type: str
    count: int
    results: list[SearchResultItem]


class SearchResponse(BaseModel):
    query: str
    total: int
    groups: list[SearchResultGroup]
    page: int
    size: int


class EntitySearchResultItem(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    url: str


class EntitySearchResponse(BaseModel):
    query: str
    entity_type: str
    total: int
    results: list[EntitySearchResultItem]
    page: int
    size: int
