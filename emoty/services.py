"""
Structured services data for Emoty.
"""
from django.utils.translation import gettext as _

def get_services():
    return [
        {
            "Prd_Name": "Emotion Analysis",
            "Prd_Desc": _("Analyse des émotions en temps réel à partir de la voix et du texte."),
            "Prd_More": _("Utilisant des modèles d'IA avancés pour détecter les nuances émotionnelles.")
        },
        {
            "Prd_Name": "Voice Journaling",
            "Prd_Desc": _("Journal vocal intelligent qui transcrit et analyse vos pensées."),
            "Prd_More": _("Capturez vos idées sans effort et retrouvez-les organisées.")
        },
        {
            "Prd_Name": "Mood Tracking",
            "Prd_Desc": _("Suivi de l'humeur au fil du temps avec des graphiques intuitifs."),
            "Prd_More": _("Comprenez vos tendances émotionnelles et améliorez votre bien-être.")
        }
    ]

def format_services_as_text(services, language='fr'):
    """
    Format the services list as plain text.
    """
    is_french = language.startswith('fr')
    
    lines = []
    
    # Header
    if is_french:
        lines.append("=" * 60)
        lines.append("EMOTY - SERVICES")
        lines.append("=" * 60)
    else:
        lines.append("=" * 60)
        lines.append("EMOTY - SERVICES")
        lines.append("=" * 60)
    
    lines.append("")
    
    for i, service in enumerate(services, 1):
        lines.append(f"{i}. {service['Prd_Name']}")
        lines.append(f"   {service['Prd_Desc']}")
        lines.append(f"   → {service['Prd_More']}")
        lines.append("")
    
    lines.append("-" * 60)
    
    if is_french:
        lines.append("Contact: support@emoty.ai | Site: https://emo.krispc.fr")
    else:
        lines.append("Contact: support@emoty.ai | Website: https://emo.krispc.fr")
    
    lines.append("=" * 60)
    
    return "\n".join(lines)
