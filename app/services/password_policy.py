import re

def validate_password_complexity(pw: str) -> None:
    if len(pw) < 10:
        raise ValueError("Password must be at least 10 characters")

    if not re.search(r"[a-z]", pw):
        raise ValueError("Password must contain a lowercase letter")
    if not re.search(r"[A-Z]", pw):
        raise ValueError("Password must contain an uppercase letter")
    if not re.search(r"[0-9]", pw):
        raise ValueError("Password must contain a number")
    if not re.search(r"[^A-Za-z0-9]", pw):
        raise ValueError("Password must contain a symbol")
    if len(pw.encode("utf-8")) > 72:
        raise ValueError("Password must be 72 bytes or less")
