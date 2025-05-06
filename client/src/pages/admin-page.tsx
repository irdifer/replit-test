import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeIcon, UserIcon, SaveIcon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import UserMenu from "@/components/user-menu";
import { Redirect } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Volunteer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface VolunteerFormData {
  name: string;
  position: string;
  isAdmin: boolean;
  teamType: string;
  username?: string;
  notes?: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer | null>(null);
  const [formData, setFormData] = useState<VolunteerFormData>({
    name: "",
    position: "隊員",
    isAdmin: false,
    teamType: "T1",
    username: "",
    notes: ""
  });
  
  // 非管理員重定向到首頁
  if (!isAdmin) {
    return <Redirect to="/" />;
  }
  
  // 獲取志工名單
  const { data: volunteers = [], isLoading, error, refetch: refetchVolunteers } = useQuery<Volunteer[]>({
    queryKey: ["/api/volunteers"],
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 每30秒自動重新獲取一次
  });
  
  // 新增志工
  const createVolunteerMutation = useMutation({
    mutationFn: async (data: VolunteerFormData) => {
      const res = await apiRequest("POST", "/api/volunteers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "新增成功",
        description: "已成功新增志工到名單中",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "新增失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 更新志工
  const updateVolunteerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VolunteerFormData> }) => {
      const res = await apiRequest("PATCH", `/api/volunteers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      setIsEditDialogOpen(false);
      setCurrentVolunteer(null);
      resetForm();
      toast({
        title: "更新成功",
        description: "已成功更新志工資料",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "更新失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 刪除志工
  const deleteVolunteerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/volunteers/${id}`);
    },
    onSuccess: () => {
      // 立即重新現取志工名單
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      queryClient.refetchQueries({ queryKey: ["/api/volunteers"] });
      toast({
        title: "刪除成功",
        description: "已成功刪除隊員",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "刪除失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // 重置表單
  const resetForm = () => {
    setFormData({
      name: "",
      position: "隊員",
      isAdmin: false,
      teamType: "T1",
      username: "",
      notes: ""
    });
  };
  
  // 編輯隊員
  const handleEdit = (volunteer: Volunteer) => {
    setCurrentVolunteer(volunteer);
    setFormData({
      name: volunteer.name,
      position: volunteer.position || "隊員",
      isAdmin: volunteer.isAdmin || false,
      teamType: volunteer.teamType || "T1",
      username: volunteer.username || "",
      notes: volunteer.notes || ""
    });
    setIsEditDialogOpen(true);
  };
  
  // 提交新增表單
  const handleAddSubmit = () => {
    if (!formData.name) {
      toast({
        title: "資料不完整",
        description: "姓名為必填項目",
        variant: "destructive",
      });
      return;
    }
    createVolunteerMutation.mutate(formData);
  };
  
  // 提交編輯表單
  const handleEditSubmit = () => {
    if (!currentVolunteer) return;
    if (!formData.name) {
      toast({
        title: "資料不完整",
        description: "姓名為必填項目",
        variant: "destructive",
      });
      return;
    }
    updateVolunteerMutation.mutate({ id: currentVolunteer.id, data: formData });
  };
  
  // 表單輸入變更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Switch 切換
  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isAdmin: checked }));
  };
  
  // Team Type 選擇變更
  const handleTeamTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, teamType: value }));
  };
  
  // Position 變更
  const handlePositionChange = (value: string) => {
    setFormData(prev => ({ ...prev, position: value }));
  };

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
            管理隊員名單
          </h2>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                toast({
                  title: "更新中",
                  description: "正在更新全部隊員的註冊狀態",
                });
                // 根據用戶名更新隊員註冊狀態
                volunteers.forEach(volunteer => {
                  // 有用戶名但沒有註冊標記的隊員設為已註冊
                  if (volunteer.username && !volunteer.isRegistered) {
                    updateVolunteerMutation.mutate({ 
                      id: volunteer.id, 
                      data: { isRegistered: true } 
                    });
                  }
                  // 沒有用戶名但標記為已註冊的隊員重設為未註冊
                  else if (!volunteer.username && volunteer.isRegistered) {
                    updateVolunteerMutation.mutate({ 
                      id: volunteer.id, 
                      data: { isRegistered: false } 
                    });
                  }
                });
                setTimeout(() => {
                  refetchVolunteers();
                }, 500);
              }}
              className="bg-green-600 hover:bg-green-700 text-white" 
              size="sm"
            >
              更新隊員狀態
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#58B2DC] hover:bg-[#4B99BD]" size="sm">
                  新增隊員
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新增隊員</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">姓名 <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">用戶名</Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username || ""}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teamType" className="text-right">隊員類型</Label>
                    <Select
                      value={formData.teamType || "T1"}
                      onValueChange={handleTeamTypeChange}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="選擇隊員類型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T1">T1</SelectItem>
                        <SelectItem value="T2">T2</SelectItem>
                        <SelectItem value="TP">TP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="position" className="text-right">職位</Label>
                    <Select
                      value={formData.position || "隊員"}
                      onValueChange={handlePositionChange}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="選擇職位" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="隊員">隊員</SelectItem>
                        <SelectItem value="小隊長">小隊長</SelectItem>
                        <SelectItem value="副分隊長">副分隊長</SelectItem>
                        <SelectItem value="分隊長">分隊長</SelectItem>
                        <SelectItem value="助理幹事">助理幹事</SelectItem>
                        <SelectItem value="隊員承辦人">隊員承辦人</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isAdmin" className="text-right">管理權限</Label>
                    <div className="col-span-3 flex items-center">
                      <Switch 
                        id="isAdmin"
                        checked={formData.isAdmin}
                        onCheckedChange={handleSwitchChange}
                      />
                      <span className="ml-2">{formData.isAdmin ? "是" : "否"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">備註</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAddSubmit} 
                    disabled={createVolunteerMutation.isPending}
                  >
                    {createVolunteerMutation.isPending ? "處理中..." : "新增"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <HomeIcon className="h-4 w-4" />
                返回首頁
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">隊員名單</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">載入中...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">載入失敗</div>
            ) : volunteers.length === 0 ? (
              <div className="text-center py-4 text-neutral-500">沒有隊員資料</div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>EMT等級</TableHead>
                      <TableHead>身分</TableHead>
                      <TableHead>管理權限</TableHead>
                      <TableHead>已註冊</TableHead>
                      <TableHead>用戶名</TableHead>
                      <TableHead>備註</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteers.map((volunteer) => (
                      <TableRow key={volunteer.id}>
                        <TableCell className="font-medium">{volunteer.name}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-800">
                            {volunteer.teamType || "T1"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-800">
                            {volunteer.position || "隊員"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${volunteer.isAdmin ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-800"}`}>
                            {volunteer.isAdmin ? "管理員" : "一般"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${volunteer.isRegistered || volunteer.username ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                            {volunteer.isRegistered || volunteer.username ? "已註冊" : "未註冊"}
                          </span>
                        </TableCell>
                        <TableCell>{volunteer.username || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={volunteer.notes || ""}>
                          {volunteer.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(volunteer)}
                            >
                              編輯
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                if (confirm(`確定要刪除 ${volunteer.name} 嗎？`)) {
                                  deleteVolunteerMutation.mutate(volunteer.id);
                                  // 強制立即重新獲取資料
                                  setTimeout(() => {
                                    refetchVolunteers();
                                  }, 300);
                                }
                              }}
                              disabled={deleteVolunteerMutation.isPending}
                            >
                              刪除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 編輯對話框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯隊員</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">姓名 <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">用戶名</Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={formData.username || ""}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-teamType" className="text-right">隊員類型</Label>
                <Select
                  value={formData.teamType || "T1"}
                  onValueChange={handleTeamTypeChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="選擇隊員類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T1">T1</SelectItem>
                    <SelectItem value="T2">T2</SelectItem>
                    <SelectItem value="TP">TP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-position" className="text-right">職位</Label>
                <Select
                  value={formData.position || "隊員"}
                  onValueChange={handlePositionChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="選擇職位" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="隊員">隊員</SelectItem>
                    <SelectItem value="小隊長">小隊長</SelectItem>
                    <SelectItem value="副分隊長">副分隊長</SelectItem>
                    <SelectItem value="分隊長">分隊長</SelectItem>
                    <SelectItem value="助理幹事">助理幹事</SelectItem>
                    <SelectItem value="隊員承辦人">隊員承辦人</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isAdmin" className="text-right">管理權限</Label>
                <div className="col-span-3 flex items-center">
                  <Switch 
                    id="edit-isAdmin"
                    checked={formData.isAdmin}
                    onCheckedChange={handleSwitchChange}
                  />
                  <span className="ml-2">{formData.isAdmin ? "是" : "否"}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isRegistered" className="text-right">註冊狀態</Label>
                <div className="col-span-3 flex items-center">
                  <Switch 
                    id="edit-isRegistered"
                    checked={currentVolunteer?.isRegistered || (currentVolunteer?.username ? true : false)}
                    onCheckedChange={(checked) => {
                      if (currentVolunteer) {
                        setCurrentVolunteer({...currentVolunteer, isRegistered: checked});
                      }
                    }}
                    disabled
                  />
                  <span className="ml-2">{currentVolunteer?.isRegistered || currentVolunteer?.username ? "已註冊" : "未註冊"}</span>
                  <span className="ml-2 text-neutral-500 text-xs">(自動更新)</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">備註</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  value={formData.notes || ""}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleEditSubmit} 
                disabled={updateVolunteerMutation.isPending}
              >
                {updateVolunteerMutation.isPending ? "處理中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
