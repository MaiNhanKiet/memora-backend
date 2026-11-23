import type { SoundwaveContentType } from '@app/contracts';

const ascii = (bytes: Uint8Array, offset: number, text: string): boolean =>
  bytes.byteLength >= offset + text.length &&
  [...text].every(
    (char, index) => bytes[offset + index] === char.charCodeAt(0),
  );

/**
 * True when the first bytes match the declared container:
 * WAV 'RIFF'....'WAVE'; MP3 'ID3' tag or an MPEG frame sync (0xFFE); MP4/M4A 'ftyp' at
 * offset 4; AAC ADTS sync (0xFFF). Only a cheap sniff: PERSO-013 decodes the real audio.
 */
export function matchesAudioMagicBytes(
  contentType: SoundwaveContentType,
  bytes: Uint8Array,
): boolean {
  switch (contentType) {
    case 'audio/wav':
      return ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WAVE');
    case 'audio/mpeg':
      return (
        ascii(bytes, 0, 'ID3') ||
        (bytes.byteLength >= 2 &&
          bytes[0] === 0xff &&
          (bytes[1] & 0xe0) === 0xe0)
      );
    case 'audio/mp4':
      return ascii(bytes, 4, 'ftyp');
    case 'audio/aac':
      return (
        bytes.byteLength >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0
      );
  }
}
