import { useColorScheme } from 'react-native';
import { Colors } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}