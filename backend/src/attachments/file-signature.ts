export interface DetectedFile {
  mimeType: string;
  extension: string;
}

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP = [0x50, 0x4b, 0x03, 0x04];

const startsWith = (buffer: Buffer, signature: number[]): boolean =>
  buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte);

export function detectAllowedFile(buffer: Buffer): DetectedFile | null {
  if (startsWith(buffer, JPEG)) return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (startsWith(buffer, PNG)) return { mimeType: 'image/png', extension: 'png' };
  if (startsWith(buffer, PDF)) return { mimeType: 'application/pdf', extension: 'pdf' };
  // Имена файлов внутри ZIP не сжимаются, поэтому документ Word отличается от архива по пути word/.
  if (startsWith(buffer, ZIP) && buffer.includes('word/document.xml')) {
    return {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
    };
  }
  return null;
}
