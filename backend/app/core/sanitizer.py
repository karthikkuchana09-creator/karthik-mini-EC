import re
import unicodedata
from pydantic import AfterValidator
from typing_extensions import Annotated


HTML_TAG_RE = re.compile(r"<[^>]*>")
MULTI_SPACE_RE = re.compile(r"\s+")
INVALID_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
LEADING_DOT_RE = re.compile(r"^\.+")


def strip_html(text: str) -> str:
    return HTML_TAG_RE.sub("", text)


def sanitize_text(text: str, max_length: int = 5000, strip_html_tags: bool = True) -> str:
    if not text:
        return text
    cleaned = text.strip()
    if strip_html_tags:
        cleaned = strip_html(cleaned)
    cleaned = unicodedata.normalize("NFKC", cleaned)
    cleaned = MULTI_SPACE_RE.sub(" ", cleaned)
    cleaned = cleaned.strip()
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned


def sanitize_email(email: str) -> str:
    if not email:
        return email
    return email.strip().lower()


def sanitize_name(name: str) -> str:
    if not name:
        return name
    cleaned = strip_html(name)
    cleaned = MULTI_SPACE_RE.sub(" ", cleaned)
    return cleaned.strip()[:100]


def sanitize_filename(filename: str) -> str:
    if not filename:
        return filename
    name = INVALID_FILENAME_CHARS.sub("_", filename)
    name = LEADING_DOT_RE.sub("", name)
    name = MULTI_SPACE_RE.sub("_", name)
    name = name.strip("._ ")
    if not name:
        name = "unnamed"
    return name


def sanitize_prompt(prompt: str) -> str:
    if not prompt:
        return prompt
    cleaned = strip_html(prompt)
    cleaned = MULTI_SPACE_RE.sub(" ", cleaned)
    return cleaned.strip()[:5000]


class InputCleaner:
    @staticmethod
    def clean_string(value: str, max_length: int = 5000) -> str:
        return sanitize_text(value, max_length=max_length)

    @staticmethod
    def clean_dict(data: dict, text_fields: list[str] | None = None, max_length: int = 5000) -> dict:
        cleaned = {}
        for key, value in data.items():
            if isinstance(value, str):
                if text_fields is None or key in text_fields:
                    cleaned[key] = sanitize_text(value, max_length=max_length)
                else:
                    cleaned[key] = value.strip() if value else value
            else:
                cleaned[key] = value
        return cleaned


def _sanitize_pydantic(v: str) -> str:
    return sanitize_text(v, max_length=5000)


SanitizedStr = Annotated[str, AfterValidator(_sanitize_pydantic)]
