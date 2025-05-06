import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HomeIcon, ChartIcon, ExpandIcon } from "@/components/ui/icons";
import UserMenu from "@/components/user-menu";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Download, ChevronRight, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// 定義台灣時區
const TAIWAN_TIMEZONE = "Asia/Taipei";

// 定義月度活動記錄類型
type MonthlyActivity = {
  date: string;
  signInTime: string | null;
  signOutTime: string | null;
  duration: number;
  userId?: number; // 僅管理員視圖中存在
  userName?: string; // 僅管理員視圖中存在
};

// 定義救護案件列表項目類型
type RescueListItem = {
  date: string;
  time: string;
  caseType: string;
  caseSubtype: string | null;
  treatment: string | null;
  hospital: string | null; // 新增送達醫院欄位
  id: number;
  userId?: number; // 僅管理員視圖中存在
  userName?: string; // 僅管理員視圖中存在
};

export default function StatsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(true);
  const [isRescueOpen, setIsRescueOpen] = useState(true);
  const [expandedRescues, setExpandedRescues] = useState<number[]>([]);
  const isMobile = useIsMobile();
  
  // 切換救護案件詳細信息顯示
  const toggleRescueDetails = (id: number) => {
    setExpandedRescues(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };
  
  // 取得當前月份
  const currentMonth = format(new Date(), "yyyy 年 M 月", { locale: zhTW });
  const currentMonthFile = format(new Date(), "yyyy-MM", { locale: zhTW });
  
  // 獲取月度活動記錄
  const { data: monthlyActivities, isLoading: activitiesLoading } = useQuery<MonthlyActivity[]>({
    queryKey: ["/api/activities/monthly", isAdmin ? "all=true" : ""],
  });
  
  // 獲取救護案件列表
  const { data: rescueList, isLoading: rescueLoading } = useQuery<RescueListItem[]>({
    queryKey: ["/api/rescues/list", isAdmin ? "all=true" : ""],
  });
  
  // 匯出月度協勤記錄到Excel
  const exportActivitiesToExcel = () => {
    if (!monthlyActivities || monthlyActivities.length === 0) return;
    
    // 準備Excel工作表數據
    const worksheet = XLSX.utils.json_to_sheet(
      monthlyActivities.map(activity => ({
        '姓名': isAdmin ? (activity.userName || '-') : (user?.name || '-'),
        '協勤日期': activity.date,
        '協勤': activity.signInTime || '-',
        '退勤': activity.signOutTime || '-',
        '時數': activity.duration + ' 小時'
      }))
    );
    
    // 設置工作表寬度
    const wscols = [
      { wch: 10 }, // 姓名
      { wch: 12 }, // 協勤日期
      { wch: 10 }, // 協勤
      { wch: 10 }, // 退勤
      { wch: 10 }  // 時數
    ];
    worksheet['!cols'] = wscols;
    
    // 創建一個新的工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '協勤統計');
    
    // 生成Excel檔案並下載
    const fileName = isAdmin 
      ? `協勤統計_所有隊員_${currentMonthFile}.xlsx`
      : `協勤統計_${user?.name}_${currentMonthFile}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };
  
  // 匯出救護案件記錄到Excel
  const exportRescuesToExcel = () => {
    if (!rescueList || rescueList.length === 0) return;
    
    // 準備Excel工作表數據
    const worksheet = XLSX.utils.json_to_sheet(
      rescueList.map(rescue => ({
        '姓名': isAdmin ? (rescue.userName || '-') : (user?.name || '-'),
        '時間': `${rescue.date} ${rescue.time}`,
        '項目': rescue.caseType,
        '子項目': rescue.caseSubtype || '-',
        '送達醫院': rescue.hospital || '-',
        '敘述': rescue.treatment || '-'
      }))
    );
    
    // 設置工作表寬度
    const wscols = [
      { wch: 10 }, // 姓名
      { wch: 20 }, // 時間 (合併日期和時間)
      { wch: 15 }, // 項目
      { wch: 15 }, // 子項目
      { wch: 15 }, // 送達醫院
      { wch: 40 }  // 敘述
    ];
    worksheet['!cols'] = wscols;
    
    // 創建一個新的工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '救護案件');
    
    // 生成Excel檔案並下載
    const fileName = isAdmin 
      ? `救護案件_所有隊員_${currentMonthFile}.xlsx` 
      : `救護案件_${user?.name}_${currentMonthFile}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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

        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* 月度協勤統計卡片 */}
          <Card>
            <CardHeader 
              className="px-5 py-4 border-b border-neutral-200 cursor-pointer"
              onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">當月協勤統計 ({currentMonth})</CardTitle>
                <ExpandIcon 
                  className={cn("text-neutral-500 transition-transform", 
                    isActivitiesOpen ? "rotate-180" : "")} 
                />
              </div>
            </CardHeader>
            
            <CardContent 
              className={cn(
                "transition-all duration-300 overflow-hidden", 
                isActivitiesOpen ? "max-h-[1000px] p-5" : "max-h-0 p-0"
              )}
            >
              {activitiesLoading ? (
                <div className="py-4 text-center text-neutral-500">正在加載活動記錄...</div>
              ) : !monthlyActivities || monthlyActivities.length === 0 ? (
                <div className="py-4 text-center text-neutral-500">本月尚無協勤記錄</div>
              ) : (
                <div>
                  <div className="rounded-md border mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isAdmin && <TableHead className="w-[100px]">隊員姓名</TableHead>}
                          <TableHead className="w-[100px]">日期</TableHead>
                          <TableHead className="w-[100px]">簽到時間</TableHead>
                          <TableHead className="w-[100px]">簽退時間</TableHead>
                          <TableHead className="w-[100px] text-right">協勤時數</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyActivities.map((activity) => (
                          <TableRow key={isAdmin ? `${activity.userId}-${activity.date}` : activity.date}>
                            {isAdmin && <TableCell className="font-medium">{activity.userName || '-'}</TableCell>}
                            <TableCell className="font-medium">{activity.date}</TableCell>
                            <TableCell>{activity.signInTime || '-'}</TableCell>
                            <TableCell>{activity.signOutTime || '-'}</TableCell>
                            <TableCell className="text-right">{activity.duration} 小時</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>

          {/* 救護案件統計卡片 */}
          <Card>
            <CardHeader 
              className="px-5 py-4 border-b border-neutral-200 cursor-pointer"
              onClick={() => setIsRescueOpen(!isRescueOpen)}
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">當月救護案件統計 ({currentMonth})</CardTitle>
                <ExpandIcon 
                  className={cn("text-neutral-500 transition-transform", 
                    isRescueOpen ? "rotate-180" : "")} 
                />
              </div>
            </CardHeader>
            
            <CardContent 
              className={cn(
                "transition-all duration-300 overflow-hidden", 
                isRescueOpen ? "max-h-[1000px] p-5" : "max-h-0 p-0"
              )}
            >
              {rescueLoading ? (
                <div className="py-4 text-center text-neutral-500">正在加載救護案件...</div>
              ) : !rescueList || rescueList.length === 0 ? (
                <div className="py-4 text-center text-neutral-500">本月尚無救護案件記錄</div>
              ) : (
                <div>
                  <div className="rounded-md border mb-4">
                    {isMobile ? (
                      <div className="divide-y divide-neutral-200">
                        {rescueList.map((rescue) => (
                          <div key={rescue.id} className="overflow-hidden">
                            <div 
                              className="p-3 flex justify-between items-center cursor-pointer hover:bg-neutral-50"
                              onClick={() => toggleRescueDetails(rescue.id)}
                            >
                              <div>
                                {isAdmin && <div className="font-bold text-primary-600">{rescue.userName}</div>}
                                <div className="font-medium">{rescue.date} {rescue.time}</div>
                                <div className="text-sm text-neutral-600">{rescue.caseType}</div>
                              </div>
                              {expandedRescues.includes(rescue.id) ? 
                                <ChevronDown className="h-5 w-5 text-neutral-400" /> : 
                                <ChevronRight className="h-5 w-5 text-neutral-400" />}
                            </div>
                            {expandedRescues.includes(rescue.id) && (
                              <div className="p-3 pt-0 pl-6 bg-neutral-50 text-sm">
                                <div className="grid grid-cols-3 gap-2 mb-1">
                                  <div className="font-medium">案件子類型:</div>
                                  <div className="col-span-2">{rescue.caseSubtype || '-'}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-1">
                                  <div className="font-medium">基本處置:</div>
                                  <div className="col-span-2">{rescue.treatment || '-'}</div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="font-medium">送達醫院:</div>
                                  <div className="col-span-2">{rescue.hospital || '-'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {isAdmin && <TableHead className="w-[100px]">隊員姓名</TableHead>}
                            <TableHead className="w-[100px]">日期</TableHead>
                            <TableHead className="w-[80px]">時間</TableHead>
                            <TableHead className="w-[120px]">案件類型</TableHead>
                            <TableHead className="w-[120px]">案件子類型</TableHead>
                            <TableHead className="w-[120px]">送達醫院</TableHead>
                            <TableHead className="w-[180px]">基本處置</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rescueList.map((rescue) => (
                            <TableRow key={rescue.id}>
                              {isAdmin && <TableCell className="font-medium">{rescue.userName || '-'}</TableCell>}
                              <TableCell className="font-medium">{rescue.date}</TableCell>
                              <TableCell>{rescue.time}</TableCell>
                              <TableCell>{rescue.caseType}</TableCell>
                              <TableCell>{rescue.caseSubtype || '-'}</TableCell>
                              <TableCell>{rescue.hospital || '-'}</TableCell>
                              <TableCell>{rescue.treatment || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 匯出功能區 - 只有管理員可見 */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportActivitiesToExcel}
              className="flex items-center gap-1 justify-center"
              disabled={!monthlyActivities || monthlyActivities.length === 0}
            >
              <Download className="h-4 w-4" />
              匯出協勤紀錄
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportRescuesToExcel}
              className="flex items-center gap-1 justify-center"
              disabled={!rescueList || rescueList.length === 0}
            >
              <Download className="h-4 w-4" />
              匯出救護紀錄
            </Button>
          </div>
        )}


      </main>
    </div>
  );
}