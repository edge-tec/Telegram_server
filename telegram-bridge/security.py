import os
import base64
import json
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def get_secret_key(raw_key: str = None) -> bytes:
    key_str = raw_key or os.getenv("BRIDGE_SECRET_KEY", "telegram-responder-secret-key-32b")
    # Pad or truncate to 32 bytes for AES-256
    key_bytes = key_str.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"0")
    else:
        key_bytes = key_bytes[:32]
    return key_bytes

def encrypt_data(data: str, raw_key: str = None) -> str:
    key = get_secret_key(raw_key)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data.encode("utf-8"), None)
    # Pack nonce + ciphertext
    payload = nonce + ciphertext
    return base64.b64encode(payload).decode("utf-8")

def decrypt_data(token: str, raw_key: str = None) -> str:
    key = get_secret_key(raw_key)
    aesgcm = AESGCM(key)
    raw = base64.b64decode(token.encode("utf-8"))
    nonce = raw[:12]
    ciphertext = raw[12:]
    decrypted = aesgcm.decrypt(nonce, ciphertext, None)
    return decrypted.decode("utf-8")
