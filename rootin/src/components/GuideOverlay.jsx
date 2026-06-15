import React, { useEffect, useState, useCallback } from 'react';

/**
 * 손그림 감성의 곡선 화살표를 그리는 컴포넌트입니다.
 * 시작점(from)과 끝점(to)을 기준으로 2차 베지에 곡선(Quadratic Bezier Curve)을 생성하여 부드럽게 꺾이는 화살표를 렌더링합니다.
 */
function CurvedArrow({ fromX, fromY, toX, toY, color = '#ff4d4d' }) {
  // 제어점(Control Point)을 계산하여 곡선의 꺾임 정도를 결정합니다.
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  // 약간의 오프셋을 주어 자연스럽게 휘어지도록 만듭니다.
  const cpX = midX + (toY - fromY) * 0.2;
  const cpY = midY - (toX - fromX) * 0.2;

  // 화살표 머리(촉)의 각도를 계산합니다.
  const angle = Math.atan2(toY - cpY, toX - cpX);
  const arrowSize = 8;
  const arrowX1 = toX - arrowSize * Math.cos(angle - Math.PI / 6);
  const arrowY1 = toY - arrowSize * Math.sin(angle - Math.PI / 6);
  const arrowX2 = toX - arrowSize * Math.cos(angle + Math.PI / 6);
  const arrowY2 = toY - arrowSize * Math.sin(angle + Math.PI / 6);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    >
      {/* 점선 곡선 경로 그리기 */}
      <path
        d={`M ${fromX} ${fromY} Q ${cpX} ${cpY} ${toX} ${toY}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="5, 4"
        strokeLinecap="round"
      />
      {/* 화살표 머리(삼각형) 그리기 */}
      <path
        d={`M ${toX} ${toY} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`}
        fill={color}
      />
    </svg>
  );
}

/**
 * GuideOverlay 컴포넌트
 * @param {boolean} isOpen - 가이드가 열려있는지 여부
 * @param {function} onClose - 가이드를 닫을 때 호출되는 함수
 * @param {Array} steps - 가이드할 항목들의 배열
 *   각 step 예시: { selector: '.className', text: '설명', arrowOffset: { x: -50, y: -30 } }
 */
export function GuideOverlay({ isOpen, onClose, steps = [] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // 새로운 가이드 단계 세트가 로드될 때(화면 변경 등)는 0번째 인덱스로 초기화합니다.
  useEffect(() => {
    setCurrentStep(0);
  }, [steps]);

  // 창 크기가 조절될 때마다 가이드 요소들의 위치를 재계산합니다.
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 화면의 DOM 요소를 추적하여 마스크를 씌우고 설명 글과 화살표의 시작/끝 좌표를 계산하는 함수입니다.
  const calculateCoords = useCallback(() => {
    if (!isOpen) return;

    const calculated = steps.map((step) => {
      const el = document.querySelector(step.selector);
      if (!el) {
        // 화면에 해당하는 요소가 없는 경우 가상의 좌표(화면 정중앙 + 현재 스크롤 위치)로 렌더링을 시도합니다.
        // 이를 통해 비동기 렌더링이나 조건부 마운트 등으로 특정 요소를 잠깐 찾지 못해도 가이드 투어가 깨지지 않고 연결됩니다.
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        
        const fromX = screenW / 2 + window.scrollX;
        const fromY = screenH / 2 + window.scrollY;
        
        return {
          ...step,
          visible: true,
          isFallback: true,
          targetRect: null,
          arrow: null,
          textPos: { x: fromX, y: fromY },
        };
      }

      const rect = el.getBoundingClientRect();
      // 스크롤 위치를 반영한 절대 좌표를 획득합니다.
      const top = rect.top + window.scrollY;
      const left = rect.left + window.scrollX;
      const width = rect.width;
      const height = rect.height;

      // 설명 상자의 배치 방향(placement)에 따라 화살표 시작점과 끝점을 동적으로 설정합니다.
      // from: 텍스트 박스 쪽 좌표, to: 타겟 컴포넌트 쪽 좌표
      let fromX = 0, fromY = 0, toX = 0, toY = 0;
      const textOffset = step.textOffset ?? { x: 0, y: 0 };

      // 글자 수와 줄 바꿈 수를 토대로 설명 상자의 실제 렌더링 높이에 가깝게 예측합니다.
      // 화살표 꼬리가 말풍선 외곽선에 붙어 보여야 하므로, 과도한 높이 보정은 피합니다.
      const estimatedLineCount = String(step.text)
        .split('\n')
        .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 18)), 0);
      const estimatedHeight = estimatedLineCount * 20 + 78; // 라인 높이 + 패딩/버튼 영역 보정
      
      const halfW = 120; // 설명 상자 maxWidth(240px)의 절반
      const halfH = estimatedHeight / 2;

      // 상자의 중심 좌표를 예측된 크기에 맞춰 동적으로 밀어냅니다.
      // 이렇게 하면 텍스트 분량에 의해 상자가 커져도 타겟 요소를 덮어 씌워 가리지 않게 됩니다.
      const margin = 36; // 화살표가 자연스러운 곡선 곡률을 갖도록 최소 간격 여백을 36px로 넉넉하게 늘립니다.

      if (step.placement === 'bottom') {
        toX = left + width / 2;
        toY = top + height + 7;
        fromX = toX + textOffset.x;
        fromY = toY + halfH + margin + textOffset.y;
      } else if (step.placement === 'top') {
        toX = left + width / 2;
        toY = top - 7;
        fromX = toX + textOffset.x;
        fromY = toY - halfH - margin + textOffset.y;
      } else if (step.placement === 'left') {
        toX = left - 7;
        toY = top + height / 2;
        fromX = toX - halfW - margin + textOffset.x;
        fromY = toY + textOffset.y;
      } else {
        // right (기본값)
        toX = left + width + 7;
        toY = top + height / 2;
        fromX = toX + halfW + margin + textOffset.x;
        fromY = toY + textOffset.y;
      }

      // [보정] 말풍선이 화면 밖으로 완전히 벗어나 잘리지 않도록 뷰포트(Viewport) 영역 안으로 가둡니다.
      // 상하좌우 최소 16px 여백을 유지하도록 텍스트 상자 중심점(fromX, fromY)을 제한(Clamp)합니다.
      const viewportMinY = window.scrollY + 16;
      const viewportMaxY = window.scrollY + window.innerHeight - 16;
      const viewportMinX = window.scrollX + 16;
      const viewportMaxX = window.scrollX + window.innerWidth - 16;

      // 말풍선의 윗변(fromY - halfH)과 아랫변(fromY + halfH)이 뷰포트 상/하단을 벗어나면 중심점 조정
      if (fromY - halfH < viewportMinY) {
        fromY = viewportMinY + halfH;
      }
      if (fromY + halfH > viewportMaxY) {
        fromY = viewportMaxY - halfH;
      }

      // 말풍선의 좌변(fromX - halfW)과 우변(fromX + halfW)이 뷰포트 좌/우측을 벗어나면 중심점 조정
      if (fromX - halfW < viewportMinX) {
        fromX = viewportMinX + halfW;
      }
      if (fromX + halfW > viewportMaxX) {
        fromX = viewportMaxX - halfW;
      }

      // 텍스트 상자의 중심 (fromX, fromY)에서 타겟 점 (toX, toY)를 향하는 벡터를 기반으로
      // 텍스트 상자의 경계면과 교차하는 정확한 지점을 계산합니다.
      let arrowFromX = fromX;
      let arrowFromY = fromY;

      const dx = toX - fromX;
      const dy = toY - fromY;

      const safetyMargin = 0; // 화살표 꼬리가 말풍선 외곽선에 자연스럽게 닿도록 여백을 두지 않습니다.

      if (dx !== 0 || dy !== 0) {
        // 사각형의 모서리를 향하는 임계 각도 비율과 타겟을 향하는 각도 비율을 비교합니다.
        if (Math.abs(dy) * halfW > Math.abs(dx) * halfH) {
          // 상단 또는 하단 변과 만나는 경우
          arrowFromY = dy > 0 ? fromY + halfH + safetyMargin : fromY - halfH - safetyMargin;
          arrowFromX = fromX + (dx * (arrowFromY - fromY)) / dy;
        } else {
          // 좌측 또는 우측 변과 만나는 경우
          arrowFromX = dx > 0 ? fromX + halfW + safetyMargin : fromX - halfW - safetyMargin;
          arrowFromY = fromY + (dy * (arrowFromX - fromX)) / dx;
        }
      }

      // 화살표 꼬리가 지나치게 짧아져 찌그러지거나 모양이 어색해지는 현상을 완벽하게 방지합니다.
      // 화살표의 실질적인 길이(arrowDistance)가 20px 미만이거나, 상자 중심과 타겟의 거리(centerDistance)가 45px 미만일 때는
      // 화살표를 표시하지 않고 깔끔한 설명 상자만 노출하도록 방어 코드를 작성합니다.
      const arrowDistance = Math.hypot(toX - arrowFromX, toY - arrowFromY);
      const centerDistance = Math.hypot(toX - fromX, toY - fromY);
      const hasValidArrow = arrowDistance >= 20 && centerDistance >= 45;

      return {
        ...step,
        visible: true,
        isFallback: false,
        targetRect: { top, left, width, height },
        arrow: hasValidArrow ? { fromX: arrowFromX, fromY: arrowFromY, toX, toY } : null,
        textPos: { x: fromX, y: fromY },
      };
    });

    setCoords(calculated);
  }, [isOpen, steps]);

  // 창 스크롤 및 윈도우 크기 변경 시에도 화살표와 상자가 엘리먼트를 실시간으로 따라다니도록 바인딩합니다.
  useEffect(() => {
    calculateCoords();
    window.addEventListener('scroll', calculateCoords);
    return () => window.removeEventListener('scroll', calculateCoords);
  }, [calculateCoords, windowSize]);

  // 가이드 단계 변경 시, 비동기 리렌더링 및 마운트 지연으로 인해 
  // 요소를 바로 찾지 못하는 예외 케이스를 대비하여 단계적으로 수차례 재조회를 실행합니다.
  useEffect(() => {
    if (!isOpen) return;

    const t1 = setTimeout(calculateCoords, 50);
    const t2 = setTimeout(calculateCoords, 150);
    const t3 = setTimeout(calculateCoords, 300);
    const t4 = setTimeout(calculateCoords, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [currentStep, isOpen, calculateCoords]);

  // 가이드 단계(currentStep)가 바뀔 때마다 각 화면 컴포넌트(예: 정원 화면 등)로 이벤트를 발행하여
  // 화면 모드 전환(예: editMode로 자동 전환) 등이 일어날 수 있도록 연동합니다.
  useEffect(() => {
    if (!isOpen || steps.length === 0) return;
    const activeStep = steps[currentStep];
    window.dispatchEvent(
      new CustomEvent('rootin-guide-step', {
        detail: {
          stepIndex: currentStep,
          isEnd: false,
          selector: activeStep?.selector,
          placement: activeStep?.placement,
        },
      })
    );
  }, [currentStep, isOpen, steps]);

  const closeGuide = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('rootin-guide-step', {
        detail: { isEnd: true },
      })
    );
    onClose?.();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: Math.max(document.documentElement.scrollHeight, window.innerHeight),
        backgroundColor: 'transparent', // 배경을 투명하게 하여 각 단계 하이라이트 박스의 boxShadow(9999px) 장막이 렌더링되게 합니다.
        zIndex: 9999,
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={closeGuide} // 장막의 빈 공간을 누르면 가이드가 종료됩니다.
    >
      {/* 도움말 가이드의 하단 안내 문구 */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--ink)',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '20px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span>💡 화면의 빈 공간을 클릭하면 가이드가 바로 종료됩니다.</span>
      </div>

      {/* 현재 단계의 가이드 타겟 하이라이트 박스 및 설명 텍스트 카드 렌더링 */}
      {(() => {
        const step = coords[currentStep];
        if (!step || !step.visible) return null;

        return (
          <React.Fragment>
            {/* 1. 타겟 요소를 투명하게 비추는 스포트라이트 박스 (주변은 9999px 그림자 장막으로 덮음) */}
            {!step.isFallback && step.targetRect && (
              <div
                style={{
                  position: 'absolute',
                  top: step.targetRect.top - 6,
                  left: step.targetRect.left - 6,
                  width: step.targetRect.width + 12,
                  height: step.targetRect.height + 12,
                  borderRadius: '12px',
                  // 9999px 거대한 그림자 장막으로 어둡게 처리하면서, 
                  // 타겟 박스 둘레에 2.5px 붉은색 테두리 및 15px의 부드러운 네온 레드 글로우 효과를 주어 
                  // "어느 영역에서 선택이 가능한지" 시각적으로 100% 명확히 드러나도록 표시합니다.
                  boxShadow: '0 0 0 9999px rgba(12, 17, 24, 0.82), 0 0 0 2.5px #ff4d4d, 0 0 15px rgba(255, 77, 77, 0.8)',
                  pointerEvents: 'none',
                  zIndex: 10000,
                }}
              />
            )}

            {/* 1-2. 폴백 상태(요소 미존재)일 때는 전체 화면을 덮는 일반 반투명 장막을 씌워줍니다. */}
            {step.isFallback && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(12, 17, 24, 0.82)',
                  pointerEvents: 'none',
                  zIndex: 10000,
                }}
              />
            )}

            {/* 2. 손그림 화살표 */}
            {!step.isFallback && step.arrow && (
              <CurvedArrow
                fromX={step.arrow.fromX}
                fromY={step.arrow.fromY}
                toX={step.arrow.toX}
                toY={step.arrow.toY}
                color="#ff4d4d"
              />
            )}

            {/* 3. 설명 텍스트 상자 */}
            <div
              style={{
                position: 'absolute',
                top: step.textPos.y,
                left: step.textPos.x,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                color: '#1a1a1a',
                padding: '16px 18px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                borderLeft: '4px solid #ff4d4d',
                zIndex: 10001,
                maxWidth: '240px',
                textAlign: 'center',
                fontFamily: 'var(--font-body)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
              onClick={(e) => e.stopPropagation()} // 설명 박스 내부 클릭 시 가이드가 종료되지 않도록 방지
            >
              {/* 설명 텍스트 */}
              <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: '1.5', whiteSpace: 'pre-line', color: 'var(--ink)' }}>
                {step.text}
              </div>

              {/* 하단 제어 및 페이지네이션 영역 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '8px' }}>
                {/* 진행도 표시 (예: 1 / 3) */}
                <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {currentStep + 1} / {steps.length}
                </span>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {currentStep > 0 && (
                    <button
                      onClick={() => setCurrentStep(p => p - 1)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '0.5px solid var(--rule-2)',
                        backgroundColor: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--ink-2)',
                        cursor: 'pointer',
                      }}
                    >
                      이전
                    </button>
                  )}
                  {currentStep < steps.length - 1 ? (
                    <button
                      onClick={() => setCurrentStep(p => p + 1)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--moss)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      다음
                    </button>
                  ) : (
                    <button
                      onClick={closeGuide}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--ink)',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })()}
    </div>
  );
}
