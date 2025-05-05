import { Stats } from "@shared/schema";

interface StatsSummaryProps {
  stats?: Stats;
}

export default function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <section className="grid grid-cols-2 gap-3 mb-6 md:gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 flex flex-col items-center justify-center">
        <div className="text-neutral-500 text-sm font-medium mb-1">本月協勤時數</div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-primary-600">
            {stats?.workHours || 0}
          </span>
          <span className="text-neutral-500 ml-1">小時</span>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 flex flex-col items-center justify-center">
        <div className="text-neutral-500 text-sm font-medium mb-1">本月救護案件</div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-blue-600">
            {stats?.rescueCount || 0}
          </span>
          <span className="text-neutral-500 ml-1">件</span>
        </div>
      </div>
    </section>
  );
}
