import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeIcon, UserIcon } from "@/components/ui/icons";
import UserMenu from "@/components/user-menu";
import { Redirect } from "wouter";

export default function AdminPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  
  // 非管理員重定向到首頁
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="bg-neutral-50 text-neutral-800 min-h-screen pb-16 md:pb-0 overflow-auto">
      {/* App Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-10 px-4 py-3 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold flex items-center text-neutral-800">
                <span className="text-primary-500">🍀</span> 三重分隊 / 
                <span className="text-primary-600 ml-1">{user?.name}</span>
              </h1>
              <h2 className="text-sm text-neutral-500 font-medium">管理介面</h2>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserIcon className="text-blue-500" />
            管理志工名單
          </h2>
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <HomeIcon className="h-4 w-4" />
              返回首頁
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">志工管理</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-600 mb-4">
              管理介面功能開發中，將提供以下功能：
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-700">
              <li>新增志工帳號</li>
              <li>查看所有志工資料</li>
              <li>編輯志工資料</li>
              <li>重置志工密碼</li>
              <li>設定管理員權限</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
