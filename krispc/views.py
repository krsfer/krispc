import logging
import time
from pprint import pprint

import coloredlogs
from crispy_forms.utils import render_crispy_form
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.utils.translation import get_language
from django.views.decorators.http import require_GET, require_POST
from django.views.generic import TemplateView
from django_htmx.middleware import HtmxDetails

from _main import settings
from _main.settings import DEBUG
from krispc import colophon, forms, lst_products, lst_villes, marques
from krispc.forms import ContactForm

# from django_user_agents.utils import get_user_agent

LG = logging.getLogger(__name__)

if DEBUG:
    coloredlogs.DEFAULT_DATE_FORMAT = "%H:%M:%S"

if DEBUG:
    coloredlogs.install(
        level="DEBUG",
        logger=LG,
        fmt=f"%(asctime)s:%(name)-{len(__name__)}s:%(funcName)s:%(lineno)3d:%(levelname)-7s: %(message)s",
    )

if DEBUG:
    LG.setLevel(logging.DEBUG)

if DEBUG:
    LG.debug("This is a debug message")
if DEBUG:
    LG.info("This is an info message")
if DEBUG:
    LG.warning("This is a warning message")
if DEBUG:
    LG.error("This is an error message")
if DEBUG:
    LG.critical("This is a critical message")

custom_errors = {
    'required': 'Ce champ est obligatoire'
}


# Typing pattern recommended by django-stubs:
# https://github.com/typeddjango/django-stubs#how-can-i-create-a-httprequest-thats-guaranteed-to-have-an-authenticated-user
class HtmxHttpRequest(HttpRequest):
    htmx: HtmxDetails


# Create your views here.
class IndexPageView(TemplateView):
    template_name = "_index.html"

    def render_to_response(self, context, **response_kwargs):
        # request.META.get('HTTP_REFERER')
        response = super(IndexPageView, self).render_to_response(
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

        # pprint(response.__dict__)

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


@require_POST
def create_contact(request: HtmxHttpRequest) -> HttpResponse:
    form = ContactForm(request.POST)

    status = 0
    if form.is_valid():
        form.instance.author = request.user

        if DEBUG:
            status = "some status"
        else:
            status = form.send_email()

    else:
        LG.warning("## form is not valid")
        form.instance.author = "unlawful request.user"
        LG.info("printing form.errors")
        pprint(form.errors)
        LG.info("printed form.errors")

    ow_secs = int(time.time())
    timestamp = time.strftime('%d %b %Hh%Mm%Ss', time.localtime(ow_secs))

    # ctx = {}
    # ctx.update(csrf(request))

    return render(
        request,
        "____contact_form_checker.html", {
            "form":      form,
            "firstname": f"{form.cleaned_data['firstname']}",
            "surname":   f"{form.cleaned_data['surname']}",
            "timestamp": timestamp, "status": status
        },
    )

#
# def get_geo_response(visitor_ip_address):
#     res = ''
#     city_db = 'GeoLite2-20200519/GeoLite2-City.mmdb'
#     country_db = 'GeoLite2-20200519/GeoLite2-Country.mmdb'
#     ASN_db = 'GeoLite2-20200519/GeoLite2-ASN.mmdb'
#
#     reader = geoip2.database.Reader(city_db)
#     response = reader.city(visitor_ip_address)
#     res = ('country.iso_code = ' + response.country.iso_code + os.linesep +
#            'country.name = ' + response.country.name + os.linesep +
#            'subdivisions.most_specific.name = ' + response.subdivisions.most_specific.name + os.linesep +
#            'subdivisions.most_specific.iso_code = ' + response.subdivisions.most_specific.iso_code + os.linesep +
#            'city.name = ' + response.city.name + os.linesep +
#            'postal.code = ' + response.postal.code + os.linesep +
#            'location.latitude = ' + str(response.location.latitude) + os.linesep +
#            'location.longitude = ' + str(response.location.longitude) + os.linesep)
#
#     try:
#         # print"using city db")
#         reader = geoip2.database.Reader(city_db)
#         response = reader.city(visitor_ip_address)
#     except (ValueError, TypeError, AttributeError):
#         try:
#             # printe)
#             # print"using country db")
#             reader = geoip2.database.Reader(country_db)
#             response = reader.country(visitor_ip_address)
#         except (ValueError, TypeError, AttributeError):
#             try:
#                 # printe)
#                 # print"using asn db")
#                 reader = geoip2.database.Reader(ASN_db)
#                 response = reader.asn(visitor_ip_address)
#                 res = str(response)
#             except (ValueError, TypeError, AttributeError):
#                 res = 'all failed'
#             finally:
#                 reader.close()
#         finally:
#             reader.close()
#     finally:
#         reader.close()
#
#     return res
#
#
# def create_description(accepts, dt_string, str__is_valid_ip, user_agent, visitor_ip_address):
#     georesp = get_geo_response(visitor_ip_address)
#     description = (os.linesep +
#                    'Date time = ' + dt_string + os.linesep +
#                    'visitor_ip_address = ' + visitor_ip_address + os.linesep +
#                    '_is_valid_ip = ' + str__is_valid_ip + os.linesep +
#                    'geoinfo = ' + georesp + os.linesep +
#                    'accepts = ' + accepts + os.linesep +
#                    'user_agent = ' + str(user_agent) + os.linesep +
#                    'user_agent.browser = ' + str(user_agent.browser) + os.linesep +
#                    'user_agent.browser.family = ' + str(user_agent.browser.family) + os.linesep +
#                    'user_agent.browser.version = ' + str(user_agent.browser.version) + os.linesep +
#                    'user_agent.browser.version_string  = ' + str(user_agent.browser.version_string) + os.linesep +
#                    'user_agent.os = ' + str(user_agent.os) + os.linesep +
#                    'user_agent.os.family = ' + str(user_agent.os.family) + os.linesep +
#                    'user_agent.os.version = ' + str(user_agent.os.version) + os.linesep +
#                    'user_agent.os.version_string = ' + str(user_agent.os.version_string) + os.linesep +
#                    'user_agent.device = ' + str(user_agent.device) + os.linesep +
#                    'user_agent.device.family = ' + str(user_agent.device.family) + os.linesep +
#                    'user_agent.device.brand = ' + str(user_agent.device.brand) + os.linesep +
#                    'user_agent.device.model = ' + str(user_agent.device.model) + os.linesep +
#                    'is_bot = ' + str(user_agent.is_bot) + os.linesep +
#                    'is_email_client = ' + str(user_agent.is_email_client) + os.linesep +
#                    'is_mobile = ' + str(user_agent.is_mobile) + os.linesep +
#                    'is_pc = ' + str(user_agent.is_pc) + os.linesep +
#                    'is_tablet = ' + str(user_agent.is_tablet) + os.linesep +
#                    'is_touch_capable = ' + str(user_agent.is_touch_capable) + os.linesep +
#                    '-------------------------------------------------' + os.linesep)
