type ModalRouter = Readonly<{
  back: () => void;
  canGoBack?: () => boolean;
  replace: (href: '/diary') => void;
}>;

export function closeModalRoute(router: ModalRouter) {
  if (router.canGoBack?.() === true) {
    router.back();
    return;
  }

  router.replace('/diary');
}
