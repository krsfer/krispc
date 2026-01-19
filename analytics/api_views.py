from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import PageVisit, UserInteraction, ErrorEvent
from django.utils import timezone

class TrackVisitView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        
        # Get basic info
        user = request.user if (request.user and request.user.is_authenticated) else None
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
            
        ip = self.get_client_ip(request)
        
        visit = PageVisit.objects.create(
            user=user,
            session_key=session_key,
            url=data.get('url'),
            path=data.get('path'),
            method='GET', # Assumed for frontend tracking
            ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            referrer=data.get('referrer'),
            browser=data.get('browser'),
            os=data.get('os'),
            device_type=data.get('device_type'),
            network_type=data.get('network_type')
        )
        
        return Response({'visit_id': visit.id})

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UpdateVisitView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, visit_id):
        try:
            visit = PageVisit.objects.get(id=visit_id)
        except PageVisit.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        data = request.data
        
        # Update metrics if provided
        if 'ttfb' in data: visit.ttfb = data['ttfb']
        if 'lcp' in data: visit.lcp = data['lcp']
        if 'cls' in data: visit.cls = data['cls']
        if 'inp' in data: visit.inp = data['inp']
        if 'fcp' in data: visit.fcp = data['fcp']
        
        if 'scroll_depth' in data:
            # Keep max scroll depth
            visit.scroll_depth = max(visit.scroll_depth, data['scroll_depth'])
            
        if 'time_on_page' in data:
            visit.time_on_page = data['time_on_page']
            
        visit.save()
        
        # Prevent session save to avoid SessionInterrupted error on concurrent logout
        if hasattr(request, 'session'):
            request.session.modified = False
            
        return Response({'status': 'updated'})


class TrackInteractionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, visit_id):
        try:
            visit = PageVisit.objects.get(id=visit_id)
        except PageVisit.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        data = request.data
        
        UserInteraction.objects.create(
            visit=visit,
            interaction_type=data.get('type'),
            element_selector=data.get('selector'),
            metadata=data.get('metadata', {})
        )
        
        # Prevent session save
        if hasattr(request, 'session'):
            request.session.modified = False
        
        return Response({'status': 'recorded'})

class TrackErrorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        # Optional visit_id
        visit_id = data.get('visit_id')
        visit = None
        if visit_id:
            try:
                visit = PageVisit.objects.get(id=visit_id)
            except PageVisit.DoesNotExist:
                pass
        
        ErrorEvent.objects.create(
            visit=visit,
            url=data.get('url'),
            status_code=data.get('status_code', 0),
            error_message=data.get('message'),
            stack_trace=data.get('stack')
        )
        
        # Prevent session save
        if hasattr(request, 'session'):
            request.session.modified = False
            
        return Response({'status': 'error recorded'})
