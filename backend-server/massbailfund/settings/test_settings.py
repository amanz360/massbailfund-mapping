# Test settings overrides
DEBUG = True

ALLOWED_HOSTS = ["*"]

DATABASES = {
    "default": {
        'ENGINE': 'django.db.backends.postgresql',
        "NAME": "test_massbailfund",
        "USER": "massbailfund",
        "PASSWORD": "massbailfund",
        "HOST": "localhost",
        "PORT": "5432",
    },
}
