import { Activity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryIcon, ClockIcon, AmbulanceIcon, TrainingIcon, DutyIcon } from "./ui/icons";
import { format } from "date-fns";

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
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
      <CardHeader className="px-5 py-4 border-b border-neutral-200">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <HistoryIcon className="text-blue-500" />
          活動記錄
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
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
                    {format(new Date(activity.timestamp), "yyyy-MM-dd HH:mm:ss")}
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
