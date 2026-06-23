import { useEffect, useState } from 'react';
import { getDistribution, getInterests, getWeekly } from '../api/dashboard.js';
import { transformWeekly } from '../screens-dashboard.logic.js';

export function useDeferredDashboardAnalytics({
  enabled,
  interestMonths,
}) {
  const [interestsFetchLoading, setInterestsFetchLoading] = useState(false);
  const [overviewFetchLoading, setOverviewFetchLoading] = useState(false);
  const [weekly, setWeekly] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    setInterestsFetchLoading(true);

    getInterests(interestMonths)
      .then(data => {
        if (!active) return;
        setInterests(data?.interests ?? []);
      })
      .catch(error => {
        console.error('시기별 학습 주제 흐름 조회 중 오류 발생:', error);
      })
      .finally(() => {
        if (active) setInterestsFetchLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, interestMonths]);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    setOverviewFetchLoading(true);

    Promise.allSettled([
      getWeekly(),
      getDistribution(),
    ]).then(([weekRes, distRes]) => {
      if (!active) return;
      if (weekRes.status === 'fulfilled') setWeekly(transformWeekly(weekRes.value?.weeklyData ?? []));
      if (distRes.status === 'fulfilled') setDistribution(distRes.value?.distribution ?? []);
    }).catch(error => {
      console.error('대시보드 분석 데이터 조회 중 오류:', error);
    }).finally(() => {
      if (active) setOverviewFetchLoading(false);
    });

    return () => {
      active = false;
    };
  }, [enabled]);

  const overviewLoading = !enabled || overviewFetchLoading;
  const interestsLoading = !enabled || interestsFetchLoading;

  return {
    overviewLoading,
    interestsLoading,
    weekly,
    distribution,
    interests,
  };
}
