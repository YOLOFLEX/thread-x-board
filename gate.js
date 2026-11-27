/* 비밀번호 게이트 + 90일 쿠키 + AES-GCM 복호화 */
(() => {
  const COOKIE = 'txb_k1';
  const DAYS = 90;

  const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64e = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

  function getCookie(name) {
    const hit = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
    return hit ? hit.slice(name.length + 1) : null;
  }
  function setCookie(name, val, days) {
    const exp = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${val}; expires=${exp}; path=/; SameSite=Lax`;
  }

  let meta = null;
  let cachedKey = null;

  async function loadMeta() {
    if (meta) return meta;
    const r = await fetch('./data/board.enc.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('데이터를 불러올 수 없습니다 (' + r.status + ')');
    meta = await r.json();
    return meta;
  }

  async function decryptWithKey(keyB64) {
    const m = await loadMeta();
    if (!cachedKey) {
      cachedKey = await crypto.subtle.importKey('raw', b64d(keyB64), 'AES-GCM', false, ['decrypt']);
    }
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(m.iv) }, cachedKey, b64d(m.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  async function deriveFromPassword(pw) {
    const m = await loadMeta();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64d(m.salt), iterations: m.iter, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
  }

  function showApp() {
    document.getElementById('lock').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  async function unlockWith(pw) {
    const key = await deriveFromPassword(pw);
    const raw = await crypto.subtle.exportKey('raw', key);
    const keyB64 = b64e(raw);
    const data = await decryptWithKey(keyB64);
    setCookie(COOKIE, keyB64, DAYS);
    window.__BOARD_DATA = data;
    window.__bootBoard(data);
    showApp();
  }

  // 외부에서 호출하는 진입점
  window.loadBoardData = async function () {
    const saved = getCookie(COOKIE);
    if (saved) {
      try {
        const data = await decryptWithKey(saved);
        showApp();
        return data;
      } catch (e) {
        document.cookie = COOKIE + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      }
    }
    return new Promise((resolve, reject) => {
      const input = document.getElementById('pw');
      const btn = document.getElementById('pwbtn');
      const err = document.getElementById('lockerr');
      input.focus();
      async function go() {
        const pw = input.value.trim();
        if (!pw) return;
        btn.disabled = true;
        btn.textContent = '확인 중';
        err.textContent = '';
        try {
          const key = await deriveFromPassword(pw);
          const raw = await crypto.subtle.exportKey('raw', key);
          const keyB64 = b64e(raw);
          const data = await decryptWithKey(keyB64);
          setCookie(COOKIE, keyB64, DAYS);
          showApp();
          resolve(data);
        } catch (e) {
          err.textContent = '비밀번호가 맞지 않습니다';
          input.value = '';
          input.focus();
        } finally {
          btn.disabled = false;
          btn.textContent = '열기';
        }
      }
      btn.addEventListener('click', go);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') go();
      });
    });
  };
})();
