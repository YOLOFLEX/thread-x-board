const state = { data: null, q: '', cat: '전체' };

const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chars = (s) => s.replace(/\s+/g, '').length;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1600);
}

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  if (btn) {
    btn.classList.add('done');
    btn.textContent = '복사됨';
    setTimeout(() => {
      btn.classList.remove('done');
      btn.textContent = '복사';
    }, 1400);
  }
  toast('클립보드에 복사했습니다');
}

function fullText(piece) {
  const t = piece.tags && piece.tags.length ? piece.text + '\n\n' + piece.tags.join(' ') : piece.text;
  return t.trim();
}

function init(data) {
  if (state.data) return;
  state.data = data;
  $('#blogLink').href = data.blog;
  const total = data.posts.reduce((a, p) => a + p.threads.length + 1, 0);
  $('#metaLine').textContent =
    `${data.posts.length}개 글 · ${total}개 포스트 · 원본 ${data.blogTitle}`;
  $('#footMeta').textContent = `최종 업데이트 ${data.updated}`;

  const cats = ['전체', ...new Set(data.posts.map((p) => p.category))];
  $('#chips').innerHTML = cats
    .map((c) => `<button class="chip${c === '전체' ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join('');
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.cat = b.dataset.cat;
    [...document.querySelectorAll('.chip')].forEach((c) => c.classList.toggle('on', c === b));
    renderList();
  });

  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim().toLowerCase();
    renderList();
  });

  renderList();
  route();
}

function filtered() {
  return state.data.posts.filter((p) => {
    if (state.cat !== '전체' && p.category !== state.cat) return false;
    if (!state.q) return true;
    const hay = [p.sourceTitle, p.category, p.place, ...p.threads.map((t) => t.text), p.instagram.text]
      .join(' ')
      .toLowerCase();
    return hay.includes(state.q);
  });
}

function renderList() {
  const list = filtered();
  $('#empty').hidden = list.length > 0;
  $('#cards').innerHTML = list
    .map(
      (p) => `
    <a class="card" href="#/p/${encodeURIComponent(p.id)}">
      <div class="row1">
        <span class="tag cat">${esc(p.category)}</span>
        <span class="tag">${esc(p.place)}</span>
        <span>${esc(p.published)}</span>
      </div>
      <h3>${esc(p.sourceTitle)}</h3>
      <div class="plat">
        <span class="badge th">Threads ${p.threads.length}개</span>
        <span class="badge ig">Instagram ${chars(p.instagram.text)}자</span>
        <span class="badge">${p.threads.slice(0, 3).map((t) => esc(t.role)).join(' · ')}</span>
      </div>
    </a>`
    )
    .join('');
}

function blockHTML(pill, pillClass, label, count, text, tags) {
  const full = tags && tags.length ? text + '\n\n' + tags.join(' ') : text;
  return `
    <div class="block">
      <div class="bh">
        <div class="left">
          <span class="pill ${pillClass}">${pill}</span>
          <span>${esc(label)}</span>
          <span class="cnt">${count}</span>
        </div>
        <button class="copy" data-copy="${esc(full)}">복사</button>
      </div>
      <div class="body">${esc(text)}${tags && tags.length ? `\n\n<span class="tags">${esc(tags.join(' '))}</span>` : ''}</div>
    </div>`;
}

function renderDetail(p) {
  const th = p.threads
    .map((t) => blockHTML('Threads', 'th', t.role, `${chars(t.text)}자`, t.text, t.tags))
    .join('');
  const ig = blockHTML('Instagram', 'ig', '캡션', `${chars(p.instagram.text)}자`, p.instagram.text, p.instagram.tags);

  $('#detailView').innerHTML = `
    <div class="detail-head">
      <a class="back" href="#/">← 목록</a>
      <div class="row1" style="font-size:12px;color:var(--dim);margin-bottom:10px">
        <span class="tag cat">${esc(p.category)}</span>
        <span class="tag">${esc(p.place)}</span>
        <span>${esc(p.published)}</span>
      </div>
      <h1>${esc(p.sourceTitle)}</h1>
      <a class="src" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">네이버 블로그 원문 보기 ↗</a>
    </div>
    ${th}
    ${ig}
    <p style="color:var(--dim);font-size:12.5px;margin:22px 0 0">
      · 줄바꿈은 Threads 실측 규칙(한 줄 40자, 문단 1~2줄) 기준으로 검사 완료된 원고입니다.
    </p>`;
}

function route() {
  const m = location.hash.match(/^#\/p\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const p = state.data.posts.find((x) => x.id === id);
    if (!p) {
      location.hash = '#/';
      return;
    }
    renderDetail(p);
    $('#listView').hidden = true;
    $('#detailView').hidden = false;
    window.scrollTo({ top: 0 });
  } else {
    $('#listView').hidden = false;
    $('#detailView').hidden = true;
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('.copy');
  if (b) copy(b.dataset.copy, b);
});

window.addEventListener('hashchange', route);

window.__bootBoard = init;

window.loadBoardData()
  .then((data) => init(data))
  .catch((err) => {
    $('#metaLine').textContent = '데이터를 불러오지 못했습니다: ' + err.message;
  });
