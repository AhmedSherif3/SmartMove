from rest_framework import permissions

class IsSmartMoveAdmin(permissions.BasePermission):
    """STRICT LOCK: Only allows access to the ADMIN role."""
    message = "Access denied: Administrator privileges required."

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and
            request.user.role.upper() == 'ADMIN'
        )

class IsAnalystOrAbove(permissions.BasePermission):
    """TIERED LOCK: Allows access to DATA_ANALYST and ADMIN roles."""
    message = "Access denied: Data Analyst privileges required."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
            
        role = request.user.role.upper()
        return role in ['ADMIN', 'DATA_ANALYST']