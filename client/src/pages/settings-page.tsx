import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeIcon, SettingsIcon } from "@/components/ui/icons";
import UserMenu from "@/components/user-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");

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
              <h2 className="text-sm text-neutral-500 font-medium">基本設定</h2>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon className="text-blue-500" />
            個人設定
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
            <CardTitle className="text-lg">基本資料</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input 
                    id="name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="請輸入姓名"
                    readOnly
                    className="bg-neutral-50"
                  />
                  <p className="text-xs text-neutral-500">姓名由管理員設定，無法自行修改</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">用戶名</Label>
                  <Input 
                    id="username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="請輸入用戶名"
                    readOnly
                    className="bg-neutral-50"
                  />
                  <p className="text-xs text-neutral-500">用戶名由管理員設定，無法自行修改</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">密碼修改</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="請輸入新密碼"
                  />
                  <Input 
                    id="confirm-password" 
                    type="password"
                    placeholder="請再次輸入新密碼"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button disabled>更改密碼</Button>
                </div>
                <p className="text-xs text-neutral-500">密碼修改功能正在開發中，敬請期待</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
