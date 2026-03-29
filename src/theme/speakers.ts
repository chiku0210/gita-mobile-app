export const SPEAKER_IMAGES: Record<string, any> = {
  krishna:       require('../../assets/speakers/krishna.png'),
  arjuna:        require('../../assets/speakers/arjuna.png'),
  sanjaya:       require('../../assets/speakers/sanjaya.png'),
  dhritarashtra: require('../../assets/speakers/dhritarashtra.png'),
};

export type Speaker = keyof typeof SPEAKER_IMAGES;

export const SPEAKER_LABELS: Record<string, string> = {
  krishna:       'Lord Krishna',
  arjuna:        'Arjuna',
  sanjaya:       'Sanjaya',
  dhritarashtra: 'Dhritarashtra',
};

const FALLBACK = require('../../assets/Gita-Image.png');


export function getSpeakerImage(speaker: string | null): any {
  return SPEAKER_IMAGES[speaker ?? 'krishna'] ?? FALLBACK;
}