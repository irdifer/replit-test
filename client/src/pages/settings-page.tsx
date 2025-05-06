import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeIcon, SettingsIcon } from "@/components/ui/icons";
import UserMenu from "@/components/user-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // 用戶信息更新的 mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { username?: string; currentPassword?: string; newPassword?: string }) => {
      const response = await apiRequest("PATCH", "/api/user", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新失敗");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "更新成功",
        description: "您的用戶信息已成功更新",
      });
      // 清空密碼字段
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // 刷新用戶數據
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "更新失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
                    readOnly={user?.role !== "admin"}
                    className={user?.role !== "admin" ? "bg-neutral-50" : ""}
                  />
                  <p className="text-xs text-neutral-500">
                    {user?.role === "admin" 
                      ? "用戶名用於登入系統，請使用英文字母和數字" 
                      : "用戶名由管理員設定，無法自行修改"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="current-password">當前密碼</Label>
                <Input 
                  id="current-password" 
                  type="password"
                  placeholder="請輸入當前密碼"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">新密碼</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    id="new-password" 
                    type="password"
                    placeholder="請輸入新密碼"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input 
                    id="confirm-password" 
                    type="password"
                    placeholder="請再次輸入新密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-neutral-500">密碼長度應至少為6個字符</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                {user?.role === "admin" && (
                  <Button
                    onClick={() => {
                      if (username !== user?.username) {
                        updateUserMutation.mutate({ username });
                      } else {
                        toast({
                          title: "請注意",
                          description: "用戶名未變更",
                          variant: "default",
                        });
                      }
                    }}
                    disabled={updateUserMutation.isPending || username === user?.username || !username}
                    className="w-full"
                    variant="outline"
                  >
                    {updateUserMutation.isPending ? "處理中..." : "更新用戶名"}
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    if (!currentPassword) {
                      toast({
                        title: "請輸入當前密碼",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (!newPassword) {
                      toast({
                        title: "請輸入新密碼",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (newPassword.length < 6) {
                      toast({
                        title: "密碼太短",
                        description: "密碼長度應至少為6個字符",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (newPassword !== confirmPassword) {
                      toast({
                        title: "密碼不匹配",
                        description: "兩次輸入的新密碼不一致",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    updateUserMutation.mutate({ 
                      currentPassword, 
                      newPassword 
                    });
                  }}
                  disabled={updateUserMutation.isPending}
                  className="w-full"
                >
                  {updateUserMutation.isPending ? "處理中..." : "更新密碼"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
