import { useEffect, useState } from 'react';
import { getDistribution, getInterests, getWeekly } from '../api/dashboard.js';
import { transformWeekly } from '../screens-dashboard.logic.js';

const DASHBOARD_DEFERRED_FETCH_DELAY_MS = 700;

export function useDeferredDashboardAnalytics({
  enabled,
  interestMonths,
  delayMs = DASHBOARD_DEFERRED_FETCH_DELAY_MS,
}) {
  const [deferredFetchEnabled, setDeferredFetchEnabled] = useState(false);
  const [interestsFetchLoading, setInterestsFetchLoading] = useState(false);
  const [overviewFetchLoading, setOverviewFetchLoading] = useState(false);
  const [weekly, setWeekly] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setDeferredFetchEnabled(false);
      setInterestsFetchLoading(false);
      setOverviewFetchLoading(false);
      return undefined;
    }

    // 핵심 대시보드 데이터가 먼저 그려진 뒤 분석 API가 이어지도록 최소 지연을 둡니다.
    // 고정값은 초기 API burst를 한 번 더 분산하기 위한 의도적인 완충 시간입니다.
    const timer = setTimeout(() => {
      setDeferredFetchEnabled(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, enabled]);

  useEffect(() => {
    if (!deferredFetchEnabled) return undefined;

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
  }, [deferredFetchEnabled, interestMonths]);

  useEffect(() => {
    if (!deferredFetchEnabled) return undefined;

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
  }, [deferredFetchEnabled]);

  const overviewLoading = !deferredFetchEnabled || overviewFetchLoading;
  const interestsLoading = !deferredFetchEnabled || interestsFetchLoading;

  return {
    overviewLoading,
    interestsLoading,
    weekly,
    distribution,
    interests,
  };
}
