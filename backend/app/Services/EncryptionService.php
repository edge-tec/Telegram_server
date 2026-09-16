<?php

namespace App\Services;

use Exception;

class EncryptionService
{
    protected string $key;

    public function __construct()
    {
        $rawKey = config('app.key');
        if (str_starts_with($rawKey, 'base64:')) {
            $this->key = base64_decode(substr($rawKey, 7));
        } else {
            $this->key = hash('sha256', $rawKey, true);
        }
        // Ensure 32 bytes for AES-256
        if (strlen($this->key) < 32) {
            $this->key = str_pad($this->key, 32, "\0");
        } else {
            $this->key = substr($this->key, 0, 32);
        }
    }

    /**
     * Encrypt data with AES-256-GCM
     */
    public function encrypt(string $plaintext): string
    {
        $cipher = 'aes-256-gcm';
        $ivlen = openssl_cipher_iv_length($cipher);
        $iv = openssl_random_pseudo_bytes($ivlen);
        $tag = '';
        $ciphertext = openssl_encrypt($plaintext, $cipher, $this->key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);

        if ($ciphertext === false) {
            throw new Exception('AES-256-GCM encryption failed');
        }

        // Pack iv (12 bytes) + tag (16 bytes) + ciphertext
        $payload = $iv . $tag . $ciphertext;
        return base64_encode($payload);
    }

    /**
     * Decrypt data with AES-256-GCM
     */
    public function decrypt(string $encryptedBase64): string
    {
        $raw = base64_decode($encryptedBase64);
        $cipher = 'aes-256-gcm';
        $ivlen = openssl_cipher_iv_length($cipher);
        $taglen = 16;

        if (strlen($raw) < ($ivlen + $taglen)) {
            throw new Exception('Invalid ciphertext payload');
        }

        $iv = substr($raw, 0, $ivlen);
        $tag = substr($raw, $ivlen, $taglen);
        $ciphertext = substr($raw, $ivlen + $taglen);

        $plaintext = openssl_decrypt($ciphertext, $cipher, $this->key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($plaintext === false) {
            throw new Exception('AES-256-GCM decryption failed or authentication tag mismatch');
        }

        return $plaintext;
    }
}
