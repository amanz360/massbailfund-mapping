from django.core.management.base import BaseCommand

from core.cache import invalidate_api_caches


class Command(BaseCommand):
    help = "Clear all cached API responses. Run at deploy boot, after migrations."

    def handle(self, *args, **options):
        invalidate_api_caches()
        self.stdout.write("API caches invalidated.")
