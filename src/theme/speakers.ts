// Speaker image assets — drop matching JPGs into assets/speakers/
export const SPEAKER_IMAGES: Record<string, any> = {
  krishna:       require('../../assets/speakers/krishna.jpg'),
  arjuna:        require('../../assets/speakers/arjuna.jpg'),
  sanjaya:       require('../../assets/speakers/sanjaya.jpg'),
  dhritarashtra: require('../../assets/speakers/dhritarashtra.jpg'),
};

export type Speaker = keyof typeof SPEAKER_IMAGES;

export const SPEAKER_LABELS: Record<string, string> = {
  krishna:       'Lord Krishna',
  arjuna:        'Arjuna',
  sanjaya:       'Sanjaya',
  dhritarashtra: 'Dhritarashtra',
};
