import { TilEditorPage } from '@/components/til/til-editor-page';

function EditorScreen({ onNav, initialSelectedPotId, initialTil, afterPublishScreen, onPublished, focusMode, onToggleFocus }) {
  // 기존의 EditorScreen 내용은 text-editor-design.zip의 디자인으로 완벽하게 교체되었습니다.
  // 사용자의 요청("무조건 이 zip랑 똑같이 구현되게 해줘")에 따라 TilEditorPage 컴포넌트를 그대로 렌더링합니다.
  return (
    <TilEditorPage
      onNav={onNav}
      initialSelectedPotId={initialSelectedPotId}
      initialTil={initialTil}
      afterPublishScreen={afterPublishScreen}
      onPublished={onPublished}
      focusMode={focusMode}
      onToggleFocus={onToggleFocus}
    />
  );
}

export { EditorScreen };
