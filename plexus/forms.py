from django import forms
from django.utils.translation import gettext_lazy as _
from .models import Input, Thought
from .validators import validate_text_length, validate_image_size, INPUT_LIMITS

class InputForm(forms.ModelForm):
    class Meta:
        model = Input
        fields = ["content", "image", "source"]
        widgets = {
            "content": forms.Textarea(attrs={
                "class": "block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white sm:text-sm",
                "rows": 5,
                "placeholder": _("What's on your mind? Text or Image..."),
                "maxlength": INPUT_LIMITS['TEXT_MAX_LENGTH'],
            }),
            "image": forms.FileInput(attrs={
                "class": "sr-only",
                "accept": "image/*"
            }),
            "source": forms.Select(attrs={
                "class": "block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white sm:text-sm"
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['content'].required = False

    def clean_content(self):
        content = self.cleaned_data.get('content', '')
        # Only validate if content is provided (allow empty if image is provided)
        if content:
            validate_text_length(content)
        return content

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            validate_image_size(image)
        return image

    def clean(self):
        cleaned_data = super().clean()
        content = cleaned_data.get('content', '')
        image = cleaned_data.get('image')
        
        # At least one of content or image must be provided
        if not content and not image:
            raise forms.ValidationError(
                _('Please provide either text content or an image.')
            )
        
        return cleaned_data


class ThoughtForm(forms.ModelForm):
    reclassify = forms.BooleanField(
        required=False,
        label=_("Re-classify with AI"),
        help_text=_("Check this to let AI process the new content and suggest a type/actions.")
    )

    class Meta:
        model = Thought
        fields = ["content", "type"]
        widgets = {
            "content": forms.Textarea(attrs={
                "class": "block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white sm:text-sm",
                "rows": 5
            }),
            "type": forms.Select(attrs={
                "class": "block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:text-white sm:text-sm"
            }),
        }