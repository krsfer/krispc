from django.utils.translation import gettext as _

def get_services():
    return [
        {
            "name": "PDF Parsing",
            "description": _("Extrait les rendez-vous des plannings PDF (Auxiliadom, etc.)."),
            "description_en": "Extracts appointments from PDF schedules (Auxiliadom, etc.)."
        },
        {
            "name": "Google Calendar Sync",
            "description": _("Synchronise automatiquement les événements avec Google Calendar."),
            "description_en": "Automatically syncs events with Google Calendar."
        },
        {
            "name": "Pay Calculator",
            "description": _("Calcule la paie estimée basée sur les heures travaillées."),
            "description_en": "Calculates estimated pay based on hours worked."
        }
    ]

def format_services_as_text(services, language='fr'):
    is_french = language.startswith('fr')
    lines = ["PDF2CAL - SERVICES", "=" * 30, ""]
    for s in services:
        desc = s['description'] if is_french else s['description_en']
        lines.append(f"- {s['name']}: {desc}")
    return "\n".join(lines)
