// Filing a document against an application: pick or photograph it, ask the
// API for an upload ticket, send the bytes to the scoped URL, then commit —
// the same brokered upload the officer's screen does (docs/documents.md in
// the web repository). Between begin and commit the checklist reads
// "Uploading"; a phone that loses signal halfway leaves nothing that looks
// filed.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { api, API_MODE } from '../api';
import { useAuth } from '../auth/AuthContext';
import { keys } from './queries';

export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export async function pickFromCamera(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? `photo-${Date.now()}.jpg`,
    size: a.fileSize ?? 0,
    mimeType: a.mimeType ?? 'image/jpeg',
  };
}

export async function pickFromLibrary(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? `image-${Date.now()}.jpg`,
    size: a.fileSize ?? 0,
    mimeType: a.mimeType ?? 'image/jpeg',
  };
}

export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name, size: a.size ?? 0, mimeType: a.mimeType ?? 'application/octet-stream' };
}

async function putBytes(uploadUrl: string, file: PickedFile): Promise<void> {
  if (API_MODE === 'mock' || uploadUrl.startsWith('mock://')) return;
  const blob = await (await fetch(file.uri)).blob();
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'content-type': file.mimeType,
      'content-length': String(blob.size),
      // Graph upload sessions want the range for a single-shot PUT.
      'content-range': `bytes 0-${Math.max(blob.size - 1, 0)}/${blob.size}`,
    },
    body: blob,
  });
  if (!response.ok) throw new Error('The file did not arrive. Try again.');
}

export function useUpload(applicationId: string) {
  const { withToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ checklistItemId, file }: { checklistItemId: string; file: PickedFile }) =>
      withToken(async token => {
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
