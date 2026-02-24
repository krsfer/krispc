from django import forms

from sas.models import SasFile

try:
    from turnstile.fields import TurnstileField
except Exception:  # pragma: no cover - fallback when django-turnstile isn't installed locally
    class TurnstileField(forms.CharField):
        pass


class SasUploadForm(forms.ModelForm):
    class Meta:
        model = SasFile
        fields = ["file", "caption"]
        widgets = {
            "caption": forms.TextInput(
                attrs={
                    "placeholder": "Optional caption",
                }
            )
        }


class DownloadChallengeForm(forms.Form):
    turnstile = TurnstileField()
