import json
import logging
import time
from pprint import pprint

import coloredlogs
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.urls import reverse
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

# if DEBUG:
#     LG.debug("This is a debug message")
#     LG.info("This is an info message")
#     LG.warning("This is a warning message")
#     LG.error("This is an error message")
#     LG.critical("This is a critical message")

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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        prods_data = lst_products.data()
        colophon_data = colophon.data()
        marques_data = marques.data()
        villes_data = lst_villes.data()

        # UI translations for Vue components
        locale = get_language()
        is_french = locale.startswith('fr')

        from django.utils import translation
        with translation.override(locale):
            privacy_url = reverse('krispc:privacy')
            terms_url = reverse('krispc:terms')

        ui_translations = {
            'nav': {
                'home': _('PTR_0160'),
                'about': 'À propos' if is_french else 'About',
                'services': _('PTR_0120'),
                'team': 'Technicien' if is_french else 'Technician',
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
                'about_title': 'À propos' if is_french else 'About',
                'team_title': 'Technicien & Gérant' if is_french else 'Technician & Manager',
                'contact_title': 'Contact',
            },
            'about': {
                'subtitle': _('PTR_0180'),
                'title': 'À propos de KrisPC' if is_french else 'About KrisPC',
                'description': 'Je suis un professionnel de l\'informatique expérimenté, dédié à fournir des services de réparation, de maintenance et de support informatique de haute qualité.' if is_french else 'I am an experienced IT professional dedicated to providing top-quality computer repair, maintenance, and support services.',
                'commitment': 'Mon engagement envers l\'excellence et la satisfaction client a fait de moi un partenaire de confiance pour les entreprises et les particuliers dans toute la région.' if is_french else 'My commitment to excellence and customer satisfaction has made me a trusted partner for businesses and individuals throughout the region.',
                'features': [
                    {'title': 'Rapidité' if is_french else 'Fast Turnaround', 'desc': 'Diagnostics et réparations rapides pour vous remettre en marche' if is_french else 'Quick diagnostics and repairs to get you back up and running'},
                    {'title': 'Suivi Après Intervention' if is_french else 'After-Service Support', 'desc': 'J\'assure mes réparations avec un suivi clair après intervention' if is_french else 'I stand behind my repairs with clear follow-up support'},
                    {'title': '15+ Ans d\'Expérience' if is_french else '15+ Years Experience', 'desc': '15+ ans d\'expérience pratique en programmation, réparation d\'ordinateurs et support informatique' if is_french else '15+ years of hands-on experience in programming, computer repair, and IT support'},
                ],
                'stats': [
                    {'value': '', 'label': '15+ Ans d\'Expérience' if is_french else '15+ Years Experience'},
                    {'value': '', 'label': 'Rejoignez Nos Clients Satisfaits' if is_french else 'Join Our Happy Clients'},
                    {'value': '', 'label': 'Expertise Qui Fait Ses Preuves' if is_french else 'Proven Expertise'},
                    {'value': '', 'label': 'Assistance Quand Vous en Avez Besoin' if is_french else 'Help When You Need It'},
                ],
            },
            'team': {
                'title': 'Technicien & Gérant' if is_french else 'Technician & Manager',
                'subtitle': 'Votre expert informatique dédié à votre service' if is_french else 'Your dedicated IT expert at your service',
                'members': [
                    {
                        'name': 'Christopher',
                        'role': 'Technicien & Gérant' if is_french else 'Technician & Manager',
                        'bio': '15+ ans d\'expérience pratique en programmation, réparation d\'ordinateurs et support informatique, avec des outils modernes, y compris l\'assistance IA, pour diagnostiquer les problèmes et apporter des solutions concrètes' if is_french else '15+ years of hands-on experience in programming, computer repair, and IT support, using modern tools, including AI assistance, to diagnose issues and deliver practical solutions',
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
                'team_title': 'Technicien' if is_french else 'Technician',
                'copyright': '© 2025 KrisPC. Tous droits réservés.' if is_french else '© 2025 KrisPC. All rights reserved.',
                'privacy': 'Politique de confidentialité' if is_french else 'Privacy Policy',
                'terms': 'Conditions générales d\'utilisation' if is_french else 'Terms of Service',
                'privacy_url': privacy_url,
                'terms_url': terms_url,
            }
        }

        context.update({
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
            "use_vue": True,
        })
        return context

    def render_to_response(self, context, **response_kwargs):
        return super().render_to_response(context, **response_kwargs)


class PrivacyView(IndexPageView):
    template_name = "privacy.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["use_vue"] = False
        return context


class TermsView(IndexPageView):
    template_name = "terms.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["use_vue"] = False
        return context


class DeveloperIndexView(TemplateView):
    """Landing page for developer resources."""
    template_name = "krispc/developers.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['api_docs_swagger'] = reverse('krispc_api:swagger-ui')
        context['api_docs_redoc'] = reverse('krispc_api:redoc')
        context['pricelist_json'] = reverse('krispc_api:api-pricelist')
        context['pricelist_text'] = reverse('krispc_api:api-pricelist') + "?output=text"
        context['services_text'] = reverse('krispc_api:api-services') + "?output=text"
        context['mcp_server_info'] = reverse('mcp-docs') # Reuse existing MCP docs view
        return context


class MCPDocsView(TemplateView):
    """MCP Server documentation page."""
    template_name = "mcp_docs.html"


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
        form.save()

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
