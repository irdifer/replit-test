import { useLocation } from "wouter";
import { HomeIcon, ChartIcon, SettingsIcon } from "./ui/icons";

export default function MobileNavigation() {
  const [location, setLocation] = useLocation();

  const navigateToPath = (path: string) => {
    setLocation(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-2 md:hidden">
      <div className="grid grid-cols-3 gap-1">
        <button 
          className={`flex flex-col items-center py-1 px-2 ${location === '/' ? 'text-primary-500' : 'text-neutral-500'}`}
          onClick={() => navigateToPath('/')}
        >
          <HomeIcon />
          <span className="text-xs mt-1">首頁</span>
        </button>
        
        <button 
          className={`flex flex-col items-center py-1 px-2 ${location === '/stats' ? 'text-primary-500' : 'text-neutral-500'}`}
          onClick={() => navigateToPath('/stats')}
        >
          <ChartIcon />
          <span className="text-xs mt-1">統計</span>
        </button>
        
        <button 
          className={`flex flex-col items-center py-1 px-2 ${location === '/settings' ? 'text-primary-500' : 'text-neutral-500'}`}
          onClick={() => navigateToPath('/settings')}
        >
          <SettingsIcon />
          <span className="text-xs mt-1">設定</span>
        </button>
      </div>
    </nav>
  );
}
