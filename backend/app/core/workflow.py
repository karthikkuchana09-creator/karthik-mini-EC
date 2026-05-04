# Allowed transitions
WORKFLOW = {
    "todo": ["in_progress"],
    "in_progress": ["review"],
    "review": ["done"],
    "done": []
}

def validate_transition(current, new):
    if new not in WORKFLOW.get(current, []):
        return False
    return True