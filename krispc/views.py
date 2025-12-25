import json
import logging
import time
from pprint import pprint

import coloredlogs
from crispy_forms.utils import render_crispy_form
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.utils.translation import get_language, gettext as _
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
        prods_data = lst_products.data()
        colophon_data = colophon.data()
        marques_data = marques.data()
        villes_data = lst_villes.data()

        # UI translations for Vue components
        locale = get_language()
        is_french = locale.startswith('fr')

        ui_translations = {
            'nav': {
                'home': _('PTR_0160'),
                'about': _('PTR_0190'),
                'services': _('PTR_0120'),
                'team': _('PTR_0800'),
                'contact': 'Contact',
            },
            'hero': {
                'title': _('PTR_0120'),
                'subtitle': _('PTR_0040'),
                'note1': _('PTR_2055'),
                'note2': _('PTR_2057'),
            },
            'sections': {
                'services_title': _('PTR_0120'),
                'about_title': _('PTR_0190'),
                'team_title': _('PTR_0800'),
                'contact_title': 'Contact',
            },
            'about': {
                'subtitle': _('PTR_0180'),
                'title': 'À propos de KrisPC' if is_french else 'About KrisPC',
                'description': 'Nous sommes une équipe de professionnels de l\'informatique expérimentés, dédiés à fournir des services de réparation, de maintenance et de support informatique de haute qualité.' if is_french else 'We are a team of experienced IT professionals dedicated to providing top-quality computer repair, maintenance, and support services.',
                'commitment': 'Notre engagement envers l\'excellence et la satisfaction client a fait de nous un partenaire de confiance pour les entreprises et les particuliers dans toute la région.' if is_french else 'Our commitment to excellence and customer satisfaction has made us a trusted partner for businesses and individuals throughout the region.',
                'features': [
                    {'title': 'Rapidité' if is_french else 'Fast Turnaround', 'desc': 'Diagnostics et réparations rapides pour vous remettre en marche' if is_french else 'Quick diagnostics and repairs to get you back up and running'},
                    {'title': 'Qualité Garantie' if is_french else 'Quality Guaranteed', 'desc': 'Tous nos travaux sont couverts par des garanties complètes' if is_french else 'All our work is backed by comprehensive warranties'},
                    {'title': 'Équipe Experte' if is_french else 'Expert Team', 'desc': 'Techniciens certifiés avec des années d\'expérience pratique' if is_french else 'Certified technicians with years of hands-on experience'},
                ],
                'stats': [
                    {'value': '10+', 'label': 'Ans d\'Expérience' if is_french else 'Years Experience'},
                    {'value': '500+', 'label': 'Clients Satisfaits' if is_french else 'Happy Clients'},
                    {'value': '1000+', 'label': 'Réparations Effectuées' if is_french else 'Repairs Done'},
                    {'value': '24/7', 'label': 'Support' if is_french else 'Support'},
                ],
            },
            'team': {
                'title': _('PTR_0800'),
                'subtitle': _('PTR_0210'),
                'members': [
                    {
                        'name': 'John Doe',
                        'role': 'Technicien Principal' if is_french else 'Lead Technician',
                        'bio': 'Plus de 10 ans d\'expérience en réparation d\'ordinateurs et support informatique' if is_french else 'Over 10 years of experience in computer repair and IT support',
                        'social': {'LinkedIn': '#', 'Twitter': '#'}
                    },
                    {
                        'name': 'Jane Smith',
                        'role': 'Spécialiste Systèmes' if is_french else 'Systems Specialist',
                        'bio': 'Experte en administration réseau et cybersécurité' if is_french else 'Expert in network administration and cybersecurity',
                        'social': {'LinkedIn': '#', 'GitHub': '#'}
                    },
                    {
                        'name': 'Mike Johnson',
                        'role': 'Expert Matériel' if is_french else 'Hardware Expert',
                        'bio': 'Spécialisé dans les diagnostics matériels et mises à niveau' if is_french else 'Specializing in hardware diagnostics and upgrades',
                        'social': {'LinkedIn': '#', 'Twitter': '#'}
                    }
                ]
            },
            'contact': {
                'title': 'Contactez-nous' if is_french else 'Get In Touch',
                'subtitle': 'Vous avez une question ou besoin d\'assistance ? Envoyez-nous un message et nous vous répondrons dans les plus brefs délais' if is_french else 'Have a question or need assistance? Send us a message and we\'ll get back to you as soon as possible',
                'firstName': 'Prénom' if is_french else 'First Name',
                'lastName': 'Nom' if is_french else 'Last Name',
                'email': 'Email',
                'message': 'Message',
                'required': '*',
                'send': 'Envoyer le message' if is_french else 'Send Message',
                'sending': 'Envoi en cours...' if is_french else 'Sending...',
                'successMessage': 'Merci pour votre message ! Nous vous répondrons bientôt.' if is_french else 'Thank you for your message! We will get back to you soon.',
                'errorGeneral': 'Une erreur s\'est produite. Veuillez réessayer plus tard.' if is_french else 'An error occurred. Please try again later.',
                'errorSubmit': 'Une erreur s\'est produite. Veuillez réessayer.' if is_french else 'Something went wrong. Please try again.',
            },
            'footer': {
                'tagline': 'Services informatiques professionnels et réparation d\'ordinateurs' if is_french else 'Professional IT services and computer repair',
                'services_title': _('PTR_0120'),
                'contact_title': 'Contact',
                'team_title': _('PTR_0800'),
                'copyright': '© 2025 KrisPC. Tous droits réservés.' if is_french else '© 2025 KrisPC. All rights reserved.',
            }
        }

        response = super(IndexPageView, self).render_to_response(
            {
                "redirect_to": "",
                "locale":      get_language(),
                "colophon":    colophon_data,
                "marques":     marques_data,
                "prods":       prods_data,
                "form":        forms.ContactForm(),
                "villes":      villes_data,
                "VER":         settings.VER,
                # JSON-serialized versions for Vue
                "prods_json":    json.dumps(prods_data),
                "colophon_json": json.dumps(colophon_data),
                "marques_json":  json.dumps(marques_data),
                "villes_json":   json.dumps(villes_data),
                "ui_translations_json": json.dumps(ui_translations),
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

    # res = render_crispy_form(form, request)

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
