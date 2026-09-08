// The two ways a phone trips the server's upload rules by accident.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contentTypeFor,
  problemWith,
  MAX_UPLOAD_BYTES,
} from '../src/lib/upload-file.ts';

test('takes the picker at its word when it names a type the server accepts', () => {
  assert.equal(contentTypeFor('scan.pdf', 'application/pdf'), 'application/pdf');
  assert.equal(contentTypeFor('photo.jpg', 'image/jpeg'), 'image/jpeg');
  assert.equal(contentTypeFor('shot.HEIC', 'image/heic'), 'image/heic');
});

test('falls back to the extension when the picker says nothing useful', () => {
  // expo-document-picker leaves mimeType undefined often enough that the
  // app had been sending application/octet-stream, which the server does
  // not accept — so a PDF chosen from Files was refused for being a PDF.
  assert.equal(contentTypeFor('nid.pdf', undefined), 'application/pdf');
  assert.equal(
    contentTypeFor('nid.pdf', 'application/octet-stream'),
    'application/pdf'
  );
  assert.equal(contentTypeFor('photo-1728.jpg', null), 'image/jpeg');
  assert.equal(contentTypeFor('IMG_0042.HEIC', ''), 'image/heic');
});

test('normalises the types pickers get slightly wrong', () => {
  assert.equal(contentTypeFor('a.jpg', 'image/jpg'), 'image/jpeg');
  assert.equal(contentTypeFor('a.jpg', 'IMAGE/JPEG'), 'image/jpeg');
  assert.equal(contentTypeFor('a.pdf', 'application/pdf; charset=binary'), 'application/pdf');
});

test('names nothing for a type neither the picker nor the extension places', () => {
  assert.equal(contentTypeFor('notes.docx', 'application/msword'), null);
  assert.equal(contentTypeFor('noextension', undefined), null);
});

test('a file with no type it can send is refused before the round trip', () => {
  assert.deepEqual(problemWith({ name: 'a.docx', size: 100, contentType: null }), {
    message: 'That file type cannot be filed. Use a photo or a PDF.',
  });
});

test('a size of zero is refused as empty, not sent as zero', () => {
  // expo-image-picker leaves fileSize undefined for a camera photo on
  // Android. Sent on as 0 the server answers "Files must be between 1 byte
  // and 25 MB" about a photo that is perfectly good — so the app measures
  // the file itself, and only a genuinely empty one reaches this.
  const problem = problemWith({ name: 'p.jpg', size: 0, contentType: 'image/jpeg' });
  assert.match(problem?.message ?? '', /empty/);
});

test('the size ceiling is the server, said in megabytes', () => {
  assert.equal(
    problemWith({ name: 'p.jpg', size: MAX_UPLOAD_BYTES, contentType: 'image/jpeg' }),
    null
  );
  const problem = problemWith({
    name: 'p.jpg',
    size: MAX_UPLOAD_BYTES + 1024 * 1024,
    contentType: 'image/jpeg',
  });
  assert.match(problem?.message ?? '', /26 MB.*25 MB/);
});

test('an ordinary photo passes', () => {
  assert.equal(
    problemWith({ name: 'p.jpg', size: 2_400_000, contentType: 'image/jpeg' }),
    null
  );
});
