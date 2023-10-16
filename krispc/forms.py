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
from sendgrid import Mail, SendGridAPIClient

from _main import settings
from _main.settings import DEBUG
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


class ContactForm(forms.ModelForm):
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
            'X-CSRFToken':  '{"X-CSRFToken": "{{ csrf_token }}"}',
            'hx-post':      "create/",
            'hx-headers':   '{"X-CSRFToken": "{{ csrf_token }}"}',
            'hx-target':    "#merci",
            'class':        'contact_form'}
        self.helper.form_error_title = "errors"
        self.helper.form_show_errors = True

        self.helper.add_input(Submit("submit", _("Submit"), css_class="btn-success"))

    def send_email(self):

        sender_email = 'hello.krispc@gmail.com'  # self.cleaned_data["from_email"]

        now = datetime.now(tz=ZoneInfo("Europe/Paris"))
        dt_string = now.strftime("%A %d/%m/%Y %H:%M:%S")

        suj = f"Demande de devis. {self.cleaned_data['firstname']}. {dt_string}"

        firstname = self.cleaned_data['firstname']
        surname = self.cleaned_data['surname']
        msg = self.cleaned_data['message']
        client_email = self.cleaned_data["from_email"]

        str_ua = "some user agent info"

        text = f'Prénom {firstname} Nom :{surname} Message : {msg}, Email : {client_email}'
        html = html = f"""\
<html>
    <body>
    <table>
        <tr>
            <td>Prenom:</td>
            <td>{firstname}</td>
        </tr>
        <tr>
            <td>Nom:</td>
            <td>{surname}</td>
        </tr>
        <tr>
            <td>Email:</td>
            <td>{client_email}</td>
        </tr>
    </table>
    <p>Message:</p>{msg}
    <hr />
    <p>User agent:</p>{str_ua}
    </body>
</html>
"""

        message = MIMEMultipart("alternative")
        message["Subject"] = suj
        message["From"] = sender_email
        message["To"] = "hello.krispc@gmail.com"

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, "html")

        message.attach(part1)
        message.attach(part2)

        status = "ok"

        message_1 = Mail(

            from_email="archer.chris@gmx.com",
            to_emails='hello.krispc@gmail.com',
            subject=suj,
            plain_text_content=text,
            html_content=html)



        LG.warning(f"from:{message_1.from_email.email}")

        """
        def send_mail(subject: Any,
            message: Any,
            from_email: Any,
            recipient_list: Any,
            fail_silently: bool = False,
            auth_user: Any = None,
            auth_password: Any = None,
            connection: Any = None,
            html_message: Any = None) -> int
            
        from django.core.mail import send_mail
        send_mail(
            'Subject here',
            'Here is the message.',
            'from@example.com',
            ['to@example.com'],
            fail_silently=False
        )

        """

        try:
            LG.debug("sending message")

            response = send_mail(
                subject=suj,
                message=text,
                from_email='archer.chris@gmx.com',
                recipient_list=["hello.krispc@gmail.com"],
                fail_silently=False,
                # auth_user=sender_email,
                # auth_password=os.environ.get('GMAIL_PASS'),
                # connection=None,
                html_message=html
            )

            LG.warning(f'response:{response}')

            LG.debug("message sent")

        except Exception as e:
            LG.error(e)
            LG.error(message_1.from_email.email)

        if DEBUG:
            LG.debug("End send_email")

        return status


class LanguageForm(forms.Form):
    language = forms.ChoiceField(choices=settings.LANGUAGES)
