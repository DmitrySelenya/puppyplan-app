import * as Clipboard from 'expo-clipboard';

export async function copyTextToClipboard(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}
