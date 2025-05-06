import { useAuth } from "@/hooks/use-auth";
import React, { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";

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
  isTimeError?: boolean; // 標記時間順序錯誤
  activityId?: number; // 可用於識別特定記錄
  activityType?: string; // 活動類型 (signin/signout/pair)
};

// 定義救護案件列表項目類型
type RescueListItem = {
  date: string;
  time: string;
  caseType: string;
  caseSubtype: string | null;
  treatment: string | null;
  hospital: string | null; // 新增送達醫院欄位
  rescueType: string | null; // ALS, BLS, PUA
  startTime: string | null; // 出勤時間
  endTime: string | null; // 返隊時間
  id: number;
  userId?: number; // 僅管理員視圖中存在
  userName?: string; // 僅管理員視圖中存在
};

export default function StatsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isRescueOpen, setIsRescueOpen] = useState(false);
  const [expandedRescues, setExpandedRescues] = useState<number[]>([]);
  const isMobile = useIsMobile();
  
  // 月份選擇器狀態
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // 可用月份數據狀態
  const [availableMonths, setAvailableMonths] = useState<{year: number, months: number[]}[]>([]);

  // 切換救護案件詳細信息顯示
  const toggleRescueDetails = (id: number) => {
    setExpandedRescues(prev => 
      prev.includes(id) ? [] : [id] // 只允許一個案件展開，點擊後關閉所有其它展開的案件
    );
  };
  
  // 取得當前月份
  const currentMonth = format(new Date(selectedYear, selectedMonth - 1), "yyyy 年 M 月", { locale: zhTW });
  const currentMonthFile = format(new Date(selectedYear, selectedMonth - 1), "yyyy-MM", { locale: zhTW });
  
  // 處理月份變更
  const handleMonthChange = (newMonth: number) => {
    if (newMonth === -1) return; // 當選擇「無可用資料」時不執行任何動作
    setSelectedMonth(newMonth);
  };
  
  // 處理年份變更
  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    
    // 檢查所選年份是否有月份數據
    const yearData = availableMonths.find(y => y.year === newYear);
    if (yearData && yearData.months.length > 0) {
      // 選擇第一個可用的月份
      setSelectedMonth(yearData.months[0]);
    } else {
      // 如果這個年份沒有可用月份，設置為-1表示無月份可選
      setSelectedMonth(-1);
    }
  };
  
  // 格式化日期，只顯示月和日
  const formatDateMonthDay = (dateString: string) => {
    try {
      const dateParts = dateString.split('-');
      if(dateParts.length === 3) {
        return `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;
      }
      return dateString;
    } catch(e) {
      return dateString;
    }
  };
  
  // 獲取可用的月份資料
  const { data: availableMonthsData, isLoading: availableMonthsLoading } = useQuery<{year: number, months: number[]}[]>({    
    queryKey: ["/api/available-months", isAdmin],
    queryFn: async () => {
      try {
        // 實際的API請求 - 若已完成API可以使用下面的請求
        // const url = isAdmin ? '/api/available-months?all=true' : '/api/available-months';
        // const res = await fetch(url);
        // if (!res.ok) throw new Error('Failed to fetch available months');
        // return res.json();

        // 模擬數據 - 待API完成後可刪除
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // 生成從5月開始到當前月份的月份列表
        const months = [];
        const startMonth = 5; // 從5月開始
        for (let m = startMonth; m <= currentMonth; m++) {
          months.push(m);
        }
        
        return [
          { year: currentYear, months } // 只顯示從5月開始到當前月份的資料
        ];
      } catch(error) {
        console.error("Error fetching available months:", error);
        // 發生錯誤時生成從5月到當前月的月份列表
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        const months = [];
        const startMonth = 5; // 從5月開始
        for (let m = startMonth; m <= currentMonth; m++) {
          months.push(m);
        }
        
        return [{ year: currentYear, months }];
      }
    }
  });
  
  // 當有新的可用月份數據時更新狀態
  React.useEffect(() => {
    if (availableMonthsData) {
      setAvailableMonths(availableMonthsData);
    }
  }, [availableMonthsData]);

  // 獲取月度活動記錄
  const { data: monthlyActivities, isLoading: activitiesLoading } = useQuery<MonthlyActivity[]>({
    queryKey: ["/api/activities/monthly", isAdmin, selectedYear, selectedMonth],
    queryFn: async ({ queryKey }) => {
      const isAdmin = queryKey[1] as boolean;
      const selectedYear = queryKey[2] as number;
      const selectedMonth = queryKey[3] as number;
      const yearMonthParam = `year=${selectedYear}&month=${selectedMonth}`;
      const url = isAdmin 
        ? `/api/activities/monthly?all=true&${yearMonthParam}` 
        : `/api/activities/monthly?${yearMonthParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json();
    },
  });
  
  // 獲取救護案件列表
  const { data: rescueList, isLoading: rescueLoading } = useQuery<RescueListItem[]>({
    queryKey: ["/api/rescues/list", isAdmin, selectedYear, selectedMonth],
    queryFn: async ({ queryKey }) => {
      const isAdmin = queryKey[1] as boolean;
      const selectedYear = queryKey[2] as number;
      const selectedMonth = queryKey[3] as number;
      const yearMonthParam = `year=${selectedYear}&month=${selectedMonth}`;
      const url = isAdmin 
        ? `/api/rescues/list?all=true&${yearMonthParam}` 
        : `/api/rescues/list?${yearMonthParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data');
      return res.json();
    },
  });
  
  // 匯出月度協勤記錄到Excel
  const exportActivitiesToExcel = () => {
    if (!monthlyActivities || monthlyActivities.length === 0) return;
    
    // 檢查是否有不完整的記錄（僅有簽到但無簽退）
    const incompleteActivities = monthlyActivities.filter(activity => 
      (activity.signInTime && !activity.signOutTime)
    );
    
    // 如果有不完整記錄，顯示提示
    if (incompleteActivities.length > 0) {
      // 收集日期列表顯示
      const incompleteDates = incompleteActivities
        .map(a => formatDateMonthDay(a.date))
        .join('、');
      
      toast({
        title: '檢測到未完成的協勤記錄',
        description: `${incompleteDates} 日期的協勤記錄沒有退勤資料，這些記錄不會被匯出。`,
        variant: 'destructive',
      });
    }
    
    // 只匯出完整的記錄（有簽到也有簽退的記錄）
    const completeActivities = monthlyActivities.filter(activity => 
      (activity.signInTime && activity.signOutTime)
    );
    
    if (completeActivities.length === 0) {
      toast({
        title: '無法匯出',
        description: '沒有完整的協勤記錄可供匯出（需要有簽到和簽退資料）。',
        variant: 'destructive',
      });
      return;
    }
    
    // 準備Excel工作表數據，只包含完整的記錄
    const worksheet = XLSX.utils.json_to_sheet(
      completeActivities.map(activity => ({
        '姓名': isAdmin ? (activity.userName || '-') : (user?.name || '-'),
        '協勤日期': activity.date,
        '協勤': activity.signInTime || '-',
        '退勤': activity.signOutTime || '-',
        '時數': activity.duration
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
    
    toast({
      title: '匯出成功',
      description: `已匯出 ${completeActivities.length} 筆完整協勤記錄。`,
      variant: 'default',
    });
  };
  
  // 匯出救護案件記錄到Excel
  const exportRescuesToExcel = () => {
    if (!rescueList || rescueList.length === 0) return;
    
    // 準備Excel工作表數據
    const worksheet = XLSX.utils.json_to_sheet(
      rescueList.map(rescue => ({
        '姓名': isAdmin ? (rescue.userName || '-') : (user?.name || '-'),
        '出勤時間': `${rescue.date} ${rescue.startTime || rescue.time}`,
        '返隊時間': rescue.endTime || '-',
        '項目': rescue.caseType,
        '子項目': rescue.caseSubtype || '-',
        '送達醫院': rescue.hospital || '-',
        '敘述': rescue.treatment || '-'
      }))
    );
    
    // 設置工作表寬度
    const wscols = [
      { wch: 10 }, // 姓名
      { wch: 20 }, // 出勤時間
      { wch: 20 }, // 返隊時間
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
    
    toast({
      title: '匯出成功',
      description: `已匯出 ${rescueList.length} 筆救護案件記錄。`,
      variant: 'default',
    });
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

        {/* 月度統計摘要 */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 救護案件總數 */}
            <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 border border-blue-100">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-blue-500 text-white mr-3">
                  <ChevronRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">當月救護案件總數</h3>
                  <p className="text-2xl font-bold text-blue-600">{rescueList?.length || 0} 件</p>
                </div>
              </div>
            </div>
            
            {/* ALS 統計 */}
            <div className="flex items-center justify-between p-3 rounded-md bg-red-50 border border-red-100">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-red-500 text-white mr-3">
                  <ChevronRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">高級救護 (ALS)</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {rescueList?.filter(rescue => rescue.rescueType === "高級救護 (ALS)").length || 0} 件
                  </p>
                </div>
              </div>
            </div>
            
            {/* BLS 統計 */}
            <div className="flex items-center justify-between p-3 rounded-md bg-green-50 border border-green-100">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-green-500 text-white mr-3">
                  <ChevronRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">基本救護 (BLS)</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {rescueList?.filter(rescue => rescue.rescueType === "基本救護 (BLS)").length || 0} 件
                  </p>
                </div>
              </div>
            </div>
            
            {/* PUA 統計 */}
            <div className="flex items-center justify-between p-3 rounded-md bg-amber-50 border border-amber-100">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-amber-500 text-white mr-3">
                  <ChevronRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500">公用救護 (PUA)</h3>
                  <p className="text-2xl font-bold text-amber-600">
                    {rescueList?.filter(rescue => rescue.rescueType === "公用救護 (PUA)").length || 0} 件
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* 月度協勤統計卡片 */}
          <Card>
            <CardHeader 
              className="px-5 py-4 border-b border-neutral-200 cursor-pointer"
              onClick={() => {
                setIsActivitiesOpen(!isActivitiesOpen);
                if (!isActivitiesOpen) {
                  setIsRescueOpen(false); // 開啟協勤統計時，收合救護案件
                }
              }}
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
                isActivitiesOpen ? "max-h-[600px] p-5 overflow-auto" : "max-h-0 p-0"
              )}
            >
              {activitiesLoading ? (
                <div className="py-4 text-center text-neutral-500">正在加載活動記錄...</div>
              ) : !monthlyActivities || monthlyActivities.length === 0 || selectedMonth === -1 ? (
                <div className="py-4 text-center text-neutral-500 flex flex-col items-center gap-2">
                  <div className="text-3xl">📅</div>
                  <div>{selectedMonth === -1 ? '選擇的年份無資料' : '所選月份無協勤記錄'}</div>
                </div>
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
                          <TableRow key={isAdmin ? `${activity.userId}-${activity.activityId}-${activity.date}` : `${activity.activityId}-${activity.date}`}>
                            {isAdmin && <TableCell className="font-medium">{activity.userName || '-'}</TableCell>}
                            <TableCell className="font-medium">{formatDateMonthDay(activity.date)}</TableCell>
                            <TableCell className={activity.isTimeError ? "text-red-500 font-medium" : ""}>{activity.signInTime || '-'}</TableCell>
                            <TableCell className={activity.isTimeError ? "text-red-500 font-medium" : ""}>{activity.signOutTime || '-'}</TableCell>
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
              onClick={() => {
                setIsRescueOpen(!isRescueOpen);
                if (!isRescueOpen) {
                  setIsActivitiesOpen(false); // 開啟救護案件時，收合協勤統計
                }
              }}
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
                isRescueOpen ? "max-h-[600px] p-5 overflow-auto" : "max-h-0 p-0"
              )}
            >
              {rescueLoading ? (
                <div className="py-4 text-center text-neutral-500">正在加載救護案件...</div>
              ) : !rescueList || rescueList.length === 0 || selectedMonth === -1 ? (
                <div className="py-4 text-center text-neutral-500 flex flex-col items-center gap-2">
                  <div className="text-3xl">💉</div>
                  <div>{selectedMonth === -1 ? '選擇的年份無資料' : '所選月份無救護案件記錄'}</div>
                </div>
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
                                <div className="font-medium">{formatDateMonthDay(rescue.date)} {rescue.startTime || rescue.time}</div>
                                <div className="text-sm text-neutral-600">
                                  {rescue.caseType}
                                  {rescue.endTime && <span className="ml-2 text-primary-600">返隊: {rescue.endTime}</span>}
                                </div>
                              </div>
                              {expandedRescues.includes(rescue.id) ? 
                                <ChevronDown className="h-5 w-5 text-neutral-400" /> : 
                                <ChevronRight className="h-5 w-5 text-neutral-400" />}
                            </div>
                            {expandedRescues.includes(rescue.id) && (
                              <div className="p-3 pt-0 pl-6 bg-neutral-50 text-sm">
                                <div className="grid grid-cols-3 gap-2 mb-1">
                                  <div className="font-medium">救護類別:</div>
                                  <div className="col-span-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      rescue.rescueType === "高級救護 (ALS)" ? "bg-red-100 text-red-800" : 
                                      rescue.rescueType === "基本救護 (BLS)" ? "bg-green-100 text-green-800" : 
                                      rescue.rescueType === "公用救護 (PUA)" ? "bg-amber-100 text-amber-800" : 
                                      "bg-gray-100 text-gray-800"
                                    }`}>
                                      {rescue.rescueType || '未指定'}
                                    </span>
                                  </div>
                                </div>
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
                            {isAdmin && <TableHead className="w-[100px]">隊員</TableHead>}
                            <TableHead className="w-[100px]">日期</TableHead>
                            <TableHead className="w-[80px]">出勤時間</TableHead>
                            <TableHead className="w-[80px]">返隊時間</TableHead>
                            <TableHead className="w-[100px]">救護類別</TableHead>
                            <TableHead className="w-[120px]">案件類型</TableHead>
                            <TableHead className="w-[60px]">詳細</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rescueList.map((rescue) => (
                            <React.Fragment key={`rescue-${rescue.id}`}>
                              <TableRow 
                                onClick={() => toggleRescueDetails(rescue.id)}
                                className="cursor-pointer hover:bg-neutral-50"
                              >
                                {isAdmin && <TableCell className="font-medium">{rescue.userName || '-'}</TableCell>}
                                <TableCell className="font-medium">{formatDateMonthDay(rescue.date)}</TableCell>
                                <TableCell>{rescue.startTime || rescue.time}</TableCell>
                                <TableCell>{rescue.endTime || '-'}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    rescue.rescueType === "高級救護 (ALS)" ? "bg-red-100 text-red-800" : 
                                    rescue.rescueType === "基本救護 (BLS)" ? "bg-green-100 text-green-800" : 
                                    rescue.rescueType === "公用救護 (PUA)" ? "bg-amber-100 text-amber-800" : 
                                    "bg-gray-100 text-gray-800"
                                  }`}>
                                    {rescue.rescueType || '未指定'}
                                  </span>
                                </TableCell>
                                <TableCell>{rescue.caseType}</TableCell>
                                <TableCell>
                                  {expandedRescues.includes(rescue.id) ? 
                                    <ChevronDown className="h-5 w-5 text-neutral-400" /> : 
                                    <ChevronRight className="h-5 w-5 text-neutral-400" />}
                                </TableCell>
                              </TableRow>
                              {expandedRescues.includes(rescue.id) && (
                                <TableRow className="bg-neutral-50">
                                  <TableCell colSpan={isAdmin ? 8 : 7} className="p-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="font-medium">案件子類型: </span>
                                        {rescue.caseSubtype || '-'}
                                      </div>
                                      <div>
                                        <span className="font-medium">送達醫院: </span>
                                        {rescue.hospital || '-'}
                                      </div>
                                      <div className="col-span-2">
                                        <span className="font-medium">基本處置: </span>
                                        {rescue.treatment || '-'}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
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

        {/* 月份選擇區域 */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-3">月份選擇</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-2">選擇年份</h4>
              <select 
                className="w-full p-2 border border-neutral-300 rounded-md bg-white"
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
              >
                {availableMonthsLoading ? (
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}年</option>
                ) : (
                  availableMonths?.map(yearData => (
                    <option key={yearData.year} value={yearData.year}>{yearData.year}年</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-2">選擇月份</h4>
              <select 
                className="w-full p-2 border border-neutral-300 rounded-md bg-white"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                disabled={availableMonthsLoading}
              >
                {availableMonthsLoading ? (
                  <option value={new Date().getMonth() + 1}>{new Date().getMonth() + 1}月</option>
                ) : (
                  // 顯示所選年份的可用月份
                  availableMonths
                    .find(yearData => yearData.year === selectedYear)?.months
                    .sort((a, b) => a - b) // 確保月份按照順序排列
                    .map(month => (
                      <option key={month} value={month}>{month}月</option>
                    )) || (
                      // 如果選擇的年份沒有資料，顯示提示
                      <option value="-1">無可用資料</option>
                    )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 匯出功能區 - 只有管理員可見 */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportActivitiesToExcel}
              className="flex items-center gap-1 justify-center"
              disabled={!monthlyActivities || monthlyActivities.length === 0 || selectedMonth === -1}
            >
              <Download className="h-4 w-4" />
              匯出協勤紀錄
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportRescuesToExcel}
              className="flex items-center gap-1 justify-center"
              disabled={!rescueList || rescueList.length === 0 || selectedMonth === -1}
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