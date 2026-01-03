# https://pythex.org # a quick way to test your Python regular expressions

r"""
for i in $( grep Prd_Name /Users/chris/dev/src/py/docker_example_app/djangodocker-master/krispc/lst_products.py | sed -E 's/.*(PTR_[0-9]{4}).*/\1/' ); do echo -n $i; grep $i /Users/chris/dev/src/py/docker_example_app/djangodocker-master/locale/fr/LC_MESSAGES/django.po -A1 | grep msgstr | sed 's/.*"\(.*\).*"/\t\1/' ; done

base=/Users/chris/dev/src/py/docker_example_app/djangodocker-master; for i in $( grep Prd_Name $base/krispc/lst_products.py | sed -E 's/.*(PTR_[0-9]{4}).*/\1/' ); do echo -n $i; grep $i $base/locale/fr/LC_MESSAGES/django.po -A1 | grep msgstr | sed 's/.*"\(.*\).*"/\t\1/'; done
"""
import re

data = {
    "PTR_3330": [
        "Smartphones… Remplacement écran ou batterie. Réglage. Configuration. Dépannage",
        ["30"]
    ],
    "PTR_3000": [
        "Réparation PC de bureau et mise à jour de matériel",
        ["40", "50", "50"]
    ],
    "PTR_0200": ["Réparations portables et entretien informatique", ["35"]],
    "PTR_0420": ["Configuration et dépannage dʼimprimante", ["30"]],
    "PTR_0500": ["Conseil, formation personnalisée", ["40"]],
    "PTR_0540": [
        "Identification et suppression des logiciels malveillants",
        ["60"]
    ],
    "PTR_0580": ["Connexions et Sécurité Internet", ["25", "30"]],
    "PTR_1980": ["Configuration de box internet", ["40"]],
    "PTR_0690": ["Prise en main à distance de vos appareils", ["45"]]
}


def price_converted(thePointer, theBlurb, factor=1):
    """
    Apply price factor percantage to price in theBlurb string
    For example apply (percentage) factor=20 to convert
        « l'étendue des dommages. {35&nbsp;&euro;} de l'heure. »
    into
        « l'étendue des dommages. 42&nbsp;&euro; de l'heure. »
    """

    dta = theBlurb
    # print("dta:", dta)
    # dta = re.sub('\{(.*?)\}', lambda m: str(int(m.group(1)) * 3), dta)
    # print(dta)
    #

    # print(".." * 5)
    #
    # print("thePointer:", thePointer)
    # print("dta:", dta)

    matches = re.findall('({.*?})', dta)
    for ma in matches:
        # print("ma:", ma)
        mtch = re.search('{(.*?)}', ma)
        # print("mtch.group(0):", mtch.group(1))
        price = int(data[thePointer][1][int(mtch.group(1))])

        dta = dta.replace(ma, str(price * factor) + "&nbsp;&euro;")

    # print(dta)

    return dta


def crypto_price(blrb="", symbol=""):
    """
    :param blrb:
    :type blrb:
    :param symbol: One of BTC,ETH, ADA
    :type symbol:
    :return:
    :rtype:


    Apply price factor percantage to price in blrb string
    For example Convert
        « l'étendue des dommages. 42&nbsp;&euro; de l'heure. »
    into
        « l'étendue des dommages. 0.000062 BTC de l'heure. »
    """

    return blrb
    #
    # rate = 1.0
    # with open(os.path.join(settings.STATIC_ROOT, "krispc/crypto_20221111192015.json"), "r") as f:
    #     data = json.load(f)
    #     for p in data["data"]:
    #         if "USD" == p["code"]:
    #             rate = float(p["rate"])
    #
    # prog = re.compile(r"(\d+[\.,]?\d?)\s?&nbsp;&euro;")
    #
    # ms = re.findall(prog, blrb)
    #
    # for m in ms:
    #     mtch = re.search(prog, blrb)
    #     n = re.match(prog, mtch.group(0))
    #
    #     num = float(n.group(1))
    #     rs = float(num / rate)
    #
    #     blrb = f"{blrb[: mtch.start()]}{str(rs)} BTC{blrb[mtch.end():]}"
    #
    # return blrb


if __name__ == "__main__":
    blurb = "Je peux supprimer pour vous tous les virus, les logiciels publicitaires et les logiciels espions.Le service de suppression de logiciels malveillants coûte {0} par appareil."

    print(price_converted("PTR_0540", blurb))
