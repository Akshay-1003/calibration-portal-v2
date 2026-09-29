const routeChunkLoaders: Record<string, () => Promise<unknown>> = {
  '/login': () => import('../features/auth/SignIn'),
  '/signin': () => import('../features/auth/SignIn'),
  '/signup': () => import('../features/auth/SignUp'),
  '/forgot-password': () => import('../features/auth/ForgotPassword'),
  '/reset-password': () => import('../features/auth/ResetPassword'),
  '/': () => import('../pages/Dashboard/Home'),
  '/dashboard': () => import('../pages/Dashboard/Home'),
  '/transactions/inward': () => import('../pages/transactions/Inward/page'),
  '/transactions/inward/register-gauge': () => import('../pages/transactions/Inward/register-gauge'),
  '/transactions/calibration/inwards': () => import('../pages/transactions/calibration/inwards/page'),
  '/transactions/calibration': () => import('../pages/transactions/calibration/page'),
  '/transactions/calibration-certificate': () => import('../pages/transactions/calibration-certificate/page'),
  '/transactions/outward': () => import('../pages/transactions/Outward/page'),
  '/masters/party-master': () => import('../pages/masters/PartyMaster/page'),
  '/masters/gauges-master': () => import('../pages/masters/GaugesMaster/page'),
  '/masters/equipment-master': () => import('../pages/masters/EquipmentMaster/page'),
  '/masters/equipment-history': () => import('../pages/masters/EquipmentHistory/page'),
  '/masters/scope-master': () => import('../pages/masters/ScopeMaster/page'),
  '/masters/thread-ring-plug': () => import('../pages/masters/ThreadRingPlug/page'),
  '/masters/taper-thread-readings': () => import('../pages/masters/TaperThreadReadings/page'),
  '/masters/surface-plate-master': () => import('../pages/masters/SurfacePlateMaster/page'),
  '/masters/surface-plate-master/create': () => import('../pages/masters/SurfacePlateMaster/create'),
  '/masters/surface-plate-master/edit': () => import('../pages/masters/SurfacePlateMaster/edit'),
  '/masters/reading-master': () => import('../pages/masters/ReadingMaster/page'),
  '/masters/dial-table-master': () => import('../pages/masters/DialTableMaster/page'),
  '/maintenance': () => import('../pages/maintenance/page'),
  '/maintenance/repair-master': () => import('../pages/maintenance/repair-master/page'),
  '/billing/invoice': () => import('../pages/billing/invoice/page'),
  '/billing/quotation': () => import('../pages/billing/quotation/page'),
};

const prefetchedRoutes = new Set<string>();

const normalizePath = (path: string): string => (path === '/' ? '/dashboard' : path);

const resolveLoader = (path: string): (() => Promise<unknown>) | undefined => {
  const normalizedPath = normalizePath(path);
  return (
    routeChunkLoaders[path] ??
    routeChunkLoaders[normalizedPath] ??
    Object.entries(routeChunkLoaders)
      .filter(([key]) => key !== '/dashboard')
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => normalizedPath.startsWith(key))?.[1]
  );
};

export const prefetchRoute = async (path: string): Promise<void> => {
  const normalizedPath = normalizePath(path);
  if (prefetchedRoutes.has(normalizedPath)) return;

  const loader = resolveLoader(path);
  if (!loader) return;

  prefetchedRoutes.add(normalizedPath);
  try {
    await loader();
  } catch {
    prefetchedRoutes.delete(normalizedPath);
  }
};

export const prefetchRoutes = async (paths: string[]): Promise<void> => {
  await Promise.allSettled(paths.map((path) => prefetchRoute(path)));
};

const criticalRoutes = [
  '/dashboard',
  '/transactions/inward',
  '/transactions/inward/register-gauge',
  '/transactions/calibration/inwards',
  '/transactions/calibration-certificate',
  '/masters/party-master',
];

export const prefetchCriticalRoutes = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    await prefetchRoutes(criticalRoutes);
    return;
  }

  await new Promise<void>((resolve) => {
    const run = () => {
      void prefetchRoutes(criticalRoutes).finally(resolve);
    };

    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback(run, { timeout: 1500 });
      return;
    }

    globalThis.setTimeout(run, 200);
  });
};

export const scheduleIdlePrefetch = (paths: string[]): void => {
  if (typeof window === 'undefined') return;

  const run = () => {
    void prefetchRoutes(paths);
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(run, { timeout: 1500 });
    return;
  }

  globalThis.setTimeout(run, 200);
};
