# Test settings overrides
DEBUG = True

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
