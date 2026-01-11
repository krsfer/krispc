"""
Structured pricelist data for KrisPC services.

This module provides clean, structured pricing data separate from the 
marketing descriptions. Designed for API consumption, AI assistants,
and programmatic access.
"""
from django.utils.translation import gettext as _


def get_pricelist():
    """
    Returns a structured list of services with pricing information.
    
    Each service includes:
    - id: Unique service identifier
    - name: Service name (translated)
    - category: Service category
    - pricing_type: 'hourly', 'fixed', or 'variable'
    - hourly_rate: Rate per hour (if hourly)
    - fixed_prices: List of fixed-price items (if applicable)
    - minimum_charge: Minimum billable amount
    - currency: Currency code (EUR)
    - notes: Additional pricing notes
    """
    return {
        "currency": "EUR",
        "currency_symbol": "€",
        "last_updated": "2026-01-11",
        "minimum_charge_policy": _("Toute heure commencée est due."),
        "minimum_charge_policy_en": "Any started hour is billable.",
        "services": [
            {
                "id": "smartphones",
                "name": _("Réparation smartphones et tablettes"),
                "name_en": "Smartphone & Tablet Repair",
                "category": "mobile",
                "pricing_type": "hourly",
                "hourly_rate": 30,
                "fixed_prices": None,
                "minimum_charge": 30,
                "notes": _("Diagnostic gratuit en cas de dégât des eaux.")
            },
            {
                "id": "desktop_pc",
                "name": _("Maintenance PC fixes"),
                "name_en": "Desktop PC Maintenance",
                "category": "computer",
                "pricing_type": "fixed",
                "hourly_rate": None,
                "fixed_prices": [
                    {"service": _("Mise à jour PC"), "service_en": "PC tune-up", "price": 40},
                    {"service": _("Installation OS (Mac/Windows/Linux)"), "service_en": "OS Installation", "price": 50},
                    {"service": _("Nettoyage virus/logiciels espions"), "service_en": "Virus/spyware removal", "price": 50},
                ],
                "minimum_charge": 40,
                "notes": None
            },
            {
                "id": "laptop",
                "name": _("Entretien ordinateurs portables"),
                "name_en": "Laptop Maintenance",
                "category": "computer",
                "pricing_type": "hourly",
                "hourly_rate": 35,
                "fixed_prices": None,
                "minimum_charge": 35,
                "notes": _("Batterie, mémoire, disque dur, etc.")
            },
            {
                "id": "printer",
                "name": _("Support imprimantes"),
                "name_en": "Printer Support",
                "category": "peripheral",
                "pricing_type": "hourly",
                "hourly_rate": 30,
                "fixed_prices": None,
                "minimum_charge": 30,
                "notes": _("Jet d'encre, laser, thermique.")
            },
            {
                "id": "training",
                "name": _("Formation informatique"),
                "name_en": "IT Training",
                "category": "training",
                "pricing_type": "hourly",
                "hourly_rate": 40,
                "fixed_prices": None,
                "minimum_charge": 40,
                "notes": _("Formation personnalisée à domicile.")
            },
            {
                "id": "malware",
                "name": _("Sécurité et nettoyage logiciels malveillants"),
                "name_en": "Security & Malware Removal",
                "category": "security",
                "pricing_type": "fixed",
                "hourly_rate": None,
                "fixed_prices": [
                    {"service": _("Nettoyage complet"), "service_en": "Complete cleanup", "price": 60},
                ],
                "minimum_charge": 60,
                "notes": _("Par appareil.")
            },
            {
                "id": "internet_security",
                "name": _("Conseil connexions internet"),
                "name_en": "Internet Security Consulting",
                "category": "security",
                "pricing_type": "mixed",
                "hourly_rate": 30,
                "fixed_prices": [
                    {"service": _("Configuration contrôle parental"), "service_en": "Parental controls setup", "price": 25},
                ],
                "minimum_charge": 25,
                "notes": None
            },
            {
                "id": "network",
                "name": _("Configuration box et réseau"),
                "name_en": "Router & Network Setup",
                "category": "network",
                "pricing_type": "fixed",
                "hourly_rate": None,
                "fixed_prices": [
                    {"service": _("Configuration complète"), "service_en": "Complete setup", "price": 40},
                ],
                "minimum_charge": 40,
                "notes": _("WiFi, sécurité, mot de passe.")
            },
            {
                "id": "remote",
                "name": _("Assistance à distance"),
                "name_en": "Remote Support",
                "category": "support",
                "pricing_type": "hourly",
                "hourly_rate": 45,
                "fixed_prices": None,
                "minimum_charge": 45,
                "notes": _("Paiement PayPal accepté.")
            },
        ]
    }


def format_pricelist_as_text(pricelist, language='fr'):
    """
    Format the pricelist as plain text for easy reading.
    
    Args:
        pricelist: The pricelist data from get_pricelist()
        language: 'fr' or 'en'
    
    Returns:
        A formatted plain text string
    """
    is_french = language.startswith('fr')
    currency = pricelist['currency_symbol']
    
    lines = []
    
    # Header
    if is_french:
        lines.append("=" * 60)
        lines.append("KRISPC - LISTE DES TARIFS")
        lines.append("=" * 60)
        lines.append("")
        lines.append(f"Devise: {pricelist['currency']} ({currency})")
        lines.append(f"Mise à jour: {pricelist['last_updated']}")
        lines.append(f"Note: {pricelist['minimum_charge_policy']}")
        lines.append("")
        lines.append("-" * 60)
    else:
        lines.append("=" * 60)
        lines.append("KRISPC - PRICE LIST")
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
        
        if service['pricing_type'] == 'hourly':
            rate_label = "Tarif horaire" if is_french else "Hourly rate"
            lines.append(f"  {rate_label}: {service['hourly_rate']} {currency}/h")
        
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
        lines.append("Contact: hello@krispc.fr")
        lines.append("Site web: https://krispc.fly.dev")
    else:
        lines.append("Contact: hello@krispc.fr")
        lines.append("Website: https://krispc.fly.dev")
    
    lines.append("=" * 60)
    
    return "\n".join(lines)


def format_products_as_text(products, language='fr'):
    """
    Format the products list as plain text.
    
    Args:
        products: List of product dictionaries from lst_products.data()
        language: 'fr' or 'en'
    
    Returns:
        A formatted plain text string
    """
    is_french = language.startswith('fr')
    
    lines = []
    
    # Header
    if is_french:
        lines.append("=" * 60)
        lines.append("KRISPC - SERVICES INFORMATIQUES")
        lines.append("=" * 60)
    else:
        lines.append("=" * 60)
        lines.append("KRISPC - IT SERVICES")
        lines.append("=" * 60)
    
    lines.append("")
    
    for i, product in enumerate(products, 1):
        lines.append(f"{i}. {product['Prd_Name']}")
        lines.append(f"   {product['Prd_Desc']}")
        
        # Clean up Prd_More (remove HTML tags for text output)
        more = product['Prd_More']
        # Simple HTML tag removal
        import re
        more = re.sub(r'<[^>]+>', '', more)
        more = more.replace('\n', ' ').strip()
        
        lines.append(f"   → {more}")
        lines.append("")
    
    lines.append("-" * 60)
    
    if is_french:
        lines.append("Contact: hello@krispc.fr | Site: https://krispc.fly.dev")
    else:
        lines.append("Contact: hello@krispc.fr | Website: https://krispc.fly.dev")
    
    lines.append("=" * 60)
    
    return "\n".join(lines)
