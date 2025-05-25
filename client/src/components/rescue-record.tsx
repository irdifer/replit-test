import { useState, useEffect } from "react";
import { Rescue } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExpandIcon } from "./ui/icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface RescueRecordProps {
  onSubmit: (data: Partial<Rescue>) => void;
  isPending: boolean;
  dailyActivity?: {
    signInTime: string | null;
    signOutTime: string | null;
    signOutIP: string | null;
  };
}

export default function RescueRecord({ onSubmit, isPending, dailyActivity }: RescueRecordProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [caseType, setCaseType] = useState<string>();
  const [caseSubtype, setCaseSubtype] = useState<string>();
  const [treatment, setTreatment] = useState("");
  const [hospital, setHospital] = useState<string>();
  const [otherHospital, setOtherHospital] = useState("");
  const [rescueType, setRescueType] = useState<string>();
  const [woundLength, setWoundLength] = useState("");
  const [woundHeight, setWoundHeight] = useState("");
  const [woundDepth, setWoundDepth] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rescueAddress, setRescueAddress] = useState("");
  const [showWoundDimensions, setShowWoundDimensions] = useState(false);
  const [hiddenSections, setHiddenSections] = useState(false);
  const [formErrors, setFormErrors] = useState({
    caseType: false,
    caseSubtype: false,
    treatment: false,
    hospital: false,
    rescueType: false,
    time: false,
    rescueAddress: false,
  });

  const caseTypeMap = {
    內科: ["急病", "OHCA", "overdose", "意識不清", "急產"],
    外科: ["車禍", "路倒", "墜落傷", "一般受傷", "刀傷", "撕裂傷"],
    其他: ["精神急病", "自殺", "災害救助"],
    火警救助: ["受困", "燒燙傷", "嗆傷"],
    緊急救援: ["山域", "水域"],
    打架受傷: ["挫傷", "割傷", "撕裂傷"],
    未接觸: [],
  };

  const hospitalOptions = [
    "未送醫", "拒送", "明顯死亡", "市三", "北市中興", "台大", "北馬", "部北",
    "淡馬", "八里療養院", "松德療養院", "榮總", "新光", "新店慈濟", "輔大", "台北長庚", "林口長庚", "其他",
  ];

  useEffect(() => {
    setShowWoundDimensions(caseSubtype === "撕裂傷");
  }, [caseSubtype]);

  const isOtherHospital = hospital === "其他";
  const handleSubmit = () => {
    const errors = {
      caseType: !caseType,
      caseSubtype: false,
      treatment: false,
      hospital: false,
      rescueType: false,
      time: !startTime || !endTime,
      rescueAddress: !rescueAddress.trim(),
    };

    // 若不是未接觸才檢查其餘欄位
    if (caseType !== "未接觸") {
      errors.caseSubtype = !caseSubtype;
      errors.hospital = !hospital;
      errors.rescueType = !rescueType;
      errors.treatment = !treatment.trim();
    }

    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    const data: Partial<Rescue> = {
      caseType,
      caseSubtype,
      treatment,
      hospital: hospital === "其他" ? otherHospital : hospital,
      rescueType,
      rescueAddress,
      startTime,
      endTime,
    };

    if (showWoundDimensions) {
      data.woundLength = woundLength;
      data.woundHeight = woundHeight;
      data.woundDepth = woundDepth;
    }

    onSubmit(data);

    // reset state
    setCaseType(undefined);
    setCaseSubtype(undefined);
    setTreatment("");
    setHospital(undefined);
    setOtherHospital("");
    setRescueType(undefined);
    setWoundLength("");
    setWoundHeight("");
    setWoundDepth("");
    setStartTime("");
    setEndTime("");
    setRescueAddress("");
  };
  return (
    <Card className="mb-6">
      <CardHeader className="px-5 py-4 border-b border-neutral-200 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">🏥</span>
            救護記錄
          </CardTitle>
          <ExpandIcon className={cn("text-neutral-500 transition-transform", isOpen ? "rotate-180" : "")} />
        </div>
      </CardHeader>

      <CardContent className={cn("px-5 transition-all duration-300 overflow-hidden", isOpen ? "max-h-[2000px] py-4" : "max-h-0 py-0")}> 
        <div className="py-4 border-t border-neutral-100">

          {/* 案件類型 */}
          <Label className="block text-sm font-medium text-neutral-700 mb-2">案件類型：</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {["內科", "外科", "火警救助", "其他", "緊急救援", "打架受傷", "未接觸"].map((type) => (
              <button
                key={type}
                type="button"
                className={`px-4 py-2 text-sm rounded-md w-full justify-center ${
                  caseType === type ? "bg-[#58B2DC] text-white hover:bg-[#4B99BD]" : "bg-white hover:bg-gray-50 border border-neutral-300"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setCaseType(type);
                  setCaseSubtype(undefined);
                  setHiddenSections(type === "未接觸");
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {/* 子類型 */}
          {caseType && caseType !== "未接觸" && (
            <div className="mb-4">
              <Label className="block text-sm font-medium text-neutral-700 mb-2">子類型：</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {caseTypeMap[caseType as keyof typeof caseTypeMap]?.map(subtype => (
                  <button
                    key={subtype}
                    type="button"
                    className={`px-3 py-2 rounded text-sm w-full ${
                      caseSubtype === subtype ? "bg-[#58B2DC] text-white border-[#4B99BD]" : "bg-white border-neutral-200 hover:bg-gray-50"
                    } border`}
                    onClick={() => setCaseSubtype(subtype)}
                  >
                    {subtype}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 出勤與返隊時間（總是顯示） */}
          <div className="mb-4 p-3 border border-gray-200 bg-gray-50 rounded-md">
            <Label className="block text-sm font-medium mb-2">出勤與返隊時間</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="出勤時間" />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="返隊時間" />
            </div>
          </div>

          {/* 救護地址（總是顯示） */}
          <div className="mb-4">
            <Label className="block text-sm font-medium mb-1">救護地址</Label>
            <Input
              value={rescueAddress}
              onChange={(e) => setRescueAddress(e.target.value)}
              placeholder="請輸入救護地點（如：新北市板橋區...）"
            />
          </div>
          {/* 傷口尺寸（撕裂傷才顯示） */}
          {!hiddenSections && showWoundDimensions && (
            <div className="mb-4 p-3 border border-amber-200 bg-amber-50 rounded-md">
              <Label className="block text-sm font-medium mb-2">傷口尺寸</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="長度 (cm)" value={woundLength} onChange={(e) => setWoundLength(e.target.value)} />
                <Input placeholder="高度 (cm)" value={woundHeight} onChange={(e) => setWoundHeight(e.target.value)} />
                <Input placeholder="深度 (cm)" value={woundDepth} onChange={(e) => setWoundDepth(e.target.value)} />
              </div>
            </div>
          )}

          {/* 醫院選擇 */}
          {!hiddenSections && (
            <div className="mb-4 p-3 border border-green-100 bg-green-50 rounded-md">
              <Label className="block text-sm font-medium mb-1">送達醫院</Label>
              <Select value={hospital} onValueChange={setHospital}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選擇送達醫院..." />
                </SelectTrigger>
                <SelectContent>
                  {hospitalOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOtherHospital && (
                <Input
                  className="mt-2"
                  placeholder="請輸入醫院名稱..."
                  value={otherHospital}
                  onChange={(e) => setOtherHospital(e.target.value)}
                />
              )}
            </div>
          )}

          {/* 救護類別 */}
          {!hiddenSections && (
            <div className="mb-4 p-3 border border-blue-100 bg-blue-50 rounded-md">
              <Label className="block text-sm font-medium mb-2">救護類別</Label>
              <div className="grid grid-cols-3 gap-2">
                {["高級救護 (ALS)", "基本救護 (BLS)", "公用救護 (PUA)"].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`px-4 py-2 text-sm rounded-md w-full justify-center ${
                      rescueType === type ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-white hover:bg-gray-50 border border-blue-200"
                    }`}
                    onClick={() => setRescueType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 基本處置 */}
          {!hiddenSections && (
            <div className="mb-4">
              <Label className="block text-sm font-medium mb-2">基本處置</Label>
              <Textarea
                className="min-h-[120px] resize-y"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="請描述現場處置內容..."
              />
            </div>
          )}

          {/* 儲存按鈕 */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={!caseType || isPending}
              className="px-6 py-3 rounded-md text-base font-medium bg-[#58B2DC] hover:bg-[#4B99BD] text-white disabled:opacity-50"
            >
              {isPending ? "處理中..." : "儲存救護記錄"}
            </button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
