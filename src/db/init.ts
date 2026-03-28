import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'gita.db';
const DB_DEST = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

export async function initDatabase(): Promise<void> {
  // Check if already copied
  const info = await FileSystem.getInfoAsync(DB_DEST);
  if (info.exists) return;

  // Ensure SQLite directory exists
  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}SQLite`,
    { intermediates: true }
  );

  // Load bundled asset
  const asset = Asset.fromModule(require('../../assets/gita.db'));
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error('gita.db asset failed to load');
  }

  // Copy to writable location
  await FileSystem.copyAsync({
    from: asset.localUri,
    to: DB_DEST,
  });

  console.log('gita.db copied to writable storage');
}