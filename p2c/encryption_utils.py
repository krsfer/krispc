
import base64
from django.conf import settings
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def get_fernet_key():
    """
    Derives a valid Fernet key from the SECRET_KEY in settings.
    This ensures the key is always 32 bytes and URL-safe base64 encoded.
    """
    secret_key = settings.SECRET_KEY
    if not secret_key:
        raise ValueError("SECRET_KEY must be set in settings for encryption.")

    # Use a salt to derive the key. A fixed salt is acceptable here as the
    # primary goal is to derive a key of the correct format from a secret
    # that is already expected to be highly random and confidential.
    salt = b'django-p2c-encryption-salt'

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,  # Recommended number of iterations
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
    return key

_fernet = Fernet(get_fernet_key())

def encrypt_credentials(credentials_json: str) -> str:
    """
    Encrypts a JSON string of credentials.
    Returns a URL-safe, base64-encoded encrypted token as a string.
    """
    if not isinstance(credentials_json, str):
        raise TypeError("Credentials must be a JSON string.")
    
    encrypted_token = _fernet.encrypt(credentials_json.encode('utf-8'))
    return encrypted_token.decode('utf-8')

def decrypt_credentials(encrypted_token: str) -> str:
    """
    Decrypts an encrypted token.
    Returns the original JSON string of credentials.
    """
    if not isinstance(encrypted_token, str):
        raise TypeError("Encrypted token must be a string.")
        
    decrypted_json = _fernet.decrypt(encrypted_token.encode('utf-8'))
    return decrypted_json.decode('utf-8')
