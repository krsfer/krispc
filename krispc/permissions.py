"""
Custom permissions for the KrisPC API.

Provides granular permission controls for API endpoints.
"""
from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admins to edit objects.
    Read-only permissions are allowed for any request.
    """
    
    def has_permission(self, request, view):
        """
        Allow read operations for everyone, write operations only for admins.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            
        Returns:
            bool: True if permission is granted
        """
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to admins
        return request.user and request.user.is_staff


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if the user is the owner or an admin.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The object being accessed
            
        Returns:
            bool: True if permission is granted
        """
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Admins have full access
        if request.user and request.user.is_staff:
            return True
        
        # Check if object has an owner field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # Default to deny
        return False


class ContactCreatePermission(permissions.BasePermission):
    """
    Custom permission for Contact endpoint.
    - POST (create): Allow any
    - GET (list/retrieve): Admin only
    - PUT/PATCH/DELETE: Admin only
    """
    
    def has_permission(self, request, view):
        """
        Allow POST for anyone, other methods only for admins.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            
        Returns:
            bool: True if permission is granted
        """
        # Allow anyone to create contacts (POST)
        if request.method == 'POST':
            return True
        
        # All other operations require admin
        return request.user and request.user.is_staff
