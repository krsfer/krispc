import os

import ipaddress
import logging
import os
import time
from datetime import datetime
from pprint import pprint

import coloredlogs
from django.contrib.gis import geoip2
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.utils.translation import get_language
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView

# from django_user_agents.utils import get_user_agent

from _main import settings
from _main.settings import DEBUG
from krispc import colophon, forms, lst_products, lst_villes, marques
from krispc.forms import ContactForm

from django.contrib.gis import geoip2
from django.http import HttpResponse
from django.utils.translation import get_language
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView
from django_htmx.middleware import HtmxDetails

from _main import settings
from krispc import colophon, forms, lst_products, lst_villes, marques

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


def get_visitor_ip_address(request) -> str:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def _is_valid_ip(visitor_ip_address):
    try:
        ip = ipaddress.ip_address(visitor_ip_address)
        ip_valid = True
    except ValueError:
        ip_valid = False

    return ip_valid


@require_POST
def create_contact(request: HtmxHttpRequest) -> HttpResponse:
    LG.debug("#### create contact ####")
    form = ContactForm(request.POST or None)

    status = "ok"
    if form.is_valid():
        form.instance.author = request.user
        firstname = form.cleaned_data['firstname']
        surname = form.cleaned_data['surname']
        from_email = form.cleaned_data['from_email']
        message = form.cleaned_data['message']

        # user_agent = get_user_agent(request)
        accepts = request.headers['ACCEPT']
        now = datetime.now()
        dt_string = now.strftime("%A %d/%m/%Y %H:%M:%S %z")

        visitor_ip_address = get_visitor_ip_address(request)

        bool__is_valid_ip = _is_valid_ip(visitor_ip_address)

        str__is_valid_ip = str(bool__is_valid_ip)

        # create_description(accepts, dt_string, str__is_valid_ip, user_agent, visitor_ip_address)

        if DEBUG:
            # LG.warning(user_agent.browser)
            # LG.error(type(user_agent))

            # for key, value in user_agent.items():
            # name bobbyhadz
            # age 30
            # language Python
            #    print(key, value)

            LG.warning(accepts)

        # form.save()

        # print("########### sending email ###########")
        status = form.send_email()
        print("status: ", status)
        # print("########### email sent ###########")

    else:
        LG.warning("## form is not valid")
        form.instance.author = "unlawful request.user"
        LG.info("printing form.errors")
        pprint(form.errors)
        LG.info("printed form.errors")

    ow_secs = int(time.time())
    timestamp = time.strftime('%d %b %Hh%Mm%Ss', time.localtime(ow_secs))

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
