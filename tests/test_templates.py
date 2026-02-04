
import os
import pytest
from django.template import loader
from django.template import engines
from django.conf import settings
from django.template.loaders.app_directories import get_app_template_dirs

def get_all_template_files():
    """
    Generator that yields all template files available to Django loaders.
    """
    template_files = []
    
    # 1. Check configured DIRS
    for engine in settings.TEMPLATES:
        for template_dir in engine.get('DIRS', []):
            if os.path.isdir(template_dir):
                for root, dirs, files in os.walk(template_dir):
                    for file in files:
                        if file.endswith('.html') or file.endswith('.txt'):
                            template_files.append(os.path.join(root, file))

    # 2. Check APP_DIRS
    for template_dir in get_app_template_dirs('templates'):
        if os.path.exists(template_dir):
             for root, dirs, files in os.walk(template_dir):
                for file in files:
                    # Calculate relative path for loading
                    rel_path = os.path.relpath(os.path.join(root, file), template_dir)
                    template_files.append(rel_path)
    
    # Remove duplicates
    return sorted(list(set(template_files)))

@pytest.mark.django_db
def test_all_templates_syntax():
    """
    Tries to load every template to ensure no TemplateSyntaxError exists.
    """
    templates = get_all_template_files()
    failures = []
    
    project_root = str(settings.BASE_DIR)

    print(f"Scanning {len(templates)} templates for syntax errors...")

    for template_name in templates:
        # Skip known external/admin paths to save time and reduce noise
        if template_name.startswith('admin/'): continue 
        if template_name.startswith('debug_toolbar/'): continue
        if template_name.startswith('django_filters/'): continue
        if template_name.startswith('rest_framework/'): continue
        if 'site-packages' in template_name: continue

        try:
            t = loader.get_template(template_name)
            
            # Double check origin to ensure it is project code
            # Note: get_template might return a wrapper or different object depending on backend
            if hasattr(t, 'origin') and t.origin and t.origin.name:
                if project_root not in str(t.origin.name):
                    continue

        except Exception as e:
            # Check again if it's an external lib that failed
            # Some libs might not catch startswith block above if passed as absolute path
            if 'django_filters' in str(template_name): continue
            if 'rest_framework' in str(template_name): continue
            
            failures.append(f"{template_name}: {e}")

    if failures:
        pytest.fail("\n".join(failures))
