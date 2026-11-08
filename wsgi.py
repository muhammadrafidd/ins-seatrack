"""Production entry point used by Gunicorn on Railway."""

from app import app, ensure_data

ensure_data()
