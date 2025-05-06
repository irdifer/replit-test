import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeIcon, ChartIcon } from "@/components/ui/icons";
import UserMenu from "@/components/user-menu";

export default function StatsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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
              <h2 className="text-sm text-neutral-500 font-medium">統計資料</h2>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ChartIcon className="text-blue-500" />
            統計資料
          </h2>
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <HomeIcon className="h-4 w-4" />
              返回首頁
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">月度協勤統計</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                此功能正在開發中，敬請期待。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">救護案件統計</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                此功能正在開發中，敬請期待。
              </p>
            </CardContent>
          </Card>
        </div>

        {isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">管理員統計資料</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600">
                管理員可以查看所有志工的協勤統計與救護案件。此功能正在開發中，敬請期待。
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
