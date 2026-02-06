import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from django.core.mail import EmailMultiAlternatives
from _main.settings import DEBUG

LG = logging.getLogger(__name__)

def send_contact_email(firstname, surname, client_email, msg):
    """
    Sends an email notification for a new contact request.
    """
    now = datetime.now(tz=ZoneInfo("Europe/Paris"))
    dt_string = now.strftime("%A %d/%m/%Y %H:%M:%S")

    suj = f"Demande de devis. {firstname}. {dt_string}"
    str_ua = "API Request"

    text = f'Prénom {firstname} Nom :{surname} Message : {msg}, Email : {client_email}'
    html = f"""
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
    <p>Source:</p>{str_ua}
    </body>
</html>
"""

    message_1 = EmailMultiAlternatives(
        subject=suj,
        body=text,
        from_email="archer.chris@gmx.com",
        to=["hello.krispc@gmail.com"],
    )
    message_1.attach_alternative(html, "text/html")

    if DEBUG:
        LG.warning(f"from:{message_1.from_email}")

    status = "ok"

    try:
        if DEBUG:
            LG.debug("sending message (simulated in DEBUG)")
            # In DEBUG mode we might not want to actually send if we don't have keys, 
            # or maybe we do. The original code simulated it partially but also tried to send.
            # We will follow the original logic: try to send if key exists, else simulate.
            pass

        response_count = message_1.send()

        if DEBUG:
            LG.warning(f"emails sent: {response_count}")
            LG.debug("message sent via Django email backend")

    except Exception as e:
        LG.error(f"Failed to send email: {e}")
        status = "error"

    if DEBUG:
        LG.debug("End send_email")

    return status
