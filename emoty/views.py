from django.views.generic import TemplateView
from django.urls import reverse
from .pricelist import get_pricelist
from .services import get_services

class DeveloperIndexView(TemplateView):
    template_name = "emoty/developers.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['api_docs_swagger'] = reverse('emoty_api:swagger-ui')
        context['api_docs_redoc'] = reverse('emoty_api:redoc')
        context['pricelist_json'] = reverse('emoty_api:api-pricelist')
        context['pricelist_text'] = reverse('emoty_api:api-pricelist') + "?output=text"
        context['services_text'] = reverse('emoty_api:api-services') + "?output=text"
        context['mcp_server_info'] = reverse('emoty_api:api-mcp')
        return context
