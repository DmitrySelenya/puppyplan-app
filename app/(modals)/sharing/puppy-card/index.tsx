import { useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';

import {
  ShareablePuppyCardScreen,
  type ShareablePuppyCardReviewState,
} from '@/features/more/screens/ShareablePuppyCardScreen';
import { useAppTranslation } from '@/lib/i18n';

export default function ShareablePuppyCardRoute() {
  const { t } = useAppTranslation();
  const [reviewState, setReviewState] = useState<ShareablePuppyCardReviewState | undefined>();
  const puppyName = t('sharing.card-management.sample-puppy-name');
  const shareTitle = t('sharing.card-builder.screen-title', { puppyName });

  return (
    <ShareablePuppyCardScreen
      onBack={() => {
        router.back();
      }}
      onShare={async () => {
        setReviewState('pending-write');

        try {
          await Share.share({
            message: [
              shareTitle,
              t('sharing.card-builder.footer-note'),
              t('sharing.card-preview.footer'),
            ].join('\n'),
            title: shareTitle,
          });
          setReviewState('share-options');
        } catch {
          setReviewState('error');
        }
      }}
      puppyName={puppyName}
      reviewState={reviewState}
    />
  );
}
