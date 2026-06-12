type ModalRouter = Readonly<{
  back: () => void;
  canGoBack?: () => boolean;
  replace: (href: '/today') => void;
}>;

export function closeModalRoute(router: ModalRouter) {
  if (router.canGoBack?.() === true) {
    router.back();
    return;
  }

  router.replace('/today');
}
