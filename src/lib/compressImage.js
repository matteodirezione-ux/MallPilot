/**
 * Comprime un'immagine ridimensionandola e convertendola a JPEG con qualità ridotta
 * @param {File} file - Il file immagine da comprimere
 * @param {number} maxWidth - Larghezza massima in pixel (default: 800)
 * @param {number} maxHeight - Altezza massima in pixel (default: 800)
 * @param {number} quality - Qualità JPEG 0-1 (default: 0.6)
 * @returns {Promise<File>} - Il file compresso
 */
export async function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcola le nuove dimensioni mantenendo l'aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
    };
  });
}

/**
 * Comprime più immagini in parallelo
 * @param {File[]} files - Array di file immagine
 * @param {number} maxWidth - Larghezza massima in pixel
 * @param {number} maxHeight - Altezza massima in pixel
 * @param {number} quality - Qualità JPEG 0-1
 * @returns {Promise<File[]>} - Array di file compressi
 */
export async function compressImages(files, maxWidth = 800, maxHeight = 800, quality = 0.6) {
  return Promise.all(files.map(f => compressImage(f, maxWidth, maxHeight, quality)));
}