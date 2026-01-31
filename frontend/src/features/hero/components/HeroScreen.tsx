import { useAppStore } from "@/store/appStore";

export function HeroScreen() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const handleGetStarted = () => {
    setCurrentView("team-setup");
  };

  return (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center space-y-8 px-6 max-w-4xl">
        <div className="flex justify-center pb-8">
          <img
            src="/images/C9.jpg"
            alt="Cloud9"
            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Welcome Inero and IWDominate!
          </h1>
        </div>

        <div className="pt-16">
          <button
            onClick={handleGetStarted}
            className="text-white text-3xl md:text-4xl font-light tracking-wide hover:opacity-80 transition-opacity cursor-pointer"
          >
            Get Started ...
          </button>
        </div>
      </div>
    </div>
  );
}
