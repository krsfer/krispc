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
                "id": "p2c_standard",
                "name": _("Pdf2Cal Standard"),
                "name_en": "Pdf2Cal Standard",
                "price": 0,
                "notes": _("Conversion illimitée de PDF en calendrier.")
            }
        ]
    }

def format_pricelist_as_text(pricelist, language='fr'):
    is_french = language.startswith('fr')
    lines = ["PDF2CAL - " + ("TARIFS" if is_french else "PRICE LIST"), "=" * 30, ""]
    for s in pricelist['services']:
        name = s['name'] if is_french else s['name_en']
        lines.append(f"{name}: {s['price']} {pricelist['currency_symbol']}")
        lines.append(f"  ({s['notes']})")
        lines.append("")
    return "\n".join(lines)
