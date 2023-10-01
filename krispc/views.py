from pprint import pprint

from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView
from django.utils.translation import get_language

from _main import settings
from _main.settings import DEBUG


from krispc import colophon, forms, lst_products, lst_villes, marques


# Create your views here.
class IndexKPageView(TemplateView):
    template_name = "_index.html"


    def render_to_response(self, context, **response_kwargs):

        # request.META.get('HTTP_REFERER')
        response = super(IndexKPageView, self).render_to_response(
            {
                "redirect_to": "",
                "locale":      get_language(),
                "colophon":    colophon.data(),
                "marques":     marques.data(),
                "prods":       lst_products.data(),
                "form":        forms.ContactForm(),
                "villes":      lst_villes.data(),
                "VER":         settings.VER,
            },
            **response_kwargs,
        )

        pprint(response.__dict__)

        # return render(request, '_index.html', {"prods": products.data()})
        # response.set_cookie(settings.LANGUAGE_COOKIE_NAME, user_language)
        return response


@require_GET
def favicon(request) -> HttpResponse:
    return HttpResponse(
        (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            + '<text y=".9em" font-size="90">🦊</text>'
            + "</svg>"
        ),
        content_type="image/svg+xml",
    )
