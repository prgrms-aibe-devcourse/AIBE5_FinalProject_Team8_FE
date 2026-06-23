import { useEffect, useState } from 'react';
import { getDistribution, getInterests, getWeekly } from '../api/dashboard.js';
import { transformWeekly } from '../screens-dashboard.logic.js';

const DASHBOARD_DEFERRED_FETCH_DELAY_MS = 700;

export function useDeferredDashboardAnalytics({
  enabled,
  interestMonths,
  delayMs = DASHBOARD_DEFERRED_FETCH_DELAY_MS,
}) {
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [weekly, setWeekly] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setAnalyticsReady(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setAnalyticsReady(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, enabled]);

  useEffect(() => {
    if (!analyticsReady) return undefined;

    let active = true;

    getInterests(interestMonths)
      .then(data => {
        if (!active) return;
        setInterests(data?.interests ?? []);
      })
      .catch(error => {
        console.error('시기별 학습 주제 흐름 조회 중 오류 발생:', error);
      });

    return () => {
      active = false;
    };
  }, [analyticsReady, interestMonths]);

  useEffect(() => {
    if (!analyticsReady) return undefined;

    let active = true;

    Promise.allSettled([
      getWeekly(),
      getDistribution(),
    ]).then(([weekRes, distRes]) => {
      if (!active) return;
      if (weekRes.status === 'fulfilled') setWeekly(transformWeekly(weekRes.value?.weeklyData ?? []));
      if (distRes.status === 'fulfilled') setDistribution(distRes.value?.distribution ?? []);
    }).catch(error => {
      console.error('대시보드 분석 데이터 조회 중 오류:', error);
    });

    return () => {
      active = false;
    };
  }, [analyticsReady]);

  return {
    analyticsReady,
    weekly,
    distribution,
    interests,
  };
}
