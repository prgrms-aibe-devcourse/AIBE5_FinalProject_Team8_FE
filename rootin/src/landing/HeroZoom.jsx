import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { RootinWordmark } from './RootinWordmark.jsx';
import { getLenis } from '../hooks/useSmoothScroll.js';
import bgImage from '../assets/images/bg.jpeg';

// window Lenis 가 활성일 땐 네이티브 scrollTo 와 충돌하므로 Lenis 경유로 부드럽게 이동한다.
const smoothScrollWindowTo = (top) => {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { duration: 1 });
  else window.scrollTo({ top, behavior: 'smooth' });
};

// 라벨 → 모니터 안 소개 섹션 id 매핑
const navItems = [
  { label: '소개', target: 'intro' },
  { label: '기능', target: 'features' },
  { label: '정원', target: 'feature-garden' },
  { label: 'AI 복습', target: 'feature-ai' },
];

// 히어로는 화면에 고정(sticky)되고, 아래의 모니터 섹션이 스크롤에 따라
// 이 위로 떠오른다. 따라서 히어로 자체는 스크롤 종속 페이드가 없다.
export const HeroZoom = ({ onStart, onNavigate }) => {
  // 스크롤을 시작하면(모니터가 떠오르기 시작) 스크롤 큐는 서서히 사라진다.
  const { scrollY } = useScroll();
  const cueOpacity = useTransform(scrollY, [0, 180], [1, 0]);
  const cuePointer = useTransform(scrollY, (v) => (v > 120 ? 'none' : 'auto'));

  return (
    <section className="sticky top-0 z-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-[#0A0A0A]">

      {/* Background Layer */}
      <div className="absolute inset-0 h-full w-full">
        <img
          src={bgImage}
          alt="Rootin 정원"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Background with Noise Simulation */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-radial-gradient(circle at 0 0, #fff 0, #fff 1px, transparent 1px, transparent 100%)', backgroundSize: '3px 3px' }} />
        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>

      {/* Hero Front UI Layer */}
      <div className="absolute inset-0 z-10">
        {/* Navbar */}
        <nav className="absolute left-1/2 top-0 z-30 -translate-x-1/2 w-full max-w-fit pointer-events-auto">
          <div className="flex items-center gap-6 sm:gap-8 md:gap-12 rounded-b-[2rem] bg-black px-6 sm:px-8 md:px-10 py-3 text-[10px] sm:text-[11px] uppercase tracking-widest shadow-2xl border-x border-b border-white/5">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={`#${item.target}`}
                onClick={(e) => { e.preventDefault(); onNavigate?.(item.target); }}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={onStart}
              className="uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
            >
              로그인
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 md:px-12 pb-12 md:pb-24 pointer-events-none">
          <div className="grid grid-cols-12 items-end gap-8">
            <div className="col-span-12 lg:col-span-8">
              <h1
                aria-label="Rootin"
                className="font-medium leading-[0.82] tracking-[-0.06em]"
                style={{ fontSize: "18vw", fontFamily: "var(--font-display)" }}
              >
                <RootinWordmark sproutBottom="0.55em" sproutShiftX="0.04em" />
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-6 lg:gap-8 pb-4 lg:col-span-4 pointer-events-auto">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-xs text-xs sm:text-sm leading-relaxed opacity-70 border-l border-white/20 pl-4"
              >
                Rootin은 매일의 학습 기록(TIL)을 식물로 키우는 게임형 학습 습관 서비스입니다. 오늘 배운 것을 심으면, 깊은 뿌리가 됩니다.
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                onClick={onStart}
                className="group flex w-fit items-center gap-3 rounded-full bg-[#E1E0CC] py-1.5 pl-6 pr-1.5 text-sm font-bold text-black"
              >
                지금 시작하기
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[#E1E0CC] transition-transform group-hover:scale-105">
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </span>
              </motion.button>

            </div>
          </div>
        </div>

        {/* 스크롤 유도 큐 — 스크롤하면 노트북 화면이 깨어나는 연출에 맞춰,
            작은 노트북이 뚜껑을 열고 화면에 불이 들어오는 모습을 반복한다. */}
        <motion.div
          style={{ opacity: cueOpacity }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.button
            type="button"
            onClick={() => smoothScrollWindowTo(window.innerHeight * 0.9)}
            style={{ pointerEvents: cuePointer }}
            aria-label="아래로 스크롤해 서비스 소개 보기"
            className="group flex flex-col items-center gap-2.5 text-[#E1E0CC]/70 transition-colors hover:text-[#E1E0CC]"
          >
            <span className="relative block" style={{ perspective: 160 }}>
              {/* 화면(뚜껑) — 닫힘(-82°)에서 열림(0°)으로 */}
              <motion.span
                className="relative mx-auto block h-[16px] w-[26px] rounded-[3px] border border-current"
                style={{ transformOrigin: 'bottom center', transformStyle: 'preserve-3d' }}
                animate={{ rotateX: [-82, 0, 0, -82] }}
                transition={{ duration: 3, times: [0, 0.35, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* 켜지는 화면 빛 */}
                <motion.span
                  className="absolute inset-[2px] block rounded-[1.5px] bg-current"
                  animate={{ opacity: [0, 0.85, 0.85, 0] }}
                  transition={{ duration: 3, times: [0, 0.4, 0.78, 0.95], repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.span>
              {/* 본체(키보드 데크) */}
              <span className="mx-auto -mt-px block h-[3px] w-[34px] rounded-b-[3px] rounded-t-[1px] bg-current" style={{ opacity: 0.85 }} />
            </span>

            <span className="flex flex-col items-center gap-1">
              <span className="text-[10px] tracking-widest sm:text-[11px]">스크롤해서 화면 깨우기</span>
              <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              </motion.span>
            </span>
          </motion.button>
        </motion.div>
      </div>

    </section>
  );
};
