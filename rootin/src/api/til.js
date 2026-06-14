import { request } from './client.js';

// =====================================================================
// TIL 발행
// =====================================================================

// POST /api/v1/tils
// Body: { title, content, potId, tags }
export async function createTil({ title, content, potId, tags }) {
  const res = await request('/api/v1/tils', {
    method: 'POST',
    body: JSON.stringify({ title, content, potId, tags }),
  });
  return res.data;
}

// GET /api/v1/tils/me?potId=&page=&size=&sort=&keyword=&tag=
// 내 발행 완료 TIL 목록을 조회합니다. potId를 넘기면 특정 화분의 TIL만 가져옵니다.
// keyword, tag는 BE 구현 후 서버사이드 필터링에 연결 예정
export async function getMyTils({ potId, page = 0, size = 10, sort = 'latest', keyword, tag, signal } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  });

  if (potId != null) params.set('potId', String(potId));
  if (keyword)       params.set('keyword', keyword);
  if (tag)           params.set('tag', tag);

  const res = await request(`/api/v1/tils/me?${params.toString()}`, { signal });
  return res.data;
}

// GET /api/v1/tils/{tilId}
// 특정 TIL의 상세 내용을 조회합니다.
export async function getTil(tilId) {
  const res = await request(`/api/v1/tils/${tilId}`);
  return res.data;
}

// DELETE /api/v1/tils/{tilId}
// 발행된 TIL을 삭제합니다. (204 No Content)
export async function deleteTil(tilId) {
  await request(`/api/v1/tils/${tilId}`, { method: 'DELETE' });
}

// PUT /api/v1/tils/{tilId}
// 발행된 TIL의 제목, 본문, 태그를 수정합니다.
export async function updateTil(tilId, { title, content, tags }) {
  const res = await request(`/api/v1/tils/${tilId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content, tags }),
  });
  return res.data;
}

// =====================================================================
// 임시저장 (화분당 1개)
// =====================================================================

// 임시저장 저장/덮어쓰기
// POST /api/v1/tils/draft
// Body: { potId, title, content, tags }
export async function saveDraft({ potId, title, content, tags }) {
  const res = await request('/api/v1/tils/draft', {
    method: 'POST',
    body: JSON.stringify({ potId, title, content, tags }),
  });
  return res.data;
}

// 임시저장 불러오기 — 없으면(404) null 반환
// GET /api/v1/tils/draft?potId=
export async function getDraft(potId) {
  try {
    const res = await request(`/api/v1/tils/draft?potId=${potId}`);
    return res.data;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// 임시저장 삭제 — 없어도(404) 조용히 무시
// DELETE /api/v1/tils/draft?potId=  → 204
export async function deleteDraft(potId) {
  try {
    await request(`/api/v1/tils/draft?potId=${potId}`, { method: 'DELETE' });
  } catch (err) {
    if (err.status !== 404) throw err;
  }
}

// =====================================================================
// 템플릿 (사용자 템플릿 + 기본 제공 템플릿)
// =====================================================================

// 템플릿 목록 조회
// GET /api/v1/til-templates
export async function getTemplates() {
  const res = await request('/api/v1/til-templates');
  return res.data;
}

// 템플릿 저장
// POST /api/v1/til-templates
// Body: { title, content }
export async function createTemplate({ title, content }) {
  const res = await request('/api/v1/til-templates', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });
  return res.data;
}

// 템플릿 삭제
// DELETE /api/v1/til-templates/{templateId}  → 204
export async function deleteTemplate(templateId) {
  await request(`/api/v1/til-templates/${templateId}`, { method: 'DELETE' });
}
