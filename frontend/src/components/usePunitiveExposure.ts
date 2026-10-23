import { useMemo } from 'react';

export interface RecallTask {
  id: string;
  campaign_number: string;
  component: string;
  summary: string;
  severity_score: number;
  status: string;
}

export function usePunitiveExposure(tasks: RecallTask[]) {
  return useMemo(() => {
    // Only tally open or in-progress tasks (resolved tasks drop liability to $0)
    const activeTasks = tasks.filter(
      (t) => !['cleared', 'repaired', 'completed'].includes(t.status.toLowerCase())
    );

    let nuclearCount = 0;
    let highCount = 0;
    let advisoryCount = 0;
    let totalExposure = 0;

    activeTasks.forEach((task) => {
      const component = (task.component || '').toLowerCase();
      const score = Number(task.severity_score) || 5.0;

      const isNuclear =
        score >= 8.0 ||
        component.includes('steering') ||
        component.includes('brake') ||
        component.includes('fire') ||
        component.includes('drag link');

      if (isNuclear) {
        nuclearCount += 1;
        totalExposure += 250000;
      } else if (score >= 5.0) {
        highCount += 1;
        totalExposure += 50000;
      } else {
        advisoryCount += 1;
        totalExposure += 10000;
      }
    });

    const isShieldActive = totalExposure === 0;

    return {
      totalExposure,
      isShieldActive,
      nuclearCount,
      highCount,
      advisoryCount,
      activeDefectCount: activeTasks.length,
      formattedExposure: `$${totalExposure.toLocaleString()}`,
    };
  }, [tasks]);
}