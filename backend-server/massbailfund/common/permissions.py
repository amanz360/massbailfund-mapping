from rest_framework.permissions import IsAuthenticated


class BasePermission(IsAuthenticated):
    """Base permission class — extend for custom logic."""
    pass
