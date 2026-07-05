import os
import yaml
from django.conf import settings

def load_prompt(yaml_filename: str) -> str:
    """
    Loads a system prompt from the YAML configuration directory.
    """
    # Build the absolute path to the prompts folder
    file_path = os.path.join(
        settings.BASE_DIR, 'apps', 'agentic_ai', 'prompts', yaml_filename
    )
    
    with open(file_path, 'r', encoding='utf-8') as file:
        config = yaml.safe_load(file)
        return config.get('system_prompt', '')