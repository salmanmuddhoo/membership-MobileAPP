// Filing a document against an application: pick or photograph it, ask the
// API for an upload ticket, send the bytes to the scoped URL, then commit —
// the same brokered upload the officer's screen does (docs/documents.md in
// the web repository). Between begin and commit the checklist reads
// "Uploading"; a phone that loses signal halfway leaves nothing that looks
// filed.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { api, API_MODE } from '../api';
import { useAuth } from '../auth/AuthContext';
import { contentTypeFor, problemWith } from '../lib/upload-file';
import { keys } from './queries';

export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

// What a picker reports about a file is not what the server is given.
// Neither picker guarantees a size — expo-image-picker leaves fileSize
// undefined for a camera photo on Android — and expo-document-picker often
// cannot name a type. Both were passed straight through, so a good photo
// arrived as 0 bytes and a PDF from Files arrived as
// application/octet-stream, and the server refused each on its own terms.
// The file system knows the real size and the extension names the type, so
// settle both here, from the one place every picker goes through.
function describe(
  uri: string,
  name: string,
  pickerMimeType: string | undefined | null,
  pickerSize: number | undefined | null
): PickedFile {
  let size = pickerSize ?? 0;
  if (size <= 0) {
    try {
      size = new File(uri).size;
    } catch {
      // A URI the file system cannot open (a web blob: URL, say). Leave the
      // size as the picker gave it; problemWith has the last word.
      size = pickerSize ?? 0;
    }
  }
  return { uri, name, size, mimeType: contentTypeFor(name, pickerMimeType) ?? '' };
}

export async function pickFromCamera(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return describe(a.uri, a.fileName ?? `photo-${Date.now()}.jpg`, a.mimeType, a.fileSize);
}

export async function pickFromLibrary(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return describe(a.uri, a.fileName ?? `image-${Date.now()}.jpg`, a.mimeType, a.fileSize);
}

export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return describe(a.uri, a.name, a.mimeType, a.size);
}

async function putBytes(uploadUrl: string, file: PickedFile): Promise<void> {
  if (API_MODE === 'mock' || uploadUrl.startsWith('mock://')) return;
  // The file itself is a Blob (expo-file-system), so it goes to fetch
  // directly. Reading it through fetch(file.uri).blob() first, as this did,
  // depends on the runtime resolving a file:// URI — which is exactly the
  // part that is not dependable on Android.
  const body = new File(file.uri);
  const total = body.size;
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      // Inclusive, and Graph refuses a range that disagrees with the body —
      // which is what makes a retry safe rather than corrupting the file.
      // No content-length: it is a forbidden header, set from the body by
      // whichever layer sends it, and a hand-written one that disagrees is
      // another way to be refused.
      'content-range': `bytes 0-${Math.max(total - 1, 0)}/${total}`,
    },
    body: body as unknown as BodyInit,
  });
  // 202 is "accepted, send the next range" and 200/201 "that completed the
  // file"; a single PUT of the whole file ends on 200 or 201.
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `The file did not arrive (${response.status}). Try again.${
        detail ? ` ${detail.slice(0, 200)}` : ''
      }`
    );
  }
}

export function useUpload(applicationId: string) {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ checklistItemId, file }: { checklistItemId: string; file: PickedFile }) =>
      withToken(async token => {
        // Said here rather than after a round trip: the server refuses the
        // same two things, but only once the person has waited for it to.
        const problem = problemWith({
          name: file.name,
          size: file.size,
          contentType: file.mimeType || null,
        });
        if (problem) throw new Error(problem.message);
        const ticket = await api.beginUpload(token, applicationId, {
          checklistItemId,
          fileName: file.name,
          sizeBytes: file.size,
          contentType: file.mimeType,
        });
        await putBytes(ticket.uploadUrl, file);
        return api.commitUpload(token, applicationId, ticket.uploadId);
      }),
    onSuccess: app => qc.setQueryData(keys.application(app.id), app),
  });
}
