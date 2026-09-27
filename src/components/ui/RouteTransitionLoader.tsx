import { useNavigation } from "../../context/NavigationContext";

/**
 * RouteTransitionLoader - Smart gradient loader for route transitions
 * 
 * Features:
 * - Only shows during real loading (not cached routes)
 * - Smooth gradient animation
 * - Top progress bar (like YouTube/GitHub)
 * - Minimal flicker prevention (250ms minimum)
 * - Auto-stops after 3s to prevent stuck states
 */
export const RouteTransitionLoader: React.FC = () => {
  const { isLoading } = useNavigation();

  if (!isLoading) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden bg-slate-200/70">
        <div className="route-loader-bar h-full w-2/5 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="route-loader-shimmer h-full w-28 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      </div>
      <div className="fixed inset-0 z-[9998] bg-white/3 pointer-events-none" />
    </>
  );
};

export default RouteTransitionLoader;
