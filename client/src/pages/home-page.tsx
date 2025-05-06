import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Activity, Rescue, DailyActivity, Stats } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ActivityStatus from "@/components/activity-status";
import ActionButtons from "@/components/action-buttons";
import RescueRecord from "@/components/rescue-record";
import StatsSummary from "@/components/stats-summary";
import RecentActivity from "@/components/recent-activity";
import MobileNavigation from "@/components/mobile-navigation";
import UserMenu from "@/components/user-menu";

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch daily activity
  const { data: dailyActivity, refetch: refetchDailyActivity } = useQuery<DailyActivity>({
    queryKey: ["/api/activities/daily"],
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10秒內視為新鮮數據，減少不必要的請求
  });
  
  // Fetch statistics
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });
  
  // Fetch recent activities
  const { data: recentActivities } = useQuery<Activity[]>({
    queryKey: ["/api/activities/recent"],
  });
  
  // Activity mutation
  const activityMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await apiRequest("POST", "/api/activities", { type });
      return await res.json();
    },
    onSuccess: () => {
      // 立即刷新所有相關數據
      queryClient.invalidateQueries({ queryKey: ["/api/activities/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      // 強制重新獲取活動數據，確保UI更新
      queryClient.refetchQueries({ queryKey: ["/api/activities/daily"] });
      
      toast({
        title: "活動記錄已更新",
        description: "你的活動記錄已成功更新",
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
  
  // Rescue record mutation
  const rescueMutation = useMutation({
    mutationFn: async (data: Partial<Rescue>) => {
      const res = await apiRequest("POST", "/api/rescues", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "救護記錄已儲存",
        description: "你的救護記錄已成功儲存",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "儲存失敗",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle action button clicks
  const handleAction = (type: string) => {
    activityMutation.mutate(type, {
      onSuccess: (data) => {
        // 立即更新UI，不等待伺服器回應
        if (data) {
          // 使用得到的新活動記錄更新顯示時間
          const now = new Date(data.timestamp);
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const time = `${hours}:${minutes}`;
          
          // 依據操作類型更新活動狀態顯示
          if (type === "signin") {
            // 簽到操作
            const currentActivity = { 
              signInTime: time, 
              signOutTime: dailyActivity?.signOutTime || null, 
              signOutIP: dailyActivity?.signOutIP || null 
            };
            // 直接更新前端的快取數據
            queryClient.setQueryData(["/api/activities/daily"], currentActivity);
          } else if (type === "signout") {
            // 簽退操作
            const currentActivity = { 
              signInTime: dailyActivity?.signInTime || null, 
              signOutTime: time, 
              signOutIP: "即時更新" // 臨時顯示，會在重新獲取數據後更新
            };
            // 直接更新前端的快取數據
            queryClient.setQueryData(["/api/activities/daily"], currentActivity);
          }
        }
        
        // 立即重新獲取所有相關數據
        refetchDailyActivity();
      }
    });
  };
  
  // Handle rescue record submission
  const handleRescueSubmit = (data: Partial<Rescue>) => {
    rescueMutation.mutate(data);
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
              <h2 className="text-sm text-neutral-500 font-medium">協勤 / 退勤 / 救護記錄系統</h2>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-20">
        <StatsSummary stats={stats} />
        <ActivityStatus dailyActivity={dailyActivity} />
        <ActionButtons onAction={handleAction} isPending={activityMutation.isPending} />
        <RescueRecord onSubmit={handleRescueSubmit} isPending={rescueMutation.isPending} />
        <RecentActivity activities={recentActivities || []} />
      </main>
      
      <MobileNavigation />
    </div>
  );
}
