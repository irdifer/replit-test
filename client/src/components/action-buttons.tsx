import { Button } from "@/components/ui/button";
import { 
  ClockIcon, 
  LogoutIcon, 
  TrainingIcon, 
  DutyIcon 
} from "./ui/icons";
import { Loader2 } from "lucide-react";

interface ActionButtonsProps {
  onAction: (type: string) => void;
  isPending: boolean;
  dailyActivity?: {
    signInTime: string | null;
    signOutTime: string | null;
    signOutIP: string | null;
  };
}

export default function ActionButtons({ onAction, isPending, dailyActivity }: ActionButtonsProps) {
  const actions = [
    { 
      type: "signin", 
      label: "協勤", 
      icon: <ClockIcon className="text-primary-500 h-6 w-6" />,
    },
    { 
      type: "signout", 
      label: "退勤", 
      icon: <LogoutIcon className="text-blue-500 h-6 w-6" />,
    },
    { 
      type: "training", 
      label: "常訓", 
      icon: <TrainingIcon className="text-amber-500 h-6 w-6" />,
    },
    { 
      type: "duty", 
      label: "公差", 
      icon: <DutyIcon className="text-purple-500 h-6 w-6" />,
    },
  ];

  // 判斷按鈕是否應被禁用的函數
  const isButtonDisabled = (actionType: string) => {
    if (isPending) return true;
    
    // 已簽到但未簽退的狀態
    const isOnDuty = dailyActivity?.signInTime && !dailyActivity?.signOutTime;
    
    // 簽到禁用條件：已經簽到
    if (actionType === "signin" && isOnDuty) {
      return true;
    }
    
    // 簽退禁用條件：尚未簽到或已簽退
    if (actionType === "signout" && (!dailyActivity?.signInTime || dailyActivity?.signOutTime)) {
      return true;
    }
    
    // 常訓和公差禁用條件：已在協勤中，不能同時進行常訓或公差
    if ((actionType === "training" || actionType === "duty") && isOnDuty) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action) => (
        <Button
          key={action.type}
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto p-4 rounded-xl transition-all duration-150"
          onClick={() => onAction(action.type)}
          disabled={isButtonDisabled(action.type)}
        >
          {isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            action.icon
          )}
          <span className="font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
