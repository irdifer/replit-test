import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SettingsIcon, LogoutIcon, ChartIcon, UserIcon } from "@/components/ui/icons";
import { Link } from "wouter";

const UserMenu = () => {
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleClickOutside = () => {
    setIsOpen(false);
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="relative">
      <button 
        className="p-2 rounded-full hover:bg-neutral-100 flex items-center justify-center"
        aria-label="個人資料"
        onClick={toggleMenu}
      >
        <div className="h-8 w-8 bg-neutral-300 rounded-full flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-neutral-700" />
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={handleClickOutside}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
            <div className="py-1">
              {isAdmin && (
                <Link href="/admin" className="group flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                  <UserIcon className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-neutral-600" />
                  管理名單
                </Link>
              )}
              <Link href="/settings" className="group flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                <SettingsIcon className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-neutral-600" />
                設定
              </Link>
              <Link href="/stats" className="group flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
                <ChartIcon className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-neutral-600" />
                統計
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full text-left group flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 border-t border-neutral-200"
              >
                <LogoutIcon className="mr-3 h-5 w-5 text-neutral-500 group-hover:text-neutral-600" />
                登出
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
