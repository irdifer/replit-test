import { useState } from "react";
import { Activity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HistoryIcon, ClockIcon, AmbulanceIcon, TrainingIcon, DutyIcon, ExpandIcon, SaveIcon } from "./ui/icons";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { utils, writeFile } from "xlsx";

interface RecentActivityProps {
  activities: Activity[];
}

// 定義台灣時區
const TAIWAN_TIMEZONE = "Asia/Taipei";

export default function RecentActivity({ activities }: RecentActivityProps) {
  // 預設收合活動記錄
  const [isOpen, setIsOpen] = useState(false);
  
  // 處理匯出 Excel
  const handleExportExcel = () => {
    if (!activities || activities.length === 0) return;
    
    // 準備 Excel 資料
    const excelData = activities.map(activity => ({
      活動類型: getActivityTitle(activity),
      時間: formatInTimeZone(new Date(activity.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd HH:mm:ss"),
      記錄ID: activity.id
    }));
    
    // 創建工作表
    const worksheet = utils.json_to_sheet(excelData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "活動記錄");
    
    // 產生現在時間作為檔名
    const now = formatInTimeZone(new Date(), TAIWAN_TIMEZONE, "yyyyMMdd_HHmmss");
    
    // 下載檔案
    writeFile(workbook, `活動記錄_${now}.xlsx`);
  };
  
  // Helper function to get icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "signin":
        return <ClockIcon className="h-5 w-5" />;
      case "signout":
        return <ClockIcon className="h-5 w-5" />;
      case "rescue":
        return <AmbulanceIcon className="h-5 w-5" />;
      case "training":
        return <TrainingIcon className="h-5 w-5" />;
      case "duty":
        return <DutyIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  // Helper function to get background color based on activity type
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case "signin":
        return "bg-primary-100 text-primary-700";
      case "signout":
        return "bg-blue-100 text-blue-700";
      case "rescue":
        return "bg-red-100 text-red-700";
      case "training":
        return "bg-amber-100 text-amber-700";
      case "duty":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  // Helper function to format activity title
  const getActivityTitle = (activity: Activity) => {
    switch (activity.type) {
      case "signin":
        return "協勤簽到";
      case "signout":
        return "退勤記錄";
      case "rescue":
        return "救護案件";
      case "training":
        return "常訓記錄";
      case "duty":
        return "公差記錄";
      default:
        return "活動記錄";
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader 
        className="px-5 py-4 border-b border-neutral-200 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HistoryIcon className="text-blue-500" />
            活動記錄
          </CardTitle>
          <ExpandIcon 
            className={cn("text-neutral-500 transition-transform", 
              isOpen ? "rotate-180" : "")} 
          />
        </div>
      </CardHeader>
      
      {/* Excel 匯出按鈕 */}
      <div className="px-5 py-3 border-t border-neutral-200 flex justify-end">
        <Button 
          onClick={(e) => {
            e.stopPropagation(); // 防止觸發收合/展開
            handleExportExcel();
          }}
          variant="outline"
          size="sm"
          className="text-sm font-medium"
          disabled={!activities || activities.length === 0}
        >
          <SaveIcon className="mr-1.5 h-4 w-4" />
          匯出 EXCEL
        </Button>
      </div>
      
      <CardContent 
        className={cn(
          "p-0 transition-all duration-300 overflow-hidden", 
          isOpen ? "max-h-[1000px]" : "max-h-0"
        )}
      >
        <div className="divide-y divide-neutral-100">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              暫無活動記錄
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-full ${getActivityBgColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{getActivityTitle(activity)}</p>
                  <p className="text-sm text-neutral-500">
                    {formatInTimeZone(new Date(activity.timestamp), TAIWAN_TIMEZONE, "yyyy-MM-dd HH:mm:ss")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
