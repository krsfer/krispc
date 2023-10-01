""" . """

from django.utils.translation import gettext as _

from krispc.lst_prod_prices import crypto_price, price_converted


def data():
    """."""

    var = [
        {
            "Prd_Icon": "ri-phone-line",
            "Prd_Name": _("PTR_0370"),
            "Prd_Desc": _("PTR_0380"),
            "Prd_More": crypto_price(price_converted("PTR_3330", _("PTR_3330"))),
        },
        {
            "Prd_Icon": "ri-computer-line",
            "Prd_Name": _("PTR_0230"),
            "Prd_Desc": _("PTR_0240"),
            "Prd_More": crypto_price(price_converted("PTR_3000", _("PTR_3000"))),
        },
        {
            "Prd_Icon": "ri-file-copy-line",
            "Prd_Name": _("PTR_0310"),
            "Prd_Desc": _("PTR_0320"),
            "Prd_More": crypto_price(price_converted("PTR_0200", _("PTR_0200"))),
        },
        {
            "Prd_Icon": "ri-printer-line",
            "Prd_Name": _("PTR_0400"),
            "Prd_Desc": _("PTR_0410"),
            "Prd_More": crypto_price(price_converted("PTR_0420", _("PTR_0420"))),
        },
        {
            "Prd_Icon": "ri-lightbulb-line",
            "Prd_Name": _("PTR_0480"),
            "Prd_Desc": _("PTR_0490"),
            "Prd_More": crypto_price(price_converted("PTR_0500", _("PTR_0500"))),
        },
        {
            "Prd_Icon": "ri-bug-2-line",
            "Prd_Name": _("PTR_0510"),
            "Prd_Desc": _("PTR_0520"),
            "Prd_More": crypto_price(price_converted("PTR_0540", _("PTR_0540"))),
        },
        {
            "Prd_Icon": "ri-lock-2-line",
            "Prd_Name": _("PTR_0560"),
            "Prd_Desc": _("PTR_0570"),
            "Prd_More": crypto_price(price_converted("PTR_0580", _("PTR_0580"))),
        },
        {
            "Prd_Icon": "ri-home-wifi-line",
            "Prd_Name": _("PTR_0600"),
            "Prd_Desc": _("PTR_0610"),
            "Prd_More": crypto_price(price_converted("PTR_1980", _("PTR_1980"))),
        },
        {
            "Prd_Icon": "ri-headphone-line",
            "Prd_Name": _("PTR_0670"),
            "Prd_Desc": _("PTR_0680"),
            "Prd_More": crypto_price(price_converted("PTR_0690", _("PTR_0690"))),
        },
    ]

    return var
