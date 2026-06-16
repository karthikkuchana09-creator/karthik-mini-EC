# Phase 10B Backend Integration Report

## Verified Components

### 1. Models (SQLAlchemy 2.0)

| Model | File | Key Details |
|-------|------|-------------|
| `WorkspaceMessage` | `models/workspace_message.py` | `Mapped[]`, `mapped_column()`, `TenantMixin`, soft-delete via `deleted_at` |
| `ChannelMessage` | `models/channel_message.py` | Same pattern, includes `workspace_id` + `channel_id` |
| `TaskDocument` | `models/task_document.py` | `uploaded_by` nullable with `ON DELETE SET NULL`, `TenantMixin` |
| `ApprovalDocument` | `models/approval_document.py` | Same pattern as TaskDocument |
| `Task` (modified) | `models/task.py` | Added `workspace_id`, `channel_id`, `task_documents` relationship |
| `Approval` (modified) | `models/approval.py` | Added `workspace_id`, `channel_id`, `approval_documents` relationship |

**All models use**: `Mapped[]`, `mapped_column()`, `select()`, no `db.query()`.

### 2. Schemas (Pydantic v2)

| Schema Set | File | Schemas Created |
|------------|------|----------------|
| WorkspaceMessage | `schemas/workspace_message.py` | `WorkspaceMessageCreate`, `WorkspaceMessageUpdate`, `WorkspaceMessageResponse` |
| ChannelMessage | `schemas/channel_message.py` | `ChannelMessageCreate`, `ChannelMessageUpdate`, `ChannelMessageResponse` |
| WorkspaceTask | `schemas/workspace_task.py` | `WorkspaceTaskCreate`, `WorkspaceTaskAssign`, `WorkspaceTaskResponse`, `WorkspaceTaskListResponse` |
| ChannelTask | `schemas/channel_task.py` | `ChannelTaskCreate`, `ChannelTaskAssign`, `ChannelTaskResponse` |
| TaskDocument | `schemas/task_document.py` | `TaskDocumentUpload`, `TaskDocumentResponse` |
| ApprovalDocument | `schemas/approval_document.py` | `ApprovalDocumentUpload`, `ApprovalDocumentResponse` |

**DocumentType enum**: `REQUIREMENT`, `SPECIFICATION`, `REFERENCE`, `DELIVERABLE`, `OTHER`

**All response schemas use**: `model_config = {"from_attributes": True}`

### 3. Repository Layer

All repositories use `select()` + `paginate()` from `fastapi_pagination.ext.sqlalchemy`.

| Repository | Key Query |
|------------|-----------|
| `workspace_message_repository.py` | `select(WorkspaceMessage).where(workspace_id, deleted_at.is_(None)).order_by(created_at.desc())` |
| `channel_message_repository.py` | Same pattern with `channel_id` filter |
| `workspace_task_repository.py` | `select(Task).where(workspace_id, channel_id.is_(None)).options(selectinload)` |
| `channel_task_repository.py` | `select(Task).where(channel_id).options(selectinload)` |
| `task_document_repository.py` | `select(TaskDocument).where(task_id).options(selectinload)` |
| `approval_document_repository.py` | `select(ApprovalDocument).where(approval_id).options(selectinload)` |

### 4. Service Layer — Validation Matrix

| Service | Tenant Isolation | Membership | Role Checks | Audit | Notifications |
|---------|-----------------|------------|-------------|-------|---------------|
| `workspace_message_service.py` | `tenant_id` from user on create | `validate_workspace_member` for all ops; `validate_workspace_admin` for edit/delete by non-owner | Sender can edit/delete own; admin can edit/delete any | ✅ `log_action` with module_name `workspace_message` | ✅ `process_mentions` after create & update |
| `channel_message_service.py` | Same pattern | `validate_channel_member` for all ops; `validate_channel_moderator` for edit/delete by non-owner | Sender can edit/delete own; moderator can edit/delete any | ✅ `log_action` with module_name `channel_message` | ✅ `process_mentions` after create & update |
| `workspace_task_service.py` | `tenant_id` inherited via Task model | `validate_workspace_task_assignment` for create/assign; `validate_workspace_member` for list/get | Admin/Moderator/Manager can assign; member can list/get | ✅ `log_action` with module_name `workspace_task` | ✅ `notify_task_assigned` on create & assign |
| `channel_task_service.py` | Same pattern | `validate_channel_task_assignment` for create/assign; `validate_channel_member` for list/get | Admin/Moderator/Manager can assign; member can list/get | ✅ `log_action` with module_name `channel_task` | ✅ `notify_task_assigned` on create & assign |
| `task_document_service.py` | N/A (task-scoped) | `_can_manage_documents` checks role, creator, assignee | Creator/Assignee/Manager can CRUD | ✅ `log_action` with module_name `task_document` | ✅ `notify_task_document_uploaded` to creator + assignee |
| `approval_document_service.py` | N/A (approval-scoped) | `_can_manage_documents` checks role, requester | Requester/Manager/Admin can CRUD | ✅ `log_action` with module_name `approval_document` | ✅ `notify_approval_document_uploaded` to requester |

### 5. Notification Helper (`phase10_notification_helper.py`)

```python
notify_task_assigned(db, user_id, task_id, task_title)         # checks task_notifications pref
notify_task_document_uploaded(db, user_id, doc_id, filename, task_id)  # checks document_notifications pref
notify_approval_document_uploaded(db, user_id, doc_id, filename, approval_id)  # checks document_notifications pref
notify_mention(db, mentioned_user_id, mentioned_by_name, context_label)  # checks in_app pref
process_mentions(db, content, sender, context_label)            # parses @username via regex
```

All notification functions respect `NotificationPreference` via `_user_wants()`:
- `in_app_enabled` must be `True`
- Category-specific pref (`task_notifications`, `document_notifications`) must be `True` (default)

### 6. Audit Logging

Every mutation calls `log_action()` with:
- `module_name`: `workspace_message`, `channel_message`, `workspace_task`, `channel_task`, `task_document`, `approval_document`
- `action_type`: `create`, `update`, `delete`, `assign`, `upload`
- `record_id`: the affected record's ID
- `old_data` / `new_data`: context-specific state snapshots
- `ip_address` / `user_agent`: extracted from `request.client.host` and `user-agent` header

### 7. Pagination

All list endpoints return `Page[ResponseSchema]`:
- `fastapi_pagination.ext.sqlalchemy.paginate()` used in all repositories
- `add_pagination(app)` registered in `main.py`
- Swagger docs show pagination query parameters (`page`, `size`) automatically

### 8. Router Registration (main.py)

All 8 routers imported and registered:
```python
from app.routes import (
    workspace_messages,
    channel_messages,
    workspace_tasks,
    channel_tasks,
    task_documents_route as task_documents,
    approval_documents_route as approval_documents,
)
app.include_router(workspace_messages.router)
app.include_router(channel_messages.router)
app.include_router(workspace_tasks.router)
app.include_router(channel_tasks.router)
app.include_router(task_documents.router)
app.include_router(approval_documents.router)
```

### 9. Endpoint Summary

| Method | Path | Handler | Service Function |
|--------|------|---------|-----------------|
| POST | `/workspaces/{workspace_id}/messages` | `create_workspace_message` | `create_message` |
| GET | `/workspaces/{workspace_id}/messages` | `list_workspace_messages` | `list_messages` |
| PUT | `/workspace-messages/{message_id}` | `update_workspace_message` | `update_message` |
| DELETE | `/workspace-messages/{message_id}` | `delete_workspace_message` | `delete_message` |
| POST | `/channels/{channel_id}/messages` | `create_channel_message` | `create_message` |
| GET | `/channels/{channel_id}/messages` | `list_channel_messages` | `list_messages` |
| PUT | `/channel-messages/{message_id}` | `update_channel_message` | `update_message` |
| DELETE | `/channel-messages/{message_id}` | `delete_channel_message` | `delete_message` |
| POST | `/workspaces/{workspace_id}/tasks` | `create_workspace_task_endpoint` | `create_workspace_task` |
| GET | `/workspaces/{workspace_id}/tasks` | `list_workspace_tasks_endpoint` | `list_workspace_tasks` |
| GET | `/workspaces/{workspace_id}/tasks/{task_id}` | `get_workspace_task_endpoint` | `get_workspace_task` |
| PATCH | `/workspaces/{workspace_id}/tasks/{task_id}/assign` | `assign_workspace_task_endpoint` | `assign_workspace_task` |
| POST | `/channels/{channel_id}/tasks` | `create_channel_task_endpoint` | `create_channel_task` |
| GET | `/channels/{channel_id}/tasks` | `list_channel_tasks_endpoint` | `list_channel_tasks` |
| GET | `/channels/{channel_id}/tasks/{task_id}` | `get_channel_task_endpoint` | `get_channel_task` |
| PATCH | `/channels/{channel_id}/tasks/{task_id}/assign` | `assign_channel_task_endpoint` | `assign_channel_task` |
| POST | `/tasks/{task_id}/documents` | `upload_task_document_endpoint` | `upload_task_document` |
| GET | `/tasks/{task_id}/documents` | `list_task_documents_endpoint` | `list_task_documents` |
| GET | `/task-documents/{document_id}/download` | `download_task_document_endpoint` | `download_task_document` |
| DELETE | `/task-documents/{document_id}` | `delete_task_document_endpoint` | `delete_task_document` |
| POST | `/approvals/{approval_id}/documents` | `upload_approval_document_endpoint` | `upload_approval_document` |
| GET | `/approvals/{approval_id}/documents` | `list_approval_documents_endpoint` | `list_approval_documents` |
| GET | `/approval-documents/{document_id}/download` | `download_approval_document_endpoint` | `download_approval_document` |
| DELETE | `/approval-documents/{document_id}` | `delete_approval_document_endpoint` | `delete_approval_document` |

### 10. Swagger Documentation Tags

| Tag | Routers |
|-----|---------|
| `Workspace Messages` | `workspace_messages.router` |
| `Channel Messages` | `channel_messages.router` |
| `Workspace Tasks` | `workspace_tasks.router` |
| `Channel Tasks` | `channel_tasks.router` |
| `Task Documents` | `task_documents_route.router` |
| `Approval Documents` | `approval_documents_route.router` |

### 11. Alembic Migration

**File**: `backend/alembic/versions/p6q7r8s9t0u1_add_workspace_channel_and_messages_tables.py`

**Upgrade**: Creates 4 new tables + ALTERs `tasks` and `approvals` with `workspace_id` and `channel_id` columns. All tables use `TenantMixin` pattern.

**Downgrade**: Drops `task_documents`, `approval_documents`, `channel_messages`, `workspace_messages` tables + DROPs `workspace_id`/`channel_id` columns from `tasks` and `approvals`.

### 12. SQLAlchemy 2.0 Compliance Audit

| Pattern | Used? | Location |
|---------|-------|----------|
| `Mapped[]` type annotations | ✅ | All models |
| `mapped_column()` | ✅ | All models |
| `select()` queries | ✅ | All repositories & services |
| `db.scalar()` for single row | ✅ | All services |
| `db.execute().scalars().all()` for multi row | ✅ | audit_log_service |
| `paginate()` from fastapi_pagination | ✅ | All repositories |
| `db.query()` | ❌ NOT USED | nowhere in Phase 10B |

### 13. Cross-Tenant Security

- **Middleware level**: `TenantMiddleware` in `core/tenant.py` applies `tenant_filter()` to all SQLAlchemy queries, ensuring cross-tenant data leakage is prevented globally.
- **Model level**: All new models inherit from `TenantMixin` with `tenant_id` FK to `tenants.id`. New records set `tenant_id` from the authenticated user.
- **Service level**: Membership validators (`validate_workspace_member`, `validate_channel_member`) ensure users can only interact with workspaces/channels they belong to.
- **Explicit helper**: `validate_tenant_access()` available for manual tenant checks if needed (currently not called from Phase 10B services — middleware handles it).

### 14. Known Issues / Caveats

1. **MySQL nullable constraint**: `task_documents.uploaded_by` and `approval_documents.uploaded_by` must be `nullable=True` because they use `ON DELETE SET NULL`. Verified in both model files.
2. **Alembic revision cycle**: The new migration `p6q7r8s9t0u1` manually sets `down_revision = 'abcdef123456'` to work around a pre-existing cycle in the revision graph.
3. **Channel moderator concept**: Derived from `channel.created_by == user.id` OR workspace `WORKSPACE_ADMIN` / `MODERATOR` role, since `ChannelMember` model has no role column.
4. **`uploaded_by` is Optional[int]**: Both document models use `nullable=True`. The `TaskDocumentResponse` and `ApprovalDocumentResponse` schemas still declare `uploaded_by: int` (not Optional). This works at runtime since the field is populated non-null during normal operation, but may fail if a document exists with `uploaded_by IS NULL` (e.g., if a user is deleted and SET NULL fires). Consider updating schemas to `uploaded_by: Optional[int]`.

---

## API Examples

### Workspace Messages

**Create a message**:
```bash
curl -X POST "http://localhost:8000/workspaces/1/messages" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello @john from workspace!", "message_type": "text"}'
```
Response `201`:
```json
{
  "id": 1,
  "tenant_id": 1,
  "workspace_id": 1,
  "sender_id": 5,
  "content": "Hello @john from workspace!",
  "message_type": "text",
  "edited_at": null,
  "deleted_at": null,
  "created_at": "2025-06-16T10:00:00",
  "updated_at": "2025-06-16T10:00:00"
}
```

**List messages**:
```bash
curl -X GET "http://localhost:8000/workspaces/1/messages?page=1&size=20" \
  -H "Authorization: Bearer <token>"
```
Response `200`:
```json
{
  "items": [...],
  "total": 5,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

**Edit a message**:
```bash
curl -X PUT "http://localhost:8000/workspace-messages/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content"}'
```

**Delete (soft) a message**:
```bash
curl -X DELETE "http://localhost:8000/workspace-messages/1" \
  -H "Authorization: Bearer <token>"
```
Response: `{"message": "Message deleted"}`

### Channel Messages

Same pattern as workspace messages, but scoped under channels:

```bash
curl -X POST "http://localhost:8000/channels/2/messages" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hey @jane, check this out!", "message_type": "text"}'
```

### Workspace Tasks

**Create a task**:
```bash
curl -X POST "http://localhost:8000/workspaces/1/tasks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design login page",
    "description": "Create Figma mockups",
    "priority": "high",
    "due_date": "2025-07-01T12:00:00",
    "assigned_to_id": 3
  }'
```
Response `201`:
```json
{
  "id": 42,
  "title": "Design login page",
  "description": "Create Figma mockups",
  "status": "todo",
  "priority": "high",
  "due_date": "2025-07-01T12:00:00",
  "sla_status": null,
  "sla_due_time": null,
  "is_sla_breached": false,
  "created_by_id": 5,
  "assigned_to_id": 3,
  "workspace_id": 1,
  "channel_id": null,
  "created_at": "2025-06-16T10:00:00",
  "updated_at": "2025-06-16T10:00:00"
}
```

**List workspace tasks**:
```bash
curl -X GET "http://localhost:8000/workspaces/1/tasks?page=1&size=20" \
  -H "Authorization: Bearer <token>"
```

**Get single task**:
```bash
curl -X GET "http://localhost:8000/workspaces/1/tasks/42" \
  -H "Authorization: Bearer <token>"
```

**Assign/reassign a task**:
```bash
curl -X PATCH "http://localhost:8000/workspaces/1/tasks/42/assign" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"assigned_to_id": 7}'
```

### Channel Tasks

Same pattern, scoped under channels:

```bash
curl -X POST "http://localhost:8000/channels/2/tasks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Sprint task", "assigned_to_id": 3}'
```

### Task Documents

**Upload a document**:
```bash
curl -X POST "http://localhost:8000/tasks/42/documents" \
  -H "Authorization: Bearer <token>" \
  -F "file=@requirements.pdf" \
  -F "document_type=REQUIREMENT"
```
Response `201`:
```json
{
  "id": 1,
  "tenant_id": 1,
  "task_id": 42,
  "file_name": "requirements.pdf",
  "file_size": 204800,
  "mime_type": "application/pdf",
  "uploaded_by": 5,
  "document_type": "REQUIREMENT",
  "created_at": "2025-06-16T10:00:00"
}
```

**List documents**:
```bash
curl -X GET "http://localhost:8000/tasks/42/documents" \
  -H "Authorization: Bearer <token>"
```

**Download a document**:
```bash
curl -X GET "http://localhost:8000/task-documents/1/download" \
  -H "Authorization: Bearer <token>" \
  --output requirements.pdf
```

**Delete a document**:
```bash
curl -X DELETE "http://localhost:8000/task-documents/1" \
  -H "Authorization: Bearer <token>"
```

### Approval Documents

Same pattern as task documents, but under approvals:

```bash
curl -X POST "http://localhost:8000/approvals/15/documents" \
  -H "Authorization: Bearer <token>" \
  -F "file=@signed_approval.pdf" \
  -F "document_type=DELIVERABLE"
```

---

## Testing Checklist

### Authentication & Authorization

- [ ] POST `/workspaces/{id}/messages` — returns 401 without token
- [ ] POST `/workspaces/{id}/messages` — returns 403 for non-workspace-member
- [ ] PUT `/workspace-messages/{id}` — returns 403 for non-owner non-admin
- [ ] DELETE `/workspace-messages/{id}` — returns 403 for non-owner non-admin
- [ ] POST `/channels/{id}/messages` — returns 403 for non-channel-member
- [ ] PUT `/channel-messages/{id}` — returns 403 for non-owner non-moderator
- [ ] DELETE `/channel-messages/{id}` — returns 403 for non-owner non-moderator
- [ ] POST `/workspaces/{id}/tasks` — returns 403 for member without assignment permission
- [ ] PATCH `/workspaces/{id}/tasks/{id}/assign` — returns 403 for member without permission
- [ ] POST `/channels/{id}/tasks` — returns 403 for member without permission
- [ ] POST `/tasks/{id}/documents` — returns 403 for non-creator/assignee/manager
- [ ] POST `/approvals/{id}/documents` — returns 403 for non-requester/manager/admin
- [ ] GET `/task-documents/{id}/download` — returns 403 for unauthorized user
- [ ] GET `/approval-documents/{id}/download` — returns 403 for unauthorized user
- [ ] DELETE `/task-documents/{id}` — returns 403 for unauthorized user
- [ ] DELETE `/approval-documents/{id}` — returns 403 for unauthorized user

### CRUD Functionality

- [ ] Create workspace message — returns 201 with correct data
- [ ] List workspace messages — returns paginated results, excludes soft-deleted
- [ ] Update workspace message — `edited_at` is set, content changes reflected
- [ ] Soft-delete workspace message — `deleted_at` set, excluded from list
- [ ] Edit/delete soft-deleted message — returns 400 "already deleted"
- [ ] Create channel message — returns 201 with correct data
- [ ] List channel messages — paginated, excludes soft-deleted
- [ ] Update channel message — `edited_at` set
- [ ] Soft-delete channel message — `deleted_at` set
- [ ] Create workspace task — returns 201, `channel_id` is null
- [ ] List workspace tasks — only returns tasks where `channel_id IS NULL`
- [ ] Get workspace task — returns single task
- [ ] Assign workspace task — changes `assigned_to_id`, logs audit
- [ ] Create channel task — `workspace_id` derived from channel
- [ ] List channel tasks — only returns tasks for that channel
- [ ] Get channel task — returns single task
- [ ] Assign channel task — changes `assigned_to_id`
- [ ] Upload task document — file saved to disk, record created
- [ ] List task documents — paginated
- [ ] Download task document — `FileResponse` with correct media type
- [ ] Delete task document — file removed from disk + record deleted
- [ ] Upload approval document — file saved, record created
- [ ] List approval documents — paginated
- [ ] Download approval document — `FileResponse`
- [ ] Delete approval document — file + record removed

### Validation

- [ ] Empty message content — validator rejects
- [ ] Invalid message_type — Pydantic Literal validation rejects
- [ ] Missing `assigned_to_id` — fails validation (required field)
- [ ] Invalid `document_type` — Pydantic Literal rejects (must be one of: REQUIREMENT, SPECIFICATION, REFERENCE, DELIVERABLE, OTHER)
- [ ] File too large — 400 error with max size message
- [ ] Invalid file type — rejected by `validate_uploaded_file`
- [ ] Future `due_date` validation — rejects past dates
- [ ] Content sanitization — XSS attempts sanitized by `sanitize_text`

### Audit Logging

- [ ] Create message → audit log with `module_name=workspace_message`, `action_type=create`
- [ ] Update message → audit log with `module_name=workspace_message`, `action_type=update`, `old_value` and `new_value`
- [ ] Delete message → audit log with `action_type=delete`, `old_value` contains content
- [ ] Create task → audit log with `module_name=workspace_task` or `channel_task`, `action_type=create`
- [ ] Assign task → audit log with `action_type=assign`, `old_value={"assigned_to_id": ...}` and `new_value`
- [ ] Upload document → audit log with `action_type=upload`, `new_value` has file metadata
- [ ] Delete document → audit log with `action_type=delete`, `old_value` has file metadata
- [ ] Verify `ip_address` and `user_agent` are populated in audit logs

### Notifications

- [ ] Create workspace task with `assigned_to_id` → notification sent to assignee
- [ ] Assign workspace task → notification sent to new assignee
- [ ] Create channel task with `assigned_to_id` → notification sent
- [ ] Assign channel task → notification sent
- [ ] Upload task document → notification sent to task creator (if not uploader)
- [ ] Upload task document → notification sent to assignee (if not uploader)
- [ ] Upload approval document → notification sent to requester (if not uploader)
- [ ] No notification sent to self (uploader = creator/assignee)
- [ ] Mention `@username` in workspace message → notification sent to mentioned user
- [ ] Mention `@username` in channel message → notification sent
- [ ] Mention self (`@self`) → no notification
- [ ] Disable `in_app_enabled` pref → no notifications sent
- [ ] Disable `task_notifications` pref → no task assignment notifications
- [ ] Disable `document_notifications` pref → no document upload notifications

### Pagination

- [ ] All GET list endpoints return `Page[...]` wrapper
- [ ] `page` and `size` query parameters accepted
- [ ] `total`, `pages` in response metadata

### Edge Cases

- [ ] Upload file with special characters in name — filename sanitized
- [ ] Concurrent uploads — `unique_filename` prevents collisions
- [ ] Download non-existent file — 404
- [ ] Delete non-existent document — 404
- [ ] Delete document whose file is missing from disk — still deletes DB record
- [ ] Message edit with only `message_type` change — content unchanged
- [ ] Update non-existent message — 404
- [ ] Create task with non-existent `assigned_to_id` — 404 (checked in assign only, create relies on validate_workspace_task_assignment which checks membership)

### Cross-Tenant Isolation

- [ ] User from Tenant A creates message in workspace of Tenant B — blocked (TenantMiddleware)
- [ ] User from Tenant A lists tasks of workspace in Tenant B — blocked
- [ ] User from Tenant A uploads document to task in Tenant B — blocked

---

## Production Readiness Notes

1. **Async file handling**: Document uploads read entire file into memory (`file.file.read()`). For production with large files, consider streaming to disk.
2. **File size validation**: Done after reading into memory. Could be optimized with `Content-Length` header check before reading.
3. **Error messages**: Do not leak internal details (stack traces, file paths). Exceptions are handled by `register_exception_handlers`.
4. **Rate limiting**: `RateLimitMiddleware` configured at 200 requests/60s window (configurable in `main.py`).
5. **CORS**: Restricted to `settings.FRONTEND_URL`.
6. **Tenant isolation**: `TenantMiddleware` applies tenant filter to all queries automatically.
7. **Audit trail**: Every mutation is logged with user identity, IP, user-agent, old/new values.
8. **Soft deletes**: Messages use soft-delete (`deleted_at`), documents use hard delete (file + DB record).
9. **Input sanitization**: All text inputs sanitized via `sanitize_text` / `sanitize_filename`.
10. **Notification preferences**: All notification types respect user preferences before dispatching.

---

## Alembic Migration Details

**Migration ID**: `p6q7r8s9t0u1`
**Down Revision**: `abcdef123456`

### Upgrade Steps:
1. CREATE TABLE `workspace_messages`
2. CREATE TABLE `channel_messages`
3. CREATE TABLE `task_documents`
4. CREATE TABLE `approval_documents`
5. ALTER TABLE `tasks` ADD COLUMN `workspace_id` (nullable, FK → `workspaces.id`, SET NULL)
6. ALTER TABLE `tasks` ADD COLUMN `channel_id` (nullable, FK → `channels.id`, SET NULL)
7. ALTER TABLE `approvals` ADD COLUMN `workspace_id` (nullable, FK → `workspaces.id`, SET NULL)
8. ALTER TABLE `approvals` ADD COLUMN `channel_id` (nullable, FK → `channels.id`, SET NULL)
9. Add indexes on all FK columns

### Indexes Created:
- `workspace_messages`: `ix_workspace_messages_workspace_id`, `ix_workspace_messages_sender_id`
- `channel_messages`: `ix_channel_messages_channel_id`, `ix_channel_messages_sender_id`
- `task_documents`: `ix_task_documents_task_id`, `ix_task_documents_uploaded_by`
- `approval_documents`: `ix_approval_documents_approval_id`, `ix_approval_documents_uploaded_by`
- `tasks`: `ix_tasks_workspace_id`, `ix_tasks_channel_id`
- `approvals`: `ix_approvals_workspace_id`, `ix_approvals_channel_id`

### Downgrade Steps:
1. DROP TABLE `approval_documents`
2. DROP TABLE `task_documents`
3. DROP TABLE `channel_messages`
4. DROP TABLE `workspace_messages`
5. ALTER TABLE `approvals` DROP COLUMN `workspace_id`, `channel_id`
6. ALTER TABLE `tasks` DROP COLUMN `workspace_id`, `channel_id`
