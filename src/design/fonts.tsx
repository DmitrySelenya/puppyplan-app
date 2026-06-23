import { useFonts } from 'expo-font';
import {
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import {
  Nunito_400Regular,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { useEffect, type PropsWithChildren } from 'react';

import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';

export type DesignFontState = Readonly<{
  error: Error | null;
  loaded: boolean;
}>;

type DesignFontGateProps = PropsWithChildren<{
  observability?: ObservabilityReporter;
  useDesignFontsForTest?: () => DesignFontState;
}>;

export const designFontFamilies = {
  display: {
    medium: 'Lora_500Medium',
    semibold: 'Lora_600SemiBold',
  },
  text: {
    bold: 'Nunito_700Bold',
    regular: 'Nunito_400Regular',
  },
} as const;

const DESIGN_FONT_MAP = {
  [designFontFamilies.display.medium]: Lora_500Medium,
  [designFontFamilies.display.semibold]: Lora_600SemiBold,
  [designFontFamilies.text.regular]: Nunito_400Regular,
  [designFontFamilies.text.bold]: Nunito_700Bold,
};
const designFontObservability = createObservabilityReporter();

export function useDesignFonts(): DesignFontState {
  const [loaded, error] = useFonts(DESIGN_FONT_MAP);

  return {
    error: error ?? null,
    loaded: loaded || Boolean(error),
  };
}

export function DesignFontGate({
  children,
  observability,
  useDesignFontsForTest,
}: DesignFontGateProps) {
  const { error, loaded } = (useDesignFontsForTest ?? useDesignFonts)();
  const reporter = observability ?? designFontObservability;

  useEffect(() => {
    if (error === null) {
      return;
    }

    reporter.captureException(error, {
      area: 'design',
      operation: 'load_fonts',
      tags: {
        font_family_display: 'Lora',
        font_family_text: 'Nunito',
      },
    });
  }, [error, reporter]);

  if (!loaded) {
    return null;
  }

  return <>{children}</>;
}
