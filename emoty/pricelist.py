"""
Structured pricelist data for Emoty services.
"""
from django.utils.translation import gettext as _

def get_pricelist():
    """
    Returns a structured list of Emoty services with pricing information.
    Placeholder data for now.
    """
    return {
        "currency": "EUR",
        "currency_symbol": "€",
        "last_updated": "2026-02-01",
        "minimum_charge_policy": _("Abonnement mensuel ou annuel."),
        "minimum_charge_policy_en": "Monthly or annual subscription.",
        "services": [
            {
                "id": "emoty_pro",
                "name": _("Emoty Pro"),
                "name_en": "Emoty Pro",
                "category": "subscription",
                "pricing_type": "recurring",
                "hourly_rate": None,
                "fixed_prices": [
                    {"service": _("Mensuel"), "service_en": "Monthly", "price": 9.99},
                    {"service": _("Annuel"), "service_en": "Annual", "price": 99.99},
                ],
                "minimum_charge": 9.99,
                "notes": _("Accès complet à toutes les fonctionnalités.")
            },
            {
                "id": "emoty_team",
                "name": _("Emoty Team"),
                "name_en": "Emoty Team",
                "category": "subscription",
                "pricing_type": "recurring",
                "hourly_rate": None,
                "fixed_prices": [
                    {"service": _("Par utilisateur / mois"), "service_en": "Per user / month", "price": 19.99},
                ],
                "minimum_charge": 59.97,
                "notes": _("Minimum 3 utilisateurs.")
            }
        ]
    }

def format_pricelist_as_text(pricelist, language='fr'):
    """
    Format the pricelist as plain text.
    """
    is_french = language.startswith('fr')
    currency = pricelist['currency_symbol']
    
    lines = []
    
    # Header
    if is_french:
        lines.append("=" * 60)
        lines.append("EMOTY - TARIFS")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Devise: {pricelist['currency']} ({currency})")
        lines.append(f"Mise à jour: {pricelist['last_updated']}")
        lines.append(f"Note: {pricelist['minimum_charge_policy']}")
        lines.append("")
        lines.append("-" * 60)
    else:
        lines.append("=" * 60)
        lines.append("EMOTY - PRICE LIST")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Currency: {pricelist['currency']} ({currency})")
        lines.append(f"Last Updated: {pricelist['last_updated']}")
        lines.append(f"Note: {pricelist['minimum_charge_policy_en']}")
        lines.append("")
        lines.append("-" * 60)
    
    # Services
    for service in pricelist['services']:
        name = service['name'] if is_french else service['name_en']
        lines.append("")
        lines.append(f"▸ {name.upper()}")
        
        if service['fixed_prices']:
            for fp in service['fixed_prices']:
                svc_name = fp['service'] if is_french else fp['service_en']
                lines.append(f"  • {svc_name}: {fp['price']} {currency}")
        
        if service['notes']:
            note_label = "Note" if is_french else "Note"
            lines.append(f"  ({note_label}: {service['notes']})")
    
    lines.append("")
    lines.append("-" * 60)
    
    # Contact
    if is_french:
        lines.append("Contact: support@emoty.ai")
        lines.append("Site web: https://emo.krispc.fr")
    else:
        lines.append("Contact: support@emoty.ai")
        lines.append("Website: https://emo.krispc.fr")
    
    lines.append("=" * 60)
    
    return "\n".join(lines)
