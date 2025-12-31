/**
 * Image Compression Utility
 * Compresses images before upload to save storage and bandwidth
 */

const DEFAULT_OPTIONS = {
    maxWidth: 1920,        // Full HD width
    maxHeight: 1920,       // Full HD height
    quality: 0.8,          // 80% quality - good balance
    mimeType: 'image/jpeg' // JPEG for better compression
};

/**
 * Compress an image file
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export const compressImage = async (file, options = {}) => {
    // Skip if not an image
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip compression for already small images (< 500KB)
    if (file.size < 500 * 1024) {
        console.log('🖼️ Image already small, skipping compression');
        return file;
    }

    const settings = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > settings.maxWidth || height > settings.maxHeight) {
                    const ratio = Math.min(
                        settings.maxWidth / width,
                        settings.maxHeight / height
                    );
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');

                // Use better image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }

                        // Create new file with same name but compressed
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^/.]+$/, '.jpg'),
                            { type: settings.mimeType }
                        );

                        const reduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
                        console.log(
                            `🖼️ Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${reduction}% smaller)`
                        );

                        resolve(compressedFile);
                    },
                    settings.mimeType,
                    settings.quality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
    });
};

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed files
 */
export const compressImages = async (files, options = {}) => {
    const results = await Promise.all(
        files.map(file => compressImage(file, options).catch(() => file))
    );
    return results;
};
