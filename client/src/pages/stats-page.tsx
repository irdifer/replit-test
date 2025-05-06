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

// 定義台灣時區
const TAIWAN_TIMEZONE = "Asia/Taipei";

// 定義月度活動記錄類型
type MonthlyActivity = {
  date: string;
  signInTime: string | null;
  signOutTime: string | null;
  duration: number;
};

// 定義救護案件列表項目類型
type RescueListItem = {
  date: string;
  time: string;
  caseType: string;
  caseSubtype: string | null;
  treatment: string | null;
  id: number;
};

export default function StatsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(true);
  const [isRescueOpen, setIsRescueOpen] = useState(true);
  
  // 獲取月度活動記錄
  const { data: monthlyActivities, isLoading: activitiesLoading } = useQuery<MonthlyActivity[]>({
    queryKey: ["/api/activities/monthly"],
  });
  
  // 獲取救護案件列表
  const { data: rescueList, isLoading: rescueLoading } = useQuery<RescueListItem[]>({
    queryKey: ["/api/rescues/list"],
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
                <CardTitle className="text-lg">月度協勤統計</CardTitle>
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">日期</TableHead>
                        <TableHead>簽到時間</TableHead>
                        <TableHead>簽退時間</TableHead>
                        <TableHead className="text-right">協勤時數</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyActivities.map((activity) => (
                        <TableRow key={activity.date}>
                          <TableCell className="font-medium">{activity.date}</TableCell>
                          <TableCell>{activity.signInTime || '-'}</TableCell>
                          <TableCell>{activity.signOutTime || '-'}</TableCell>
                          <TableCell className="text-right">{activity.duration} 小時</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                <CardTitle className="text-lg">救護案件統計</CardTitle>
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">日期</TableHead>
                        <TableHead className="w-[80px]">時間</TableHead>
                        <TableHead>案件類型</TableHead>
                        <TableHead>案件子類型</TableHead>
                        <TableHead>基本處置</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rescueList.map((rescue) => (
                        <TableRow key={rescue.id}>
                          <TableCell className="font-medium">{rescue.date}</TableCell>
                          <TableCell>{rescue.time}</TableCell>
                          <TableCell>{rescue.caseType}</TableCell>
                          <TableCell>{rescue.caseSubtype || '-'}</TableCell>
                          <TableCell>{rescue.treatment || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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
