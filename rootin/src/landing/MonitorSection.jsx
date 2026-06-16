import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { SiteDescriptions } from './SiteDescriptions.jsx';
import { Lock, Menu, ArrowLeft, ArrowRight, RotateCw, Plus } from 'lucide-react';

const CHROME_H = 60; // Safari chrome(메뉴바+툴바) 높이(px)
const RISE = 0.85;   // 히어로 위로 떠오르는 구간(vh 배수)
const EXPAND = 0.7;  // 풀스크린 확장 구간(vh 배수)

export const MonitorSection = ({ onStart }) => {
  const trackRef = useRef(null);
  const contentRef = useRef(null);
  const metrics = useRef({ vh: 800, contentH: 2400 });
  const [trackH, setTrackH] = useState('320vh');

  // SiteDescriptions 높이를 측정해 "확장이 끝난 뒤 내부 내용만큼" 스크롤 길이를 잡는다.
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight || 800;
      const contentH = contentRef.current ? contentRef.current.scrollHeight : 0;
      metrics.current = { vh, contentH };
      const innerVh = Math.max(1, vh - CHROME_H);
      const readScroll = Math.max(0, contentH - innerVh);
      setTrackH(`${Math.round((RISE + EXPAND) * vh + readScroll)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });

  // metrics가 갱신돼도 살아있도록 함수형 transform으로 매 프레임 계산
  const phases = () => {
    const { vh, contentH } = metrics.current;
    const innerVh = Math.max(1, vh - CHROME_H);
    const readScroll = Math.max(0, contentH - innerVh);
    const total = (RISE + EXPAND) * vh + readScroll;
    return { pRise: (RISE * vh) / total, pExpand: ((RISE + EXPAND) * vh) / total, readScroll };
  };
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

  const riseY = useTransform(scrollYProgress, (v) => {
    const { pRise } = phases();
    return `${(1 - Math.min(1, v / pRise)) * 100}%`;
  });
  const width = useTransform(scrollYProgress, (v) => {
    const { pRise, pExpand } = phases();
    return `${lerp(88, 100, (v - pRise) / (pExpand - pRise))}%`;
  });
  const bezelPad = useTransform(scrollYProgress, (v) => {
    const { pRise, pExpand } = phases();
    return `${lerp(16, 0, (v - pRise) / (pExpand - pRise))}px`;
  });
  const screenRadius = useTransform(scrollYProgress, (v) => {
    const { pRise, pExpand } = phases();
    return `${lerp(18, 0, (v - pRise) / (pExpand - pRise))}px`;
  });
  const bezelRadius = useTransform(scrollYProgress, (v) => {
    const { pRise, pExpand } = phases();
    return `${lerp(30, 0, (v - pRise) / (pExpand - pRise))}px`;
  });
  const contentY = useTransform(scrollYProgress, (v) => {
    const { pExpand, readScroll } = phases();
    if (v <= pExpand) return 0;
    return -lerp(0, readScroll, (v - pExpand) / (1 - pExpand));
  });

  // 화면 깨우기
  const [wakeState, setWakeState] = useState('off');
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const { pRise } = phases();
    const wakeAt = pRise * 0.55;
    if (v > wakeAt && wakeState === 'off') setWakeState('waking');
    else if (v < wakeAt * 0.7 && wakeState !== 'off') setWakeState('off');
  });
  useEffect(() => {
    let timer;
    if (wakeState === 'waking') timer = setTimeout(() => setWakeState('on'), 600);
    return () => clearTimeout(timer);
  }, [wakeState]);

  return (
    <div ref={trackRef} className="relative z-20 w-full" style={{ height: trackH }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex justify-center">
        <motion.div
          style={{ width, y: riseY, borderRadius: bezelRadius, paddingTop: bezelPad, paddingLeft: bezelPad, paddingRight: bezelPad, paddingBottom: bezelPad }}
          className="relative h-full flex bg-gradient-to-b from-[#3a3a3d] via-[#1c1c1f] to-[#0d0d0f] shadow-[0_40px_90px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]"
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

            {/* Woken content */}
            <motion.div
              initial={false}
              animate={{
                opacity: wakeState !== 'off' ? 1 : 0,
                filter: wakeState === 'on' ? 'blur(0px)' : wakeState === 'waking' ? 'blur(4px)' : 'blur(10px)',
              }}
              transition={{ duration: 0.4, delay: wakeState === 'waking' ? 0.3 : 0 }}
              className="w-full h-full flex flex-col overflow-hidden rounded-[inherit] bg-white"
            >
              {/* Safari Chrome — 상단 고정(스크롤해도 항상 보임). 노치는 상단 중앙을 비워 겹치지 않게 정렬(items-end) */}
              <div
                className="shrink-0 flex items-end gap-3 pb-2 px-4 bg-[#eceae6] border-b border-[#dcdad4]"
                style={{ height: CHROME_H }}
              >
                <div className="flex gap-2 w-20 shrink-0 items-center pb-0.5">
                  <span className="w-3 h-3 rounded-full bg-[#ed6a5e] border border-black/10" />
                  <span className="w-3 h-3 rounded-full bg-[#f4bf4f] border border-black/10" />
                  <span className="w-3 h-3 rounded-full bg-[#61c554] border border-black/10" />
                </div>
                <div className="hidden sm:flex items-center gap-3 text-gray-400 shrink-0 pb-0.5">
                  <ArrowLeft className="w-4 h-4" />
                  <ArrowRight className="w-4 h-4 opacity-40" />
                  <RotateCw className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 bg-white px-10 sm:px-28 py-1.5 rounded-lg shadow-sm border border-black/5 text-[12px] text-gray-600 font-medium tracking-wide max-w-full truncate">
                    <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                    rootin.app
                  </div>
                </div>
                <div className="w-20 shrink-0 flex justify-end items-center gap-3 text-gray-400 pb-0.5">
                  <Plus className="w-4 h-4" />
                  <Menu className="w-4 h-4" />
                </div>
              </div>

              {/* Inner viewport — 확장이 끝난 뒤부터 내부 내용이 위로 스크롤된다 */}
              <div className="flex-1 overflow-hidden relative">
                <motion.div style={{ y: contentY }} ref={contentRef}>
                  <SiteDescriptions onStart={onStart} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
