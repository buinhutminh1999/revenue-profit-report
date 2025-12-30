/**
 * Service to handle image uploads to Cloudinary
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'; // Fallback to demo for testing if allowed, but usually fails
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';

export const uploadToCloudinary = async (file) => {
    if (!file) return null;

    // Validate Cloud Name and Preset availability
    // Note: User must provide these. 
    // If not provided, we can show specific error.
    if (!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) {
        console.warn("Missing VITE_CLOUDINARY_CLOUD_NAME in .env");
        // throw new Error("Vui lòng cấu hình Cloudinary Cloud Name");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    // Optional: Add folder
    formData.append('folder', 'repair_proposals');

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Lỗi khi tải ảnh lên');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Service Error:', error);
        throw error;
    }
};
