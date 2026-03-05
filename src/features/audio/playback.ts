import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Settings } from '../../types';
import { buildRemoteAudioUrl } from './constants';

const remotePlayer = createAudioPlayer(null, { keepAudioSessionActive: true });
let currentRemoteUri: string | null = null;

function stopRemotePlayer() {
  try {
    remotePlayer.pause();
    void remotePlayer.seekTo(0).catch(() => {
      // ignore
    });
  } catch {
    // ignore
  }
}

function speakWithTts(text: string, settings: Settings) {
  const value = String(text ?? '').trim();
  if (!value) return;
  stopRemotePlayer();
  Speech.stop();
  Speech.speak(value, {
    language: 'ja-JP',
    rate: settings.tts_rate,
    voice: settings.tts_voice ?? undefined,
  });
}

function playRemoteAudio(audioFile: string) {
  const uri = buildRemoteAudioUrl(audioFile);
  if (!uri) return false;
  try {
    if (currentRemoteUri !== uri) {
      remotePlayer.replace({ uri });
      currentRemoteUri = uri;
    } else {
      void remotePlayer.seekTo(0).catch(() => {
        // ignore
      });
    }
    Speech.stop();
    remotePlayer.play();
    return true;
  } catch {
    return false;
  }
}

export function stopPronunciationPlayback() {
  Speech.stop();
  stopRemotePlayer();
}

export function playPronunciation(params: {
  text: string;
  settings: Settings;
  remoteAudioFile?: string | null;
}) {
  const text = String(params.text ?? '').trim();
  const remoteAudioFile = String(params.remoteAudioFile ?? '').trim();
  if (params.settings.pronunciation_source === 'remote') {
    if (remoteAudioFile) {
      playRemoteAudio(remoteAudioFile);
    }
    return;
  }
  speakWithTts(text, params.settings);
}
