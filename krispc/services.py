import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from _main.settings import DEBUG, SENDGRID_API_KEY

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

    message_1 = Mail(
        from_email="archer.chris@gmx.com",
        to_emails='hello.krispc@gmail.com',
        subject=suj,
        plain_text_content=text,
        html_content=html
    )

    if DEBUG:
        LG.warning(f"from:{message_1.from_email.email}")

    status = "ok"

    try:
        if DEBUG:
            LG.debug("sending message (simulated in DEBUG)")
            # In DEBUG mode we might not want to actually send if we don't have keys, 
            # or maybe we do. The original code simulated it partially but also tried to send.
            # We will follow the original logic: try to send if key exists, else simulate.
            pass

        # send_mail replacement using SendGrid directly as per original code
        if SENDGRID_API_KEY:
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            response = sg.send(message_1)
            
            if DEBUG:
                LG.warning(f'response status: {response.status_code}')
                LG.debug("message sent via SendGrid")
        else:
            LG.warning("SENDGRID_API_KEY not set, skipping email send")

    except Exception as e:
        LG.error(f"Failed to send email: {e}")
        status = "error"

    if DEBUG:
        LG.debug("End send_email")

    return status
