import { TilEditorPage } from '@/components/til-classic/til-editor-page';

// classic 테마 에디터 — 게임보이 개편 이전(origin/main)의 TilEditorPage(til-classic 트리)를 렌더한다.
// 게임보이판 screens-editor.jsx와 동일한 props를 받는다.
function EditorScreen({ onNav, initialSelectedPotId, initialTil, afterPublishScreen, onPublished, onSelectedPotChange, focusMode, onToggleFocus }) {
  return (
    <TilEditorPage
      onNav={onNav}
      initialSelectedPotId={initialSelectedPotId}
      initialTil={initialTil}
      afterPublishScreen={afterPublishScreen}
      onPublished={onPublished}
      onSelectedPotChange={onSelectedPotChange}
      focusMode={focusMode}
      onToggleFocus={onToggleFocus}
    />
  );
}

export { EditorScreen };
