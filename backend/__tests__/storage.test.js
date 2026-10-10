import { 
  maskAadhaar, 
  encryptBuffer, 
  decryptBuffer, 
  generateSignedExpiringToken, 
  verifySignedExpiringToken 
} from '../utils/storage.js';

describe('Document Privacy, Encryption & Expiring Token Tests', () => {

  describe('1. Aadhaar Masking & Privacy Compliance', () => {
    test('Masks standard 12-digit Aadhaar number to only retain the last 4 digits', () => {
      expect(maskAadhaar('306797562218')).toBe('XXXX-XXXX-2218');
    });

    test('Masks spaced or hyphenated 12-digit Aadhaar numbers', () => {
      expect(maskAadhaar('3067 9756 2218')).toBe('XXXX-XXXX-2218');
      expect(maskAadhaar('3067-9756-2218')).toBe('XXXX-XXXX-2218');
    });

    test('Preserves already masked Aadhaar strings', () => {
      expect(maskAadhaar('XXXX-XXXX-2218')).toBe('XXXX-XXXX-2218');
    });

    test('Handles short 4-digit input', () => {
      expect(maskAadhaar('2218')).toBe('XXXX-XXXX-2218');
    });

    test('Handles null or empty string gracefully', () => {
      expect(maskAadhaar('')).toBe('');
      expect(maskAadhaar(null)).toBe('');
      expect(maskAadhaar(undefined)).toBe('');
    });
  });

  describe('2. AES-256-GCM Document Encryption & Decryption', () => {
    test('Encrypts and decrypts buffer accurately preserving bytes', () => {
      const originalText = 'CONFIDENTIAL_CUSTOMER_IDENTITY_DATA_TNEB_BILL_PAN_CARD';
      const originalBuffer = Buffer.from(originalText, 'utf-8');

      const { encryptedBuffer, iv, authTag } = encryptBuffer(originalBuffer);

      // Ciphertext should not match original plaintext
      expect(encryptedBuffer.toString('utf-8')).not.toBe(originalText);
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();

      // Decryption should restore original buffer exactly
      const decryptedBuffer = decryptBuffer(encryptedBuffer, iv, authTag);
      expect(decryptedBuffer.toString('utf-8')).toBe(originalText);
    });

    test('Rejects tampered ciphertext with GCM authentication failure', () => {
      const buffer = Buffer.from('CRITICAL_FINANCIAL_RECORD', 'utf-8');
      const { encryptedBuffer, iv, authTag } = encryptBuffer(buffer);

      // Tamper with the encrypted buffer bytes
      encryptedBuffer[0] = encryptedBuffer[0] ^ 0xFF;

      expect(() => {
        decryptBuffer(encryptedBuffer, iv, authTag);
      }).toThrow();
    });
  });

  describe('3. Signed Expiring Access Tokens', () => {
    test('Generates and verifies a valid time-limited token', () => {
      const docId = 'DOC-123456-789';
      const { expiresAt, signature } = generateSignedExpiringToken(docId, 900); // 15 mins

      const result = verifySignedExpiringToken(docId, expiresAt, signature);
      expect(result.valid).toBe(true);
    });

    test('Rejects expired access tokens', () => {
      const docId = 'DOC-123456-789';
      // Token expired 10 seconds ago
      const expiredAt = Math.floor(Date.now() / 1000) - 10;
      const signature = 'dummy_signature';

      const result = verifySignedExpiringToken(docId, expiredAt, signature);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    test('Rejects forged signatures', () => {
      const docId = 'DOC-123456-789';
      const { expiresAt } = generateSignedExpiringToken(docId, 900);
      const forgedSignature = 'f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1';

      const result = verifySignedExpiringToken(docId, expiresAt, forgedSignature);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid or forged');
    });
  });
});
