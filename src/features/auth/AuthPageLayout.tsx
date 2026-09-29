import React from "react";
import backgroundUrl from "../../images/logo/bgScreen1.svg";

interface AuthPageLayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export default function AuthPageLayout({
  children,
  showLogo = true,
}: AuthPageLayoutProps) {
  React.useEffect(() => {
    const href = backgroundUrl;
    const existing = document.querySelector<HTMLLinkElement>('link[data-auth-preload="bg"]');
    if (existing) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.type = 'image/svg+xml';
    link.setAttribute('fetchpriority', 'high');
    link.setAttribute('data-auth-preload', 'bg');
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, []);

  const slogans = [
    "Precision Calibration, Trusted Results",
    "Excellence in Every Measurement",
    "Your Partner in Quality Assurance",
    "Accurate. Reliable. Certified.",
  ];

  const [currentSloganIndex, setCurrentSloganIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSloganIndex((prev) => (prev + 1) % slogans.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="relative min-h-screen flex"
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />

      {/* Right Side - Form - Instant render, no animations */}
      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-center px-4 py-12">
        <div className="min-w-0 w-full max-w-[calc(100vw-2rem)] md:max-w-md">{children}</div>
      </div>

      {/* Left Side - Branding */}
      {showLogo && (
        <div className="relative z-10 hidden lg:flex w-1/2 flex-col items-center justify-center px-8 text-center mr-10">
          
          {/* Slogan - no animation, instant display */}
          <div className="h-24 max-w-lg mr-10">
            <div className="text-3xl font-bold text-slate-800 sm:text-4xl leading-tight">
              {slogans[currentSloganIndex]}
            </div>
          </div>

          {/* Dots - simplified, no complex animations */}
          <div className="mt-10 flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full bg-blue-500/40"
                style={{
                  animation: `pulse 2s infinite ${i * 0.3}s`
                }}
              />
            ))}
          </div>

          <p className="mt-10 text-sm text-slate-600 max-w-md">
            Industry-leading precision calibration solutions for manufacturing excellence
          </p>
        </div>
      )}
    </div>
  );
}
