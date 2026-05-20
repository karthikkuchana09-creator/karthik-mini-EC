from app.main import app

for r in app.routes:
    path = getattr(r, "path", None)
    if path and "ws" in path:
        name = getattr(r, "name", None)
        endpoint = getattr(r, "endpoint", None)
        ep_name = endpoint.__name__ if endpoint else "N/A"
        methods = getattr(r, "methods", None)
        print(f"WS: path={path} name={name} endpoint={ep_name} methods={methods}")

print(f"\nTotal routes: {len(app.routes)}")
