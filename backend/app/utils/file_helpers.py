import os
import uuid

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "gif", "txt", "csv", "zip"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lstrip(".").lower()
    return ext in ALLOWED_EXTENSIONS


def unique_filename(original: str) -> str:
    ext = os.path.splitext(original)[1]
    return f"{uuid.uuid4().hex}{ext}"


def safe_join(directory: str, filename: str) -> str:
    abs_directory = os.path.abspath(directory)
    safe = os.path.abspath(os.path.join(abs_directory, filename))
    if not safe.startswith(abs_directory + os.sep):
        raise ValueError("Path traversal detected")
    return safe
