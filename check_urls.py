import os
import django
from django.urls import reverse
from django.utils import translation

os.environ.setdefault('DJANGO_SETTINGS_MODULE', '_main.settings')
django.setup()

from django.conf import settings
print(f"LOCALE_PATHS: {settings.LOCALE_PATHS}")
print(f"LANGUAGE_CODE: {settings.LANGUAGE_CODE}")

from django.utils.translation import gettext as _
def check_url(lang):
    with translation.override(lang):
        url = reverse('privacy')
        trans = _("Privacy Policy")
        print(f"Language: {lang}, URL: {url}, Translation: {trans}")

check_url('en')
check_url('fr')
