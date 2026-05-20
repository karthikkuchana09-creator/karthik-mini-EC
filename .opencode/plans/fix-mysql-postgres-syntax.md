# Fix MySQL PostgreSQL-isms in AI Analyzers & Services

## Problem
6 remaining PostgreSQL syntax patterns crash the analytics dashboard with 500 errors.

## Changes

### 1. `backend/app/ai/analyzers.py`

#### Import (line 7)
Change:
```python
from sqlalchemy import func
```
To:
```python
from sqlalchemy import func, case, text
```

#### Fix 1: `_score_history` (line 388-389)
Change:
```python
func.extract("epoch", Task.updated_at - Task.created_at) / 86400
```
To:
```python
func.TIMESTAMPDIFF(text("SECOND"), Task.created_at, Task.updated_at) / 86400
```

#### Fix 2: `.nullslast()` (line 474)
Change:
```python
).order_by(Task.due_date.asc().nullslast()).all()
```
To:
```python
).order_by(
    case((Task.due_date.isnot(None), 0), else_=1),
    Task.due_date.asc()
).all()
```

#### Fix 3: `_speed_score` (line 616-617)
Same as Fix 1 — change `func.extract("epoch", Task.updated_at - Task.created_at) / 86400` to `func.TIMESTAMPDIFF(text("SECOND"), Task.created_at, Task.updated_at) / 86400`

#### Fix 4: `_batch_completion_days` (line 823)
Same as Fix 1.

#### Fix 5: `_batch_approval_stats` (line 884-885)
Change:
```python
func.extract("epoch", Approval.updated_at - Approval.created_at) / 3600
```
To:
```python
func.TIMESTAMPDIFF(text("SECOND"), Approval.created_at, Approval.updated_at) / 3600
```

### 2. `backend/app/ai/services.py`

#### Import (line 5)
Change:
```python
from sqlalchemy import func
```
To:
```python
from sqlalchemy import func, text
```

#### Fix 6: `get_team_intelligence` (line 573-574)
Same as Fix 5 — change `func.extract("epoch", Approval.updated_at - Approval.created_at) / 3600` to `func.TIMESTAMPDIFF(text("SECOND"), Approval.created_at, Approval.updated_at) / 3600`

## After Applying
Restart the backend in VSCode and refresh the analytics dashboard.
