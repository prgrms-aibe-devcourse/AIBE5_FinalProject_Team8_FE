import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

// 'Rootin' 워드마크 — i를 점 없는 글자(ı)로 두고 그 위에 새싹을 얹는다.
// (Rootin-logo-source.html 03 "글자에 새싹 넣기"). 크기·폰트는 부모에서 상속.
// leaf1/leaf2: 새싹 잎 색(어두운 배경엔 밝게, 밝은 배경엔 진하게). animate: 등장 애니메이션.
export const RootinWordmark = ({ leaf1 = '#74C98C', leaf2 = '#A6E0B6', animate = true }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const sprout = (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {'ı'}
      <svg
        viewBox="0 0 30 20"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '0.6em',
          transform: 'translateX(-50%)',
          width: '0.5em',
          height: '0.33em',
          overflow: 'visible',
        }}
      >
        <path d="M15 18 C9 18 5 15 4 8 C12 8 16 12 15 18 Z" fill={leaf1} />
        <path d="M15 16 C21 16 25 13 26 6 C18 6 14 10 15 16 Z" fill={leaf2} />
      </svg>
    </span>
  );

  if (!animate) {
    return (
      <span style={{ display: 'inline-block' }}>
        Root{sprout}n
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      initial={{ y: 28, opacity: 0 }}
      animate={isInView ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="inline-block"
    >
      Root{sprout}n
    </motion.span>
  );
};
