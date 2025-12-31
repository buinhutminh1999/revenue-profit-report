/**
 * Video Compression Utility
 * Compresses videos before upload using MediaRecorder API
 * Note: Browser video compression is limited, but can still reduce file size significantly
 */

const DEFAULT_VIDEO_OPTIONS = {
    maxWidth: 1280,         // 720p width
    maxHeight: 720,         // 720p height
    videoBitsPerSecond: 1000000, // 1 Mbps (decent quality, small size)
    mimeType: 'video/webm'  // WebM for better compression
};

/**
 * Get supported video MIME type
 */
const getSupportedMimeType = () => {
    const types = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return 'video/webm';
};

/**
 * Compress a video file
 * @param {File} file - Original video file
 * @param {Object} options - Compression options
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<File>} - Compressed file
 */
export const compressVideo = async (file, options = {}, onProgress = null) => {
    // Skip if not a video
    if (!file.type.startsWith('video/')) {
        return file;
    }

    // Skip compression for already small videos (< 2MB)
    if (file.size < 2 * 1024 * 1024) {
        console.log('🎬 Video already small, skipping compression');
        return file;
    }

    const settings = { ...DEFAULT_VIDEO_OPTIONS, ...options };
    const mimeType = getSupportedMimeType();

    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            try {
                // Calculate new dimensions
                let { videoWidth: width, videoHeight: height } = video;

                if (width > settings.maxWidth || height > settings.maxHeight) {
                    const ratio = Math.min(
                        settings.maxWidth / width,
                        settings.maxHeight / height
                    );
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // Create canvas for video frame processing
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Create MediaRecorder
                const stream = canvas.captureStream(30); // 30 FPS

                // Try to include audio
                try {
                    const audioCtx = new AudioContext();
                    const source = audioCtx.createMediaElementSource(video);
                    const dest = audioCtx.createMediaStreamDestination();
                    source.connect(dest);
                    source.connect(audioCtx.destination);

                    dest.stream.getAudioTracks().forEach(track => {
                        stream.addTrack(track);
                    });
                } catch (audioErr) {
                    console.log('🎬 Video has no audio or audio processing failed');
                }

                const recorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: settings.videoBitsPerSecond
                });

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    const compressedFile = new File(
                        [blob],
                        file.name.replace(/\.[^/.]+$/, '.webm'),
                        { type: mimeType }
                    );

                    const reduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
                    console.log(
                        `🎬 Video Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (${reduction}% smaller)`
                    );

                    // Cleanup
                    URL.revokeObjectURL(video.src);
                    resolve(compressedFile);
                };

                recorder.onerror = (e) => {
                    reject(new Error('MediaRecorder error: ' + e.error));
                };

                // Start recording
                recorder.start();

                // Play and draw video frames
                video.currentTime = 0;
                await video.play();

                const drawFrame = () => {
                    if (video.ended || video.paused) {
                        recorder.stop();
                        return;
                    }

                    ctx.drawImage(video, 0, 0, width, height);

                    // Report progress
                    if (onProgress) {
                        const progress = (video.currentTime / video.duration) * 100;
                        onProgress(Math.round(progress));
                    }

                    requestAnimationFrame(drawFrame);
                };

                drawFrame();

                // Stop when video ends
                video.onended = () => {
                    recorder.stop();
                };

            } catch (err) {
                reject(err);
            }
        };

        video.onerror = () => {
            reject(new Error('Failed to load video'));
        };

        video.src = URL.createObjectURL(file);
    });
};

/**
 * Simple video compression fallback - just limits duration
 * Use this if MediaRecorder approach fails
 */
export const validateVideoSize = (file, maxSizeMB = 10) => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
        return {
            valid: false,
            message: `Video quá lớn (${sizeMB.toFixed(1)}MB). Vui lòng chọn video nhỏ hơn ${maxSizeMB}MB.`
        };
    }
    return { valid: true };
};
