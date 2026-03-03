from django import forms

from sas.models import SasFile

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
    token = forms.CharField(required=False, widget=forms.HiddenInput())
