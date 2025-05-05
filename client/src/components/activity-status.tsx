import { DailyActivity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, LoginIcon, LogoutIcon, LocationIcon } from "./ui/icons";

interface ActivityStatusProps {
  dailyActivity?: DailyActivity;
}

export default function ActivityStatus({ dailyActivity }: ActivityStatusProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="px-5 py-4 border-b border-neutral-200">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="text-primary-500" />
          今日協勤記錄
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 mb-1">簽到時間</span>
            <div className="flex items-center">
              <LoginIcon className={`mr-2 ${dailyActivity?.signInTime ? 'text-primary-500' : 'text-neutral-400'}`} />
              <span className="font-medium">
                {dailyActivity?.signInTime || "--"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 mb-1">退勤時間</span>
            <div className="flex items-center">
              <LogoutIcon className={`mr-2 ${dailyActivity?.signOutTime ? 'text-primary-500' : 'text-neutral-400'}`} />
              <span className="font-medium">
                {dailyActivity?.signOutTime || "--"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-neutral-500 mb-1">退勤地點 (IP)</span>
            <div className="flex items-center">
              <LocationIcon className={`mr-2 ${dailyActivity?.signOutIP ? 'text-primary-500' : 'text-neutral-400'}`} />
              <span className="font-medium">
                {dailyActivity?.signOutIP || "--"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
