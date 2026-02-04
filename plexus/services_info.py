from django.utils.translation import gettext as _

def get_services():
    return [
        {
            "name": "Capture",
            "description": _("Capturez des pensées via texte, voix ou API."),
            "description_en": "Capture thoughts via text, voice, or API."
        },
        {
            "name": "Processing",
            "description": _("Analyse automatique par IA pour extraire des actions et des liens."),
            "description_en": "Automatic AI analysis to extract actions and links."
        },
        {
            "name": "Search",
            "description": _("Recherche sémantique dans votre second cerveau."),
            "description_en": "Semantic search in your second brain."
        }
    ]

def format_services_as_text(services, language='fr'):
    is_french = language.startswith('fr')
    lines = ["PLEXUS - SERVICES", "=" * 30, ""]
    for s in services:
        desc = s['description'] if is_french else s['description_en']
        lines.append(f"- {s['name']}: {desc}")
    return "\n".join(lines)
