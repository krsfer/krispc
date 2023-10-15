# signup form
import logging
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import coloredlogs
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Submit
from django import forms
from django.core.mail import send_mail
from django.utils.translation import gettext_lazy as _

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
            'hx-post' : "create/",
            'hx-headers': '{"X-CSRFToken": "{{ csrf_token }}"}',
            'hx-target': "#merci",
            'class': 'contact_form'}
        self.helper.form_error_title = "errors"
        self.helper.form_show_errors = True

        self.helper.add_input(Submit("submit", _("Submit"), css_class="btn-success"))

    def send_email(self):
        # send email using the self.cleaned_data dictionary

        if DEBUG:
            LG.debug("Start send_email")

        SMTP_SERVER = "mail.gandi.net"
        SMTP_PORT = 587
        SMTP_USERNAME = "admin@krispc.fr"
        SMTP_PASSWORD = "krispc.238"
        SMTP_TO_ADDRESS = "admin@krispc.fr"

        sender_email = self.cleaned_data["from_email"]

        now = datetime.now()
        dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
        suj = f"Demande de devis. {self.cleaned_data['firstname']}. {dt_string}"

        firstname = self.cleaned_data['firstname']
        surname = self.cleaned_data['surname']
        msg = self.cleaned_data["message"]

        str_ua = "some user agent info"

        text = f'Prénom {firstname} Nom :{surname} Message : {msg}'
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
        message["To"] = SMTP_TO_ADDRESS

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, "html")

        message.attach(part1)
        message.attach(part2)

        status = "ok"

        if DEBUG:
            send_mail(
                'Subject here',
                text,
                'from@example.com',
                ['to@example.com'],
                False,
                html_message=html
            )
            return status

        else:

            try:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(sender_email, SMTP_TO_ADDRESS, message.as_string())
                server.quit()
            except smtplib.SMTPServerDisconnected:
                print('Failed to connect to the server. Wrong user/password?')
                status = "SMTPServerDisconnected"
            except smtplib.SMTPException as e:
                print('SMTP error occurred: ' + str(e))
                status = "SMTPException"

        if DEBUG:
            LG.debug("End send_email")

        return status


class LanguageForm(forms.Form):
    language = forms.ChoiceField(choices=settings.LANGUAGES)

# class LVForm(forms.Form):
#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         super(LVForm, self).__init__(*args, **kwargs)
#
#         self.helper = FormHelper()
#         self.helper.form_id = 'lv-form'
#
#         self.helper.form_method = 'post'
#         self.helper.form_action = '.'
#
#         self.helper.add_input(Submit("submit1", "Submit1"))
#         self.helper.add_input(Submit("submit2", "Submit2"))


# class Form1(forms.Form):
#     name = forms.CharField(max_length=100)
#     email = forms.EmailField()
#     message = forms.CharField(widget=forms.Textarea)
#
# class Form2(forms.Form):
#     subject = forms.CharField(max_length=100)
#     message = forms.CharField(widget=forms.Textarea)
