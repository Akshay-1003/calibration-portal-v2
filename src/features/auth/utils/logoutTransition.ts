import { prefetchRoute } from '../../../services/routePrefetch';

type NavigateFunction = (to: string, options?: { replace?: boolean }) => void;
type StartLoadingFunction = (path?: string) => void;

type ViewTransitionController = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    updateCallback: () => void | Promise<void>
  ) => ViewTransitionController;
};

interface LogoutTransitionOptions {
  logout: () => Promise<void>;
  navigate: NavigateFunction;
  startLoading: StartLoadingFunction;
  targetPath?: string;
}

const DEFAULT_LOGOUT_PATH = '/login';

export async function performLogoutTransition({
  logout,
  navigate,
  startLoading,
  targetPath = DEFAULT_LOGOUT_PATH,
}: LogoutTransitionOptions): Promise<void> {
  void prefetchRoute(targetPath);
  startLoading(targetPath);

  if (typeof document === 'undefined') {
    await logout();
    navigate(targetPath, { replace: true });
    return;
  }

  const viewTransitionDocument = document as ViewTransitionDocument;
  const root = document.documentElement;

  if (typeof viewTransitionDocument.startViewTransition === 'function') {
    root.setAttribute('data-route-transition', 'logout');

    const transition = viewTransitionDocument.startViewTransition(async () => {
      await logout();
      navigate(targetPath, { replace: true });
    });

    await transition.finished.finally(() => {
      root.removeAttribute('data-route-transition');
    });
    return;
  }

  await logout();
  navigate(targetPath, { replace: true });
}
