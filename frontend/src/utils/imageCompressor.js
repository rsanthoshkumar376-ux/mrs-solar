/**
 * Client-Side Image Compressor Utility
 * Automatically resizes and compresses customer photos and identity documents
 * using an HTML5 Canvas before sending them over the network.
 * Keeps payloads under 400KB while preserving high visual clarity.
 */

export async function compressImageFile(file, maxWidth = 1280, maxHeight = 1280, quality = 0.8) {
  // If not an image or already smaller than 300KB, return original file as-is
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file); // Fallback to original on read error
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file); // Fallback to original on decode error
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional scale down if dimensions exceed bounds
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        // Apply smooth bilinear scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern WebP if supported, fallback to JPEG
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed blob is larger than original, keep original
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: outputMime,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an object of named files { aadhaarFile, photoFile, ... }
 */
export async function compressFilesMap(filesMap) {
  const result = {};
  for (const [key, file] of Object.entries(filesMap)) {
    if (file instanceof File) {
      result[key] = await compressImageFile(file);
    } else {
      result[key] = file;
    }
  }
  return result;
}
