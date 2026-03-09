import os

# Production settings — secrets come from AWS Secrets Manager via env vars
# DATABASE_URL is set in __init__.py from the env var

# Cloudflare proxies HTTPS → HTTP to origin. Trust the forwarded proto header
# so Django knows the original request was HTTPS (required for CSRF, secure cookies).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CSRF_TRUSTED_ORIGINS = [
    "https://api.massbailfund.org",
    "https://3sbjv34ec0.execute-api.us-east-1.amazonaws.com",
]

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

ALLOWED_HOSTS = [
    "api.massbailfund.org",
    "3sbjv34ec0.execute-api.us-east-1.amazonaws.com",
]

CORS_ALLOWED_ORIGINS = [
    "http://app.massbailfund.org.s3-website-us-east-1.amazonaws.com",
]
