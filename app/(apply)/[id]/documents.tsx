// Filing the documents the checklist asks for, from the camera or the
// phone's files. A required document that is not filed blocks submission;
// the review step says which.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActionSheetIOS, Platform, StyleSheet, Text, View } from 'react-native';
import { ApiError, type ApplicationDocument } from '@/api';
import { useApplication } from '@/hooks/queries';
import { pickFile, pickFromCamera, pickFromLibrary, useUpload, type PickedFile } from '@/hooks/useUpload';
import { chooseOption } from '@/lib/dialog';
import { statusLabel } from '@/lib/format';
import { Badge, Banner, Body, Button, Card, Empty, Loading, Screen, Spacer, Title } from '@/ui';
import { spacing, type } from '@/ui/theme';

function tone(status: ApplicationDocument['status']) {
  switch (status) {
    case 'filed':
    case 'verified':
      return 'success' as const;
    case 'rejected':
      return 'danger' as const;
    case 'pending':
      return 'info' as const;
    default:
      return 'warning' as const;
  }
}

export default function Documents() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const application = useApplication(id);
  const upload = useUpload(id);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (application.isLoading) return <Loading />;
  const app = application.data;
  if (!app) return <Empty title="That application no longer exists" />;

  async function send(doc: ApplicationDocument, pick: () => Promise<PickedFile | null>) {
    setProblem(null);
    let file: PickedFile | null;
    try {
      file = await pick();
    } catch {
      setProblem('Could not open that. Try another way.');
      return;
    }
    if (!file) return;
    setBusyItem(doc.checklistItemId);
    try {
      await upload.mutateAsync({ checklistItemId: doc.checklistItemId, file });
    } catch (e) {
      setProblem(e instanceof ApiError ? e.userMessage : (e as Error).message);
    } finally {
      setBusyItem(null);
    }
  }

  function choose(doc: ApplicationDocument) {
    const options =
      Platform.OS === 'web'
        ? [{ label: 'Choose a file', pick: pickFile }]
        : [
            { label: 'Take a photo', pick: pickFromCamera },
            { label: 'Choose a photo', pick: pickFromLibrary },
            { label: 'Choose a file (PDF)', pick: pickFile },
          ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options.map(o => o.label), 'Cancel'], cancelButtonIndex: options.length, title: doc.documentName },
        i => {
          if (i < options.length) send(doc, options[i].pick);
        }
      );
    } else {
      chooseOption(
        doc.documentName,
        'How would you like to add it?',
        options.map(o => ({ label: o.label, onPress: () => send(doc, o.pick) }))
      );
    }
  }

  const required = app.documents.filter(d => d.requirement === 'required');
  const missing = required.filter(d => !['filed', 'verified'].includes(d.status));

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button
            title="Review"
            onPress={() => router.push({ pathname: '/(apply)/[id]/review', params: { id: app.id } })}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <Text style={type.small}>{app.reference} · documents</Text>
      <Title>Documents</Title>
      <Body muted>A clear photo is fine. The signed form is done at the branch when you collect your card.</Body>
      <Spacer />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      {missing.length > 0 ? (
        <Banner tone="warning">
          {missing.length} required {missing.length === 1 ? 'document is' : 'documents are'} still missing.
        </Banner>
      ) : (
        <Banner tone="success">Everything required is filed.</Banner>
      )}
      {app.documents.map(doc => {
        const busy = busyItem === doc.checklistItemId;
        const filed = ['filed', 'verified'].includes(doc.status);
        return (
          <Card key={doc.checklistItemId}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={type.subheading}>{doc.documentName}</Text>
                <Text style={type.small}>{doc.requirement === 'required' ? 'Required' : 'Optional'}</Text>
              </View>
              <Badge tone={tone(doc.status)}>{busy ? 'Uploading' : statusLabel(doc.status)}</Badge>
            </View>
            {doc.fileName ? <Text style={[type.small, { marginTop: spacing.xs }]}>{doc.fileName}</Text> : null}
            {doc.status === 'rejected' && doc.rejectionReason ? (
              <Banner tone="danger" title="Not accepted">{doc.rejectionReason}</Banner>
            ) : null}
            <Spacer size="sm" />
            <Button
              title={filed ? 'Replace' : 'Add'}
              variant={filed ? 'secondary' : 'primary'}
              onPress={() => choose(doc)}
              loading={busy}
              disabled={busyItem !== null && !busy}
            />
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
