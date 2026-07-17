from fastapi import APIRouter, Depends, Body, status
from sqlalchemy.orm import Session
from fastapi_pagination import Page

from app.schemas.platform.saved_search import SavedSearchCreate, SavedSearchOut
from app.routes.deps import get_db
from app.core.rbac import require_permission, Permissions
from app.services.platform.saved_search_service import (
    create_saved_search,
    get_saved_search,
    list_saved_searches,
    delete_saved_search,
)

router = APIRouter(prefix="/saved-searches", tags=["Saved Searches"])


@router.post(
    "",
    response_model=SavedSearchOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save a search",
    description="Persist the current search parameters (query, entity_types, filters) for later reuse. "
                "Saved searches are private to the creating user and isolated by tenant.",
)
def create_saved_search_endpoint(
    data: SavedSearchCreate = Body(..., description="Saved search payload with name and query JSON"),
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return create_saved_search(db, data, user, tenant_id=user.tenant_id)


@router.get(
    "",
    response_model=Page[SavedSearchOut],
    summary="List saved searches",
    description="Retrieve all saved searches for the current user. Results are tenant-isolated and user-scoped.",
)
def list_saved_searches_endpoint(
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return list_saved_searches(db, user, tenant_id=user.tenant_id)


@router.get(
    "/{search_id}",
    response_model=SavedSearchOut,
    summary="Get saved search",
    description="Retrieve a single saved search by ID. Only the owning user may access it.",
)
def get_saved_search_endpoint(
    search_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    return get_saved_search(db, search_id, user, tenant_id=user.tenant_id)


@router.delete(
    "/{search_id}",
    summary="Delete saved search",
    description="Delete a saved search. Only the owning user may delete it.",
    responses={
        204: {"description": "Deleted"},
        403: {"description": "Not owner"},
        404: {"description": "Not found"},
    },
)
def delete_saved_search_endpoint(
    search_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_permission(Permissions.search_global)),
):
    result = delete_saved_search(db, search_id, user, tenant_id=user.tenant_id)
    from fastapi import Response
    return Response(status_code=status.HTTP_204_NO_CONTENT)
