import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';
import { SiteDescriptions, ANCHOR_LP } from './SiteDescriptions.jsx';
import { getLenis } from '../hooks/useSmoothScroll.js';

const RISE = 0.85;   // 히어로 위로 떠오르는 구간(vh 배수)
const EXPAND = 0.7;  // 풀스크린 확장 구간(vh 배수)
const LAUNCH = 5.0;  // 확장 후 데스크톱이 핀 고정된 채 앱이 하나씩 켜지는 구간(vh 배수)

export const MonitorSection = ({ onStart, scrollToRef }) => {
  const trackRef = useRef(null);
  const metrics = useRef({ vh: 800 });
  const [trackH, setTrackH] = useState(`${(RISE + EXPAND + LAUNCH) * 100}vh`);

  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight || 800;
      metrics.current = { vh };
      setTrackH(`${Math.round((RISE + EXPAND + LAUNCH) * vh)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });

  // 단계 경계(전체 스크롤 대비 비율). vh는 약분되므로 상수만으로 결정된다.
  const total = RISE + EXPAND + LAUNCH;
  const pRise = RISE / total;
  const pExpand = (RISE + EXPAND) / total;
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

  const riseY = useTransform(scrollYProgress, (v) => `${(1 - Math.min(1, v / pRise)) * 100}%`);
  const width = useTransform(scrollYProgress, (v) => `${lerp(88, 100, (v - pRise) / (pExpand - pRise))}%`);
  const bezelPad = useTransform(scrollYProgress, (v) => `${lerp(16, 0, (v - pRise) / (pExpand - pRise))}px`);
  const screenRadius = useTransform(scrollYProgress, (v) => `${lerp(18, 0, (v - pRise) / (pExpand - pRise))}px`);
  const bezelRadius = useTransform(scrollYProgress, (v) => `${lerp(30, 0, (v - pRise) / (pExpand - pRise))}px`);

  // 확장이 끝난 뒤부터 1까지를 0→1로 정규화 — 데스크톱의 앱 실행을 구동
  const launchProgress = useTransform(scrollYProgress, (v) =>
    Math.min(1, Math.max(0, (v - pExpand) / (1 - pExpand))),
  );

  // 히어로 메뉴 → 데스크톱 앱(launchProgress 스텝)으로 이동.
  // 데스크톱은 핀 고정이므로, 해당 앱이 또렷해지는 launchProgress를 윈도우 스크롤 위치로 역산한다.
  const scrollToSection = useCallback((id) => {
    const track = trackRef.current;
    if (!track) return;
    const { vh } = metrics.current;
    const lp = ANCHOR_LP[id] ?? 0;
    const v = pExpand + lp * (1 - pExpand);
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const target = trackTop + v * (track.offsetHeight - vh);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { duration: 1.1 });
    else window.scrollTo({ top: target, behavior: 'smooth' });
  }, [pExpand]);

  useEffect(() => {
    if (scrollToRef) scrollToRef.current = scrollToSection;
    return () => { if (scrollToRef) scrollToRef.current = null; };
  }, [scrollToRef, scrollToSection]);

  // 화면 깨우기
  const [wakeState, setWakeState] = useState('off');
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const wakeAt = pRise * 0.55;
    setWakeState((prev) => {
      if (v > wakeAt && prev === 'off') return 'waking';
      if (v < wakeAt * 0.7 && prev !== 'off') return 'off';
      return prev;
    });
  });
  useEffect(() => {
    let timer;
    if (wakeState === 'waking') timer = setTimeout(() => setWakeState('on'), 600);
    return () => clearTimeout(timer);
  }, [wakeState]);

  // 트랙(z-20)은 스크롤 시 히어로(z-0) 위로 겹쳐 빈 영역이 히어로 CTA 클릭을 가로챈다.
  // 트랙 전체를 pointer-events-none 로 두어 빈 영역은 클릭을 통과시키고, 실제 모니터에만 auto 를 준다.
  return (
    <div ref={trackRef} className="relative z-20 w-full pointer-events-none" style={{ height: trackH }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex justify-center">
        <motion.div
          style={{ width, y: riseY, borderRadius: bezelRadius, paddingTop: bezelPad, paddingLeft: bezelPad, paddingRight: bezelPad, paddingBottom: bezelPad }}
          className="relative h-full flex bg-gradient-to-b from-[#3a3a3d] via-[#1c1c1f] to-[#0d0d0f] shadow-[0_40px_90px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] pointer-events-auto"
        >
          <motion.div
            style={{ borderRadius: screenRadius }}
            className="relative flex-1 overflow-hidden bg-[#020202] flex flex-col shadow-[inset_0_3px_26px_rgba(0,0,0,0.9)]"
          >
            {/* Camera Notch — 노트북 카메라(상단 베젤) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
              <div className="w-[150px] h-[24px] bg-[#0a0a0c] rounded-b-[13px] border-b border-x border-white/10 flex justify-center items-center gap-5 shadow-[0_3px_8px_rgba(0,0,0,0.55)]">
                <div className="w-[10px] h-[10px] rounded-full bg-[#070708] border border-white/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#23406f] opacity-80 blur-[0.5px]" />
                </div>
                <div className="w-1 h-1 rounded-full bg-emerald-500/30 blur-[1px]" />
              </div>
            </div>

            {/* Glass reflection */}
            <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden rounded-[inherit]">
              <div className="absolute top-0 right-0 w-[150%] h-[1000px] bg-gradient-to-b from-white/[0.05] to-transparent rotate-[35deg] translate-x-1/4 -translate-y-1/2 blur-[1px]" />
            </div>

            {/* Black screen overlay (off) */}
            <motion.div
              initial={false}
              animate={{ opacity: wakeState === 'off' ? 1 : 0 }}
              transition={{ duration: 0, delay: wakeState === 'waking' ? 0.3 : 0 }}
              className="absolute inset-0 bg-[#020202] z-30 pointer-events-none rounded-[inherit]"
            />

            {/* Wake line */}
            <AnimatePresence>
              {wakeState === 'waking' && (
                <motion.div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                  <motion.div
                    initial={{ width: '0%', height: '2px', opacity: 1 }}
                    animate={{ width: ['0%', '100%', '100%', '100%'], height: ['2px', '2px', '100%', '100%'], opacity: [1, 1, 1, 0] }}
                    transition={{ duration: 0.6, times: [0, 0.3, 0.6, 1], ease: 'easeInOut' }}
                    className="bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Woken content — 맥OS 데스크톱(메뉴바·바탕화면·Dock 포함) */}
            <motion.div
              initial={false}
              animate={{
                opacity: wakeState !== 'off' ? 1 : 0,
                filter: wakeState === 'on' ? 'blur(0px)' : wakeState === 'waking' ? 'blur(4px)' : 'blur(10px)',
              }}
              transition={{ duration: 0.4, delay: wakeState === 'waking' ? 0.3 : 0 }}
              className="w-full h-full overflow-hidden rounded-[inherit]"
            >
              <SiteDescriptions onStart={onStart} launchProgress={launchProgress} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
