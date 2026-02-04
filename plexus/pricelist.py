from django.utils.translation import gettext as _

def get_pricelist():
    return {
        "currency": "EUR",
        "currency_symbol": "€",
        "last_updated": "2026-02-01",
        "minimum_charge_policy": _("Gratuit pour un usage personnel."),
        "minimum_charge_policy_en": "Free for personal use.",
        "services": [
            {
                "id": "plexus_free",
                "name": _("Plexus Free"),
                "name_en": "Plexus Free",
                "price": 0,
                "notes": _("Jusqu'à 100 pensées par mois (limite invité).")
            },
            {
                "id": "plexus_pro",
                "name": _("Plexus Pro"),
                "name_en": "Plexus Pro",
                "price": 4.99,
                "notes": _("Pensées illimitées, synchronisation multi-appareils.")
            }
        ]
    }

def format_pricelist_as_text(pricelist, language='fr'):
    is_french = language.startswith('fr')
    lines = ["PLEXUS - " + ("TARIFS" if is_french else "PRICE LIST"), "=" * 30, ""]
    for s in pricelist['services']:
        name = s['name'] if is_french else s['name_en']
        lines.append(f"{name}: {s['price']} {pricelist['currency_symbol']}")
        lines.append(f"  ({s['notes']})")
        lines.append("")
    return "\n".join(lines)
