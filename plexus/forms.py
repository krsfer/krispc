from django import forms
from .models import Input, Thought

class InputForm(forms.ModelForm):
    class Meta:
        model = Input
        fields = ["content", "source"]
        widgets = {
            "content": forms.Textarea(attrs={
                "class": "form-control",
                "rows": 5,
                "placeholder": "What's on your mind?"
            }),
            "source": forms.Select(attrs={
                "class": "form-control"
            }),
        }

class ThoughtForm(forms.ModelForm):
    reclassify = forms.BooleanField(
        required=False,
        label="Re-classify with AI",
        help_text="Check this to let AI process the new content and suggest a type/actions."
    )

    class Meta:
        model = Thought
        fields = ["content", "type"]
        widgets = {
            "content": forms.Textarea(attrs={
                "class": "form-control",
                "rows": 5
            }),
            "type": forms.Select(attrs={
                "class": "form-control"
            }),
        }
