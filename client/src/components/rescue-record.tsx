import { useState, useEffect } from "react";
import { Rescue } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AmbulanceIcon, ExpandIcon, MedicalIcon, SaveIcon } from "./ui/icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { FileDown } from "lucide-react";

interface RescueRecordProps {
  onSubmit: (data: Partial<Rescue>) => void;
  isPending: boolean;
}

export default function RescueRecord({ onSubmit, isPending }: RescueRecordProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [caseType, setCaseType] = useState<string | undefined>();
  const [caseSubtype, setCaseSubtype] = useState<string | undefined>();
  const [treatment, setTreatment] = useState("");
  const [showWoundDimensions, setShowWoundDimensions] = useState(false);
  const [woundLength, setWoundLength] = useState("");
  const [woundHeight, setWoundHeight] = useState("");
  const [woundDepth, setWoundDepth] = useState("");

  // Case type mapping for subtypes
  const caseTypeMap = {
    內科: ["急病", "OHCA", "overdose", "意識不清"],
    外科: ["車禍", "路倒", "割傷", "撕裂傷"],
    其他: ["精神急病", "自殺", "災害救助"],
    火警救助: ["受困", "燒燙傷", "嗆傷"],
    緊急救援: ["山域", "水域"],
    打架受傷: ["挫傷", "割傷", "撕裂傷"],
  };

  const quickTags = [
    "生理監視 VS",
    "心理支持 MS",
    "現場待命",
    "撕裂傷 LW",
    "擦傷 AW",
  ];

  const insertText = (text: string) => {
    const prefix = treatment.length > 0 && !treatment.endsWith("\n") ? "\n" : "";
    setTreatment(treatment + prefix + text);
  };

  // Check if the subtype is laceration or cut wound to show wound dimensions
  useEffect(() => {
    const shouldShow = caseSubtype === "撕裂傷" || caseSubtype === "割傷";
    console.log('Case subtype:', caseSubtype, 'Should show wound dimensions:', shouldShow);
    setShowWoundDimensions(shouldShow);
  }, [caseSubtype]);

  const handleSubmit = () => {
    if (!caseType) return;

    const rescueData: Partial<Rescue> = {
      caseType,
      caseSubtype,
      treatment,
    };

    // Add wound dimensions if it's a laceration or cut wound
    if (showWoundDimensions) {
      rescueData.woundLength = woundLength;
      rescueData.woundHeight = woundHeight;
      rescueData.woundDepth = woundDepth;
    }

    onSubmit(rescueData);

    // Reset form
    setCaseType(undefined);
    setCaseSubtype(undefined);
    setTreatment("");
    setWoundLength("");
    setWoundHeight("");
    setWoundDepth("");
  };

  // Function to export data to Excel (for admin users)
  const handleExport = () => {
    // In a real application, this would trigger an API call to download Excel data
    console.log("Exporting data to Excel...");
    // This would normally be an API call like:
    // window.location.href = "/api/rescues/export";
  };

  return (
    <Card className="mb-6">
      <CardHeader className="px-5 py-4 border-b border-neutral-200 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AmbulanceIcon className="text-red-500" />
            救護記錄
          </CardTitle>
          <ExpandIcon 
            className={cn("text-neutral-500 transition-transform", 
              isOpen ? "rotate-180" : "")} 
          />
        </div>
      </CardHeader>

      <CardContent 
        className={cn(
          "px-5 transition-all duration-300 overflow-hidden", 
          isOpen ? "max-h-[1000px] py-4" : "max-h-0 py-0"
        )}
      >
        <div className="py-4 border-t border-neutral-100">
          {/* Case Type Selection */}
          <div className="mb-4">
            <Label className="block text-sm font-medium text-neutral-700 mb-2">
              案件類型：
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["內科", "外科", "火警救助", "其他", "緊急救援", "打架受傷"].map(type => (
                <button
                  key={type}
                  type="button"
                  className={`px-4 py-2 text-sm rounded-md w-full justify-center ${caseType === type ? "bg-primary-500 text-white hover:bg-primary-600" : "bg-white hover:bg-gray-50 border border-neutral-300"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCaseType(type);
                    setCaseSubtype(undefined);
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Subtype Selection */}
          {caseType && (
            <div className="mb-4">
              <Label className="block text-sm font-medium text-neutral-700 mb-2">
                子類型：
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {caseTypeMap[caseType as keyof typeof caseTypeMap]?.map((subtype: string) => (
                  <button
                    key={subtype}
                    type="button"
                    className={`px-3 py-2 rounded text-sm w-full ${caseSubtype === subtype ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-white border-neutral-200 hover:bg-gray-50"} border`}
                    onClick={(e) => {
                      e.preventDefault();
                      setCaseSubtype(subtype);
                    }}
                  >
                    {subtype}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wound Dimensions (only shown for laceration or cut wound) */}
          {showWoundDimensions && (
            <div className="mb-4 p-3 border border-amber-200 bg-amber-50 rounded-md">
              <h4 className="flex items-center gap-1 font-medium mb-3 text-amber-800">
                <MedicalIcon className="text-amber-600" />
                傷口尺寸記錄
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="woundLength" className="block text-sm font-medium text-neutral-700 mb-1">
                    長度 (cm)
                  </Label>
                  <Input
                    id="woundLength"
                    type="text"
                    value={woundLength}
                    onChange={(e) => setWoundLength(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="woundHeight" className="block text-sm font-medium text-neutral-700 mb-1">
                    高度 (cm)
                  </Label>
                  <Input
                    id="woundHeight"
                    type="text"
                    value={woundHeight}
                    onChange={(e) => setWoundHeight(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="woundDepth" className="block text-sm font-medium text-neutral-700 mb-1">
                    深度 (cm)
                  </Label>
                  <Input
                    id="woundDepth"
                    type="text"
                    value={woundDepth}
                    onChange={(e) => setWoundDepth(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Basic Treatment */}
          <div className="mb-4">
            <h4 className="flex items-center gap-1 font-medium mb-2">
              <MedicalIcon className="text-neutral-600" />
              基本處置
            </h4>
            <Textarea
              id="treatmentNotes"
              placeholder="請描述現場處置內容..."
              className="min-h-[120px] resize-y"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
            />
          </div>

          {/* Quick Tags */}
          <div className="mb-4">
            <Label className="block text-sm font-medium text-neutral-500 mb-2">
              快速標籤：
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="px-3 py-1 text-xs rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200"
                  onClick={(e) => {
                    e.preventDefault();
                    insertText(tag);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-end gap-4">
              {/* Export Button (Admin only) */}
              {user?.role === "admin" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleExport();
                  }}
                  className="px-4 py-2 rounded-md text-sm font-medium text-blue-600 border border-blue-300 hover:bg-blue-50"
                >
                  <FileDown className="mr-2 h-4 w-4 inline-block" />
                  導出 Excel
                </button>
              )}
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                disabled={!caseType || isPending}
                className="px-6 py-3 rounded-md text-base font-medium bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    處理中...
                  </>
                ) : (
                  <>
                    <SaveIcon className="inline-block mr-2 h-4 w-4" />
                    儲存救護記錄
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
