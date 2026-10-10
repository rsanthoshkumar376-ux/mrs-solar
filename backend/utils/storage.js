import crypto from 'crypto';
import path from 'path';
import { db } from '../database/db.js';

// ─── Environment & Secrets ───────────────────────────────────────────────────
const SECRET = process.env.DOCUMENT_ENCRYPTION_KEY || process.env.JWT_SECRET || 'mrs_solar_document_vault_key_2026_secure';
const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a deterministic 32-byte key for AES-256 from the master secret
 */
function getEncryptionKey() {
  return crypto.createHash('sha256').update(SECRET).digest();
}

/**
 * 1. Aadhaar Masking & UIDAI Privacy Compliance
 * Ensures that NEVER more than the last 4 digits of Aadhaar are saved.
 * Formats as: XXXX-XXXX-1234
 */
export function maskAadhaar(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  // Extract all digit characters
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }
  if (str.toUpperCase().includes('XXXX')) {
    return str.toUpperCase();
  }
  return digits ? `XXXX-XXXX-${digits}` : '';
}

/**
 * 2. AES-256-GCM Encryption for sensitive identity documents
 */
export function encryptBuffer(buffer) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Recommended 12 bytes IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedBuffer: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * AES-256-GCM Decryption with Authentication Tag verification
 */
export function decryptBuffer(encryptedBuffer, ivHex, authTagHex) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

/**
 * 3. Signed Expiring Token Engine (HMAC-SHA256)
 * Generates URLs that automatically expire in 15 minutes (900 seconds)
 */
export function generateSignedExpiringToken(docId, expiresInSeconds = 900) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${docId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return { expiresAt, signature: hmac };
}

export function verifySignedExpiringToken(docId, expiresAt, signature) {
  const now = Math.floor(Date.now() / 1000);
  if (!expiresAt || Number(expiresAt) < now) {
    return { valid: false, reason: 'This document access URL has expired. Please refresh the page for a fresh link.' };
  }
  const payload = `${docId}:${expiresAt}`;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (expected !== signature) {
    return { valid: false, reason: 'Invalid or forged document access signature.' };
  }
  return { valid: true };
}

// ─── 4. Cloudflare R2 / Backblaze B2 / AWS S3 Integration ─────────────────────
let s3ClientInstance = null;
async function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || process.env.B2_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || process.env.B2_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION || 'auto';

  if (!accessKeyId || !secretAccessKey) return null;

  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3ClientInstance = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: { accessKeyId, secretAccessKey }
    });
    return s3ClientInstance;
  } catch (err) {
    console.error('Failed to initialize S3/R2 client:', err.message);
    return null;
  }
}

// ─── 5. Cloudinary Integration ───────────────────────────────────────────────
let cloudinaryInstance = null;
async function getCloudinaryClient() {
  if (cloudinaryInstance) return cloudinaryInstance;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;

  try {
    const cloudinaryModule = await import('cloudinary');
    const cloudinary = cloudinaryModule.v2 || cloudinaryModule.default;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    cloudinaryInstance = cloudinary;
    return cloudinaryInstance;
  } catch (err) {
    console.error('Failed to initialize Cloudinary:', err.message);
    return null;
  }
}

// ─── 6. High-Level Document Storage Dispatcher ──────────────────────────────
/**
 * Saves a sensitive customer document to private cloud storage.
 * Priority:
 * 1. Cloudflare R2 / Backblaze B2 / AWS S3 (if env vars set)
 * 2. Cloudinary (if env vars set)
 * 3. Encrypted Cloud Database Vault (Zero-Config fallback in MongoDB Atlas / TiDB MySQL)
 * 
 * NEVER writes files to the ephemeral local disk!
 */
export async function saveDocument(file, customerId, docType) {
  if (!file || !file.buffer) return null;

  const ext = path.extname(file.originalname || '') || '.bin';
  const cleanId = `${customerId}_${docType}_${Date.now()}`;
  const s3Bucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || process.env.B2_BUCKET_NAME;

  // 1. Try S3-compatible (Cloudflare R2 / Backblaze B2)
  const s3 = await getS3Client();
  if (s3 && s3Bucket) {
    try {
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const key = `mrs-solar-docs/${customerId}/${cleanId}${ext}`;
      
      // Encrypt sensitive identity proof before upload
      const { encryptedBuffer, iv, authTag } = encryptBuffer(file.buffer);
      await s3.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: encryptedBuffer,
        ContentType: 'application/octet-stream',
        Metadata: {
          'x-mrs-mimetype': file.mimetype || 'application/octet-stream',
          'x-mrs-filename': encodeURIComponent(file.originalname || 'document'),
          'x-mrs-iv': iv,
          'x-mrs-tag': authTag
        }
      }));
      return `s3://${s3Bucket}/${key}`;
    } catch (s3Err) {
      console.warn('S3 upload failed, falling back to encrypted cloud vault:', s3Err.message);
    }
  }

  // 2. Try Cloudinary
  const cld = await getCloudinaryClient();
  if (cld) {
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cld.uploader.upload_stream(
          {
            folder: `mrs_solar_docs/${customerId}`,
            public_id: cleanId,
            resource_type: 'auto',
            type: 'authenticated' // Private, requires signed expiring URL
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });
      return `cloudinary://${result.public_id}?format=${result.format || 'jpg'}`;
    } catch (cldErr) {
      console.warn('Cloudinary upload failed, falling back to encrypted cloud vault:', cldErr.message);
    }
  }

  // 3. Encrypted Cloud Database Vault (Default — stored in MongoDB Atlas / MySQL, survives all Render redeploys)
  const docId = `DOC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const { encryptedBuffer, iv, authTag } = encryptBuffer(file.buffer);

  await db.create('customer_documents', {
    _id: docId,
    customerId,
    docType,
    fileName: file.originalname || `${docType}${ext}`,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.buffer.length,
    encryptedData: encryptedBuffer.toString('base64'),
    iv,
    authTag,
    uploadedAt: new Date().toISOString()
  });

  return `vault://${docId}`;
}

/**
 * 7. Retrieve & Decrypt from the Database Vault
 */
export async function getDocumentFromVault(docId) {
  const record = await db.findOne('customer_documents', { _id: docId });
  if (!record) return null;

  const encryptedBuffer = Buffer.from(record.encryptedData, 'base64');
  const decryptedBuffer = decryptBuffer(encryptedBuffer, record.iv, record.authTag);

  return {
    buffer: decryptedBuffer,
    mimeType: record.mimeType,
    fileName: record.fileName
  };
}

/**
 * 8. Generates an active, signed, expiring URL for any document reference
 */
export async function getSignedExpiringUrl(docRef, baseUrl = '') {
  if (!docRef) return null;

  // Case A: Encrypted Cloud Database Vault
  if (docRef.startsWith('vault://')) {
    const docId = docRef.replace('vault://', '');
    const { expiresAt, signature } = generateSignedExpiringToken(docId, 900); // 15 minutes
    const base = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    return `${base}/api/admin/documents/view/${docId}?expires=${expiresAt}&sig=${signature}`;
  }

  // Case B: Cloudflare R2 / Backblaze B2 / AWS S3
  if (docRef.startsWith('s3://')) {
    const s3 = await getS3Client();
    const parts = docRef.replace('s3://', '').split('/');
    const bucket = parts.shift();
    const key = parts.join('/');
    if (s3) {
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        return await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 });
      } catch (e) {
        console.error('Failed to generate S3 presigned URL:', e.message);
      }
    }
  }

  // Case C: Cloudinary authenticated signed download URL
  if (docRef.startsWith('cloudinary://')) {
    const cld = await getCloudinaryClient();
    if (cld) {
      const urlPart = docRef.replace('cloudinary://', '');
      const [publicId, query] = urlPart.split('?');
      const format = query && query.includes('format=') ? query.split('format=')[1] : 'jpg';
      const expiresAt = Math.floor(Date.now() / 1000) + 900;
      return cld.utils.private_download_url(publicId, format, {
        expires_at: expiresAt,
        attachment: false
      });
    }
  }

  // Legacy local uploads fallback (if present in historical records)
  if (docRef.startsWith('/uploads/')) {
    return docRef;
  }

  return docRef;
}

/**
 * Resolves all document fields on a customer object to live signed expiring URLs
 */
export async function resolveCustomerDocumentUrls(customer, baseUrl = '') {
  if (!customer) return customer;
  const docs = customer.documents || {};
  const resolvedDocs = {};

  for (const [key, ref] of Object.entries(docs)) {
    if (ref) {
      try {
        resolvedDocs[key] = await getSignedExpiringUrl(ref, baseUrl);
      } catch (err) {
        console.error(`Error generating signed URL for ${key}:`, err);
        resolvedDocs[key] = null;
      }
    } else {
      resolvedDocs[key] = null;
    }
  }

  return {
    ...customer,
    aadhaarNumber: maskAadhaar(customer.aadhaarNumber),
    documents: resolvedDocs
  };
}
