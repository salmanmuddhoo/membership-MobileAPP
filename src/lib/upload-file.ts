// What the phone must know about a file before it asks for an upload ticket.
//
// The server validates size and content type (validateUploadRequest in the
// web repository) and refuses anything outside them. Two of its rules are
// easy to trip from a phone by accident rather than by choice:
//
//   - A size of zero. Both pickers report the size as optional, and
//     expo-image-picker in particular leaves fileSize undefined for a photo
//     taken with the camera on Android. Passing that on as 0 earns
//     "Files must be between 1 byte and 25 MB" for a perfectly good photo.
//   - A content type the picker could not name. expo-document-picker
//     returns undefined for mimeType often enough that a fallback is
//     needed, and application/octet-stream is not on the server's list, so
//     the fallback itself is what gets refused.
//
// Both are answerable on the device: the file system knows the real size,
// and the extension names the type well enough for the five types the
// server accepts. Doing it here also means the person is told what is
// wrong before a round trip rather than after one.

// Mirrors ALLOWED_CONTENT_TYPES on the server. Kept as a literal rather
// than fetched: it changes with a deploy of the web application, and a
// phone holding a stale copy would refuse a file the server would take —
// so the server stays the authority and this is only the early word.
export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heic',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * The content type to send, preferring what the picker said when it is one
 * the server accepts and falling back to the file's extension. Returns null
 * when neither names an accepted type — the caller then has something
 * specific to tell the person rather than a refusal from the server.
 */
export function contentTypeFor(
  fileName: string,
  pickerMimeType: string | undefined | null
): string | null {
  const accepted = ACCEPTED_TYPES as readonly string[];
  const claimed = (pickerMimeType ?? '').toLowerCase().split(';')[0].trim();
  // image/jpg is not a real type but pickers emit it.
  const normalised = claimed === 'image/jpg' ? 'image/jpeg' : claimed;
  if (accepted.includes(normalised)) return normalised;
  const byExtension = BY_EXTENSION[extensionOf(fileName)];
  return byExtension ?? null;
}

/**
 * The size to declare at begin-upload: what the file on disk actually
 * measures, never what the picker said about it.
 *
 * These disagree, and not only when the picker says nothing. Asked for a
 * photo at quality 0.8, expo-image-picker re-encodes it and hands back a
 * URI pointing at the compressed copy — while fileSize still describes the
 * original asset. Declaring that and then sending the copy is a real size
 * mismatch: begin-upload records one number, SharePoint receives another,
 * and commit-upload refuses the pair as a truncated transfer ("The uploaded
 * file is incomplete"). A PDF is not re-encoded, which is why files worked
 * and photos did not.
 *
 * The file at the URI is the one whose bytes are about to be sent, so its
 * size is the only number that can be right. The picker's is a fallback for
 * when the file system cannot open the URI at all.
 */
export function sizeToDeclare(
  measured: number | null,
  pickerSize: number | undefined | null
): number {
  if (measured !== null && measured > 0) return measured;
  return pickerSize ?? 0;
}

export interface FileProblem {
  message: string;
}

/**
 * Whether this file can be filed at all, in the words the person should
 * read. Null when it is fine to send.
 */
export function problemWith(file: {
  name: string;
  size: number;
  contentType: string | null;
}): FileProblem | null {
  if (!file.contentType) {
    return { message: 'That file type cannot be filed. Use a photo or a PDF.' };
  }
  if (file.size <= 0) {
    return {
      message: 'That file seems to be empty. Try taking the photo again.',
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round((file.size / 1024 / 1024) * 10) / 10;
    return {
      message: `That file is ${mb} MB. The largest that can be filed is ${
        MAX_UPLOAD_BYTES / 1024 / 1024
      } MB.`,
    };
  }
  return null;
}
