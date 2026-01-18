# signup form
import logging
import os
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pprint import pprint
from zoneinfo import ZoneInfo

import coloredlogs
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Submit
from django import forms
from django.conf import settings
from django.core.mail import send_mail
from django.utils.translation import gettext_lazy as _

from sendgrid import SendGridAPIClient
from sendgrid import Mail

from _main import settings
from _main.settings import DEBUG, SENDGRID_API_KEY
from krispc.models import Contact

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


from krispc.services import send_contact_email

class ContactForm(forms.ModelForm):
    # ... (init and Meta remain unchanged)
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        super(ContactForm, self).__init__(*args, **kwargs)

        if DEBUG:
            self.fields["firstname"].initial = "Just"
            self.fields["surname"].initial = "Tester"
            self.fields["from_email"].initial = "hello@krispc.fr"
            self.fields["message"].initial = "Some message"

        self.fields["firstname"].required = True
        self.fields["surname"].required = False
        self.fields["from_email"].required = True
        self.fields["message"].required = True

        for field in self.fields:
            self.fields[field].error_messages = custom_errors

        self.helper = None
        self.exec_helpers()

    class Meta:
        model = Contact
        fields = ["firstname", "surname", "from_email", "message"]
        labels = {
            "firstname":  _("PTR_0810"),
            "surname":    _("PTR_0820"),
            "from_email": _("PTR_0830"),
            "message":    _("PTR_0840"),
        }

        widgets = {
            "firstname":  forms.TextInput(
                attrs={
                    "class": "form-control",
                    # 'placeholder': "Your first name"
                }
            ),
            "surname":    forms.TextInput(
                attrs={
                    "class": "form-control",
                    # 'placeholder': "Your surname"
                }
            ),
            "from_email": forms.TextInput(
                attrs={
                    "class": "form-control",
                    # 'placeholder': "Your email addresse"
                }
            ),
            "message":    forms.Textarea(
                attrs={
                    "class": "form-control",
                    # 'placeholder': "Your message"
                }
            ),
        }


    def exec_helpers(self):
        self.helper = FormHelper()

        self.helper.form_tag = False

        self.helper.form_id = 'contact-form-id'
        self.helper.form_tag = True
        self.helper.attrs = {
            'hx-post':      "create/",
            'hx-headers':   '{"X-CSRFToken": "{{ csrf_token }}"}',
            'hx-target':    "#merci",
            'class':        'contact_form'
        }
        self.helper.form_error_title = "errors"
        self.helper.form_show_errors = True

        self.helper.add_input(Submit("submit", _("Submit"), css_class="btn-success"))

    def send_email(self):
        firstname = self.cleaned_data['firstname']
        surname = self.cleaned_data['surname']
        msg = self.cleaned_data['message']
        client_email = self.cleaned_data["from_email"]

        return send_contact_email(firstname, surname, client_email, msg)


class LanguageForm(forms.Form):
    language = forms.ChoiceField(choices=settings.LANGUAGES)
