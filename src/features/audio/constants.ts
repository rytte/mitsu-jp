export const REMOTE_AUDIO_BASE_URL = 'https://rytte.ink/audio';

function encodePathSegment(segment: string) {
  if (!segment) return '';
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

export function buildRemoteAudioUrl(audioFile: string): string | null {
  const value = String(audioFile ?? '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodePathSegment(segment))
    .join('/');
  if (!normalizedPath) return null;
  return `${REMOTE_AUDIO_BASE_URL.replace(/\/+$/, '')}/${normalizedPath}`;
}
