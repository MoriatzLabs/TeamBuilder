import { useAppStore } from "@/store/appStore";

export function HeroScreen() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const handleGetStarted = () => {
    setCurrentView("team-setup");
  };

  return (
    <div className="h-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col items-center text-center px-6 max-w-3xl relative z-10 gap-12">
        {/* Logo */}
        <img
          src="/images/C9.jpg"
          alt="Cloud9"
          className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover"
        />

        <div className="flex flex-col gap-4">
          {/* Welcome text */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight whitespace-nowrap">
            Welcome,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Inero
            </span>
            {" & "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-secondary">
              IWDominate
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-muted-foreground text-lg md:text-xl">
            Build winning compositions with our draft analysis and
            recommendations.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGetStarted}
          className="button-59 mt-12"
          role="button"
        >
          Start Building
        </button>
      </div>
    </div>
  );
}
