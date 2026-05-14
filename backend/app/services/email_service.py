import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from app.core.config import settings
from app.core.log import get_logger

logger = get_logger("email_service")

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"


def _read_template(name: str) -> str:
    path = TEMPLATES_DIR / name
    if not path.exists():
        logger.warning("Email template not found: %s", path)
        return ""
    return path.read_text(encoding="utf-8")


def send_reset_password_email(recipient_email: str, reset_url: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_PORT:
        logger.warning("SMTP not configured — skipping email to %s", recipient_email)
        logger.info("Password reset URL for %s: %s", recipient_email, reset_url)
        return False

    html_body = _read_template("reset_password.html")
    if not html_body:
        html_body = "<p>Click <a href='{{reset_url}}'>here</a> to reset your password.</p>"

    html_body = html_body.replace("{{reset_url}}", reset_url)
    html_body = html_body.replace("{{expiry_minutes}}", str(settings.RESET_TOKEN_EXPIRE_MINUTES))

    subject = "Password Reset Request"

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, recipient_email, msg.as_string())
        logger.info("Password reset email sent to %s", recipient_email)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", recipient_email, e)
        return False
