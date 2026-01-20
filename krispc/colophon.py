""" . """

from django.utils.translation import gettext as _

def data():
    """."""

    var = [
        {"Colophon_Title": "Python", "Colophon_Icon": "1python.png", "Colophon_Link": _("py_lnk")},
        {"Colophon_Title": "Django", "Colophon_Icon": "2django.png", "Colophon_Link": _("dj_lnk")},
        {"Colophon_Title": "Bootstrap", "Colophon_Icon": "3bootstrap.png", "Colophon_Link": _("bs_lnk")},
        {"Colophon_Title": "Javascript", "Colophon_Icon": "js.png", "Colophon_Link": _("js_lnk")},
        {"Colophon_Title": "PostgreSQL", "Colophon_Icon": "5pgsql.png", "Colophon_Link": _("pg_lnk")},
        {"Colophon_Title": "Gimp", "Colophon_Icon": "6gimp.png", "Colophon_Link": _("gm_lnk")},
        # {"Colophon_Title": "VSCode", "Colophon_Icon": "7vscode.png", "Colophon_Link": _("vs_lnk")},
        {"Colophon_Title": "PyCharm", "Colophon_Icon": "pclogo.png", "Colophon_Link": _("pc_lnk")},
    ]

    return var
