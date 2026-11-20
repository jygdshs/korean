/* ============================================================
   인간실격 — 가면 : router · reveal · cursor · card news · test
   ============================================================ */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- word / letter reveal ---------- */
  // Walks child nodes: wraps every word in a mask + inner span, keeps <br> and inline tags (em, strong…).
  function splitWords(root, t0 = 0, step = 0.1) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (part === '') return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'word-wrapper';
            const inner = document.createElement('span'); inner.className = 'word-inner';
            inner.textContent = part;
            inner.style.animationDelay = `${(t0 + i * step).toFixed(3)}s`;
            i++;
            w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(root);
    return i; // number of words
  }

  function initHomeReveal() {
    const logo = $('.footer-logo-text');
    if (logo) {
      const text = logo.textContent.trim();
      logo.setAttribute('aria-label', text);
      logo.innerHTML = '';
      [...text].forEach((ch, idx) => {
        const wrap = document.createElement('span'); wrap.className = 'letter-wrapper'; wrap.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span'); inner.className = 'letter-inner';
        inner.textContent = ch === ' ' ? ' ' : ch;
        inner.style.animationDelay = `${idx * 0.09}s`;
        wrap.appendChild(inner); logo.appendChild(wrap);
      });
    }
    $$('.mega').forEach((m, i) => splitWords(m, 0.05 + i * 0.7, 0.1));
  }

  // card-level reveal: sequential groups so long paragraphs don't take forever
  function animateCard(card) {
    let t = 0.1;
    $$('.rv', card).forEach((el) => {
      const n = splitWords(el, t, Math.min(0.045, 0.7 / Math.max(1, 14)));
      t += 0.14 + Math.min(n * 0.02, 0.55);
    });
    $$('.fu', card).forEach((el, i) => { el.style.setProperty('--d', `${(t * 0.6 + i * 0.09).toFixed(2)}s`); });
  }

  /* ---------- cursor (ring follows instantly, glass pill lags) ---------- */
  function initCursor() {
    const card = $('#glass-card'), ring = $('#cursor-ring'), label = $('#cursor-label');
    if (!card || !ring || !finePointer) return;
    document.body.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    let first = true, inWindow = true, hovering = false;
    let cardScale = 0, ringScale = 0;
    window.__setCursorLabel = (html) => { label.innerHTML = html; };
    const interactive = 'a, button, .chip, .opt, summary, .progress i';
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY; inWindow = true;
      if (first) { cx = mx; cy = my; first = false; ring.classList.add('active'); }
      hovering = !!e.target.closest(interactive);
      ring.classList.toggle('expanded', hovering);
    });
    document.documentElement.addEventListener('mouseleave', () => { inWindow = false; });
    document.documentElement.addEventListener('mouseenter', () => { inWindow = true; });
    const tick = () => {
      cx += (mx - cx) * 0.08; cy += (my - cy) * 0.08;
      const showPill = inWindow && !hovering && document.body.dataset.view === 'home';
      card.classList.toggle('active', showPill && !first);
      cardScale += ((showPill ? 1 : 0) - cardScale) * 0.15;
      ringScale += ((inWindow ? (hovering ? 1.6 : 1) : 0) - ringScale) * 0.15;
      card.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) scale(${cardScale})`;
      ring.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%) scale(${ringScale})`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------- hero mask: eyes follow pointer, click = take it off ---------- */
  function initMask() {
    const svg = $('#mask'); if (!svg) return;
    const pupils = $('.pupils', svg), head = $('.head', svg), chip = $('#maskChip'), chipText = $('.mc-text', chip);
    document.addEventListener('mousemove', (e) => {
      const dx = (e.clientX / innerWidth - 0.5) * 2, dy = (e.clientY / innerHeight - 0.5) * 2;
      pupils.style.transform = `translate(${(dx * 5).toFixed(1)}px, ${(dy * 3).toFixed(1)}px)`;
    });
    const isOff = () => svg.classList.contains('off');
    const setOff = (off) => {
      svg.classList.toggle('off', off); svg.classList.remove('peek');
      chip.setAttribute('aria-pressed', String(off));
      chipText.textContent = off ? '다시 써볼까요?' : '가면을 벗어봐';
      window.__setCursorLabel && window.__setCursorLabel(off
        ? '<span class="text-white">다시</span> 웃어볼까?'
        : '<span class="text-white">가면을</span> 벗어봐');
    };
    const peek = (on) => { if (!isOff()) svg.classList.toggle('peek', on); };
    head.addEventListener('click', () => setOff(!isOff()));
    chip.addEventListener('click', () => setOff(!isOff()));
    ['mouseenter', 'focus'].forEach((ev) => chip.addEventListener(ev, () => peek(true)));
    ['mouseleave', 'blur'].forEach((ev) => chip.addEventListener(ev, () => peek(false)));
    head.addEventListener('pointerdown', () => peek(true));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => head.addEventListener(ev, () => peek(false)));
  }

  /* ============================================================
     CARD NEWS
     ============================================================ */
  const state = { masks: new Set(), card: 0 };
  const MASKS = [
    { id: 'work', label: '힘든데 “괜찮아요”라고 말했다', short: '회사·학교에서 괜찮은 척' },
    { id: 'sns', label: '행복해 보이는 사진만 올렸다', short: 'SNS에 행복한 모습만 연출' },
    { id: 'laugh', label: '웃기지 않은데 분위기 맞춰 웃었다', short: '분위기를 위해 억지로 웃음' },
    { id: 'family', label: '걱정시킬까 봐 가족에게 숨겼다', short: '가족에게 속마음 숨김' },
    { id: 'nosay', label: '싫은 부탁을 웃으며 받아줬다', short: '싫다는 말을 삼킴' },
    { id: 'none', label: '딱히 떠오르지 않는다', short: '' },
  ];

  const CARDS = [
    { kicker: 'Card News · 人間失格', wm: '假面', gx: '85%', gy: '12%', html: () => `
      <p class="kicker fu">인간실격 × 지금의 나</p>
      <h2 class="title xl rv">오늘, 당신은<br>어떤 <em>가면</em>을<br>썼나요?</h2>
      <p class="lead rv">1948년에 쓰인 소설 『인간 실격』이<br>지금의 나에게 건네는 질문.</p>
      <p class="small fu">오른쪽으로 넘겨보세요 · 키보드 ← → 도 돼요</p>` },

    { kicker: 'Question', wm: '問', gx: '10%', gy: '90%', html: () => `
      <p class="kicker fu">먼저, 떠올려 볼게요</p>
      <h2 class="title rv">최근, 어떤 <em>가면</em>을<br>쓴 기억이 있나요?</h2>
      <p class="lead rv">떠오르는 장면을 모두 골라보세요. 정답은 없어요.</p>
      <div class="chips fu" role="group" aria-label="가면을 쓴 기억">
        ${MASKS.map((m) => `<button class="chip" type="button" data-mask="${m.id}" aria-pressed="${state.masks.has(m.id)}">${m.label}</button>`).join('')}
      </div>` },

    { kicker: 'The Book', wm: '書', gx: '90%', gy: '8%', html: () => `
      <p class="kicker fu">책 소개</p>
      <h2 class="title rv">『인간 실격』은<br>어떤 책일까</h2>
      <div class="facts fu">
        <div class="fact"><small>작가</small><span>다자이 오사무<br>太宰治</span></div>
        <div class="fact"><small>발표</small><span>1948년<br>일본</span></div>
        <div class="fact"><small>구성</small><span>서문 · 세 개의 수기 · 후기</span></div>
        <div class="fact"><small>주인공</small><span>오바 요조</span></div>
      </div>
      <p class="lead rv">“<strong>인간이 두려워</strong> 끝내 웃음으로 자신을 가린 한 남자”의 기록. 그는 첫 문장부터 자신의 삶을 <em>부끄러움 많은 생애</em>라 고백한다.</p>` },

    { kicker: 'Note 01 · 익살', wm: '笑', gx: '15%', gy: '15%', html: () => `
      <p class="kicker fu">요조의 첫 번째 가면</p>
      <h2 class="title rv">요조의 첫 가면은<br><em>익살</em>이었다</h2>
      <p class="lead rv">어린 요조는 사람들의 삶이 이해되지 않았고, 그래서 사람이 무서웠다. 그가 찾아낸 방법은 하나. <strong>우스꽝스러운 짓으로 먼저 웃게 만드는 것.</strong></p>
      <blockquote class="q fu">“일부러 그랬지? 일부러.”<cite>둘째 수기 — 급우 다케이치가 중학생 요조의 연기를 꿰뚫어 본 순간</cite></blockquote>
      <p class="small fu">들킨 요조가 느낀 건 부끄러움이 아니라 <b style="color:#fff">공포</b>였다.</p>` },

    { kicker: 'Note 02 · 타락', wm: '落', gx: '88%', gy: '88%', html: () => `
      <p class="kicker fu">가면 뒤의 삶</p>
      <h2 class="title rv">가면이 두꺼워질수록,<br>삶은 <em>아래로</em></h2>
      <ul class="tl fu">
        <li><b>호리키</b>를 만나 술·담배·전당포·매춘으로 — 사람 대신 ‘도피처’에 기댄다</li>
        <li><b>쓰네코</b>와 동반 자살을 시도하지만, 상대만 숨지고 요조는 살아남는다</li>
        <li><b>시즈코</b> 모녀에게 기대어 살다가 스스로 떠난다</li>
        <li><b>요시코</b>와 결혼하나, 그녀에게 닥친 일을 목격하고 신뢰가 무너진다</li>
        <li><b>모르핀</b>에 빠져 끝내 정신병원에 갇힌다</li>
      </ul>
      <p class="small fu">가면 탓만은 아니다. 타인의 이기심과 배신도 그를 밀어냈다.</p>` },

    { kicker: 'Note 03 · 실격', wm: '失格', gx: '50%', gy: '0%', html: () => `
      <p class="kicker fu">마지막 수기</p>
      <h2 class="title rv">그리고,<br>“인간 <em>실격</em>”</h2>
      <p class="lead rv">병원에서 요조는 스스로를 <strong>인간의 자격을 잃은 사람</strong>이라 부른다. 수기는 이렇게 가라앉는다.</p>
      <blockquote class="q fu">“지금의 나에게는 행복도 불행도 없다. 모든 것은 그저 지나갈 뿐이다.”<cite>셋째 수기 말미 (필자 의역)</cite></blockquote>
      <p class="lead rv">후기의 바 마담은 그를 <strong>“신처럼 착한 아이”</strong>로 기억한다. 가면 뒤의 사람은, 끝내 아무에게도 알려지지 않았다.</p>` },

    { kicker: 'Then → Now', wm: '今', gx: '80%', gy: '10%', html: () => {
      const picked = MASKS.filter((m) => state.masks.has(m.id) && m.short);
      const echo = picked.length
        ? `<div class="echo fu"><b>당신이 고른 가면</b><br>${picked.map((m) => '· ' + m.short).join('<br>')}</div>`
        : `<div class="echo fu"><b>아직 고른 가면이 없어요.</b><br>괜찮아요. 다음 장들을 읽으며 하나씩 떠올려 봐요.</div>`;
      return `
      <p class="kicker fu">100년 전 이야기가, 오늘로</p>
      <h2 class="title rv">100년 전 사람인데,<br>낯설지 않다</h2>
      <div class="map fu">
        <div class="map-row"><span class="a">요조의 익살</span><span class="ar">→</span><span class="b">리액션 · 밈 · 셀프 디스</span></div>
        <div class="map-row"><span class="a">호리키와의 어울림</span><span class="ar">→</span><span class="b">술자리 · 인맥 · 트렌드 따라가기</span></div>
        <div class="map-row"><span class="a">“일부러”의 공포</span><span class="ar">→</span><span class="b">가면이 벗겨질까 봐 하는 불안</span></div>
      </div>
      ${echo}`; } },

    { kicker: 'Now · SNS', wm: '像', gx: '12%', gy: '10%', html: () => `
      <p class="kicker fu">현대의 가면 01</p>
      <h2 class="title rv">SNS: <em>하이라이트</em>만<br>남은 나</h2>
      <div class="split fu">
        <div class="pane on"><h4>게시물 속의 나</h4><p>여행, 성과, 웃는 얼굴</p><i class="sk" style="width:90%"></i><i class="sk" style="width:60%"></i></div>
        <div class="pane"><h4>실제의 나</h4><p>야근, 비교, 새벽 3시의 화면</p><i class="sk" style="width:70%"></i><i class="sk" style="width:85%"></i></div>
      </div>
      <p class="lead rv">올리기 전, 우리는 이미 <strong>사람들의 반응을 예상하며</strong> 사진을 고른다. 그 순간 관객이 생기고, 나는 요조처럼 연기를 시작한다.</p>
      <p class="small fu">문제는 연출 자체가 아니라, 연출한 모습만 “나”라고 믿기 시작할 때.</p>` },

    { kicker: 'Now · Work', wm: '職', gx: '90%', gy: '90%', html: () => `
      <p class="kicker fu">현대의 가면 02</p>
      <h2 class="title rv">회사: 웃는 얼굴이<br><em>업무</em>가 될 때</h2>
      <p class="lead rv">사회학자 혹실드(1983)는 느끼지 않는 감정을 겉으로만 표현하는 <strong>표면 연기</strong>와, 감정 자체를 바꾸려는 <strong>심층 연기</strong>를 구분했다.</p>
      <p class="lead rv">여러 연구가 표면 연기가 잦을수록 <strong>소진·피로</strong>와 연관된다고 보고한다 (Hülsheger &amp; Schewe, 2011).</p>
      <p class="small fu">퇴근하면 말수가 사라지는 건 성격이 아니라, 하루치 연기를 마친 몸일 수 있다.</p>` },

    { kicker: 'Now · Relations', wm: '友', gx: '8%', gy: '88%', html: () => `
      <p class="kicker fu">현대의 가면 03</p>
      <h2 class="title rv">관계: 분위기 메이커라는<br>이름의 <em>광대</em></h2>
      <ul class="tl fu">
        <li>웃기지 않아도 웃고, 맞장구를 친다</li>
        <li>싫은 부탁도 거절하지 못한다</li>
        <li>약해 보일 것 같으면 농담으로 넘긴다</li>
      </ul>
      <p class="lead rv">그렇게 쌓인 평판은 “편한 사람”. 정작 <strong>진짜 나를 아는 사람은 없다.</strong> 마담이 기억한 “신처럼 착한 아이”처럼.</p>` },

    { kicker: 'Why it hurts', wm: '疲', gx: '85%', gy: '8%', html: () => `
      <p class="kicker fu">가면이 남기는 것</p>
      <h2 class="title rv">가면이 남기는<br><em>세 가지</em></h2>
      <div class="trio fu">
        <div><h4>소진</h4><p>연기에는 에너지가 든다. 쉬어도 회복되지 않는 피로.</p></div>
        <div><h4>자기소외</h4><p>뭘 좋아하는지 헷갈리고, 가면이 어느새 얼굴처럼 느껴진다.</p></div>
        <div><h4>고립</h4><p>사람 속에서도 혼자. “들키면 떠날 것 같다”는 믿음.</p></div>
      </div>
      <p class="small fu">성공해도 “속였다”고 느끼는 임포스터 현상(Clance &amp; Imes, 1978)도 이 감각과 맞닿아 있다.</p>` },

    { kicker: 'But', wm: '兩', gx: '15%', gy: '12%', html: () => `
      <p class="kicker fu">오해하지 말아요</p>
      <h2 class="title rv">가면이 전부<br><em>나쁜 건</em> 아니다</h2>
      <p class="lead rv">역할에 맞추는 일은 어른의 기술이기도 하다. 문제는 <strong>벗을 수 없을 때</strong>, 가면이 얼굴을 대신할 때다.</p>
      <div class="split fu">
        <div class="pane"><h4>요조</h4><p>끝내 안전하게 벗을 곳을 찾지 못했고, 웃음 말고는 사람과 이어질 방법을 몰랐다.</p></div>
        <div class="pane on"><h4>우리</h4><p>벗을 수 있는 한 사람, 한 장소, 한 시간을 <b>고를 수 있다.</b></p></div>
      </div>` },

    { kicker: 'Try', wm: '解', gx: '90%', gy: '90%', html: () => `
      <p class="kicker fu">해결 방법</p>
      <h2 class="title rv">오늘 해볼 수 있는<br><em>네 가지</em></h2>
      <ol class="steps fu">
        <li><b>가면에 이름 붙이기</b>“지금 나는 ‘괜찮은 사람’ 가면 중.”</li>
        <li><b>한 사람에게 한 조각</b>안전한 사람에게 작은 진심 하나. “오늘 좀 힘들었어.”</li>
        <li><b>가면 없는 10분</b>평가하는 눈이 없는 시간. 산책, 손글씨, 혼잣말.</li>
        <li><b>‘일부러’ 점검</b>말하기 전 “내가 원해서? 미움받기 싫어서?” 한 번 묻기.</li>
      </ol>
      <p class="small fu">버거운 상태가 이어진다면 전문가의 도움을 받는 것도 좋은 선택이에요.</p>` },

    { kicker: 'Message', wm: '素', gx: '50%', gy: '100%', html: () => `
      <p class="kicker fu">가장 중요한 한 줄</p>
      <h2 class="title xl rv">인간 실격은<br>판결이 아니라,<br><em>경고</em>였다</h2>
      <p class="lead rv">요조는 끝내 가면을 벗지 못했지만, 우리는 지금 알아차릴 수 있다. <strong>내 가면은 지금 어느 정도일까?</strong></p>
      <div class="cta-row fu">
        <a class="btn btn-lg" href="#/test">나의 가면 검사하기 <span class="blinking-dot" style="background:var(--ink)"></span></a>
        <button class="btn line" type="button" data-act="restart">처음부터 다시</button>
      </div>` },
  ];

  const deck = $('#deck'), progress = $('#progress'), prevBtn = $('#prev'), nextBtn = $('#next'), countEl = $('#count');
  progress.innerHTML = CARDS.map(() => '<i></i>').join('');

  function renderCard(i, dir = 1, instant = false) {
    i = Math.max(0, Math.min(CARDS.length - 1, i));
    const make = () => {
      const c = CARDS[i];
      const el = document.createElement('article');
      el.className = 'card';
      el.setAttribute('aria-label', `카드 ${i + 1} / ${CARDS.length}`);
      el.style.setProperty('--gx', c.gx); el.style.setProperty('--gy', c.gy);
      el.innerHTML = `
        <div class="card-head"><span><b>${String(i + 1).padStart(2, '0')}</b> / ${CARDS.length}</span><span>${c.kicker}</span></div>
        <div class="card-body">${c.html()}</div>
        <span class="wm" aria-hidden="true">${c.wm}</span>`;
      deck.replaceChildren(el);
      if (!reduce) animateCard(el);
      else $$('.rv,.fu', el).forEach((n) => { n.style.opacity = 1; n.style.transform = 'none'; n.style.animation = 'none'; });
      state.card = i;
      $$('i', progress).forEach((p, k) => { p.className = k < i ? 'done' : k === i ? 'now' : ''; });
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === CARDS.length - 1;
      countEl.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> / ${CARDS.length}`;
      if (location.hash !== `#/cards/${i + 1}`) history.replaceState(null, '', `#/cards/${i + 1}`);
    };
    const old = deck.firstElementChild;
    if (old && !instant && !reduce) {
      old.style.setProperty('--dir', `${-14 * dir}px`);
      old.classList.add('leaving');
      setTimeout(make, 200);
    } else make();
  }

  deck.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      const id = chip.dataset.mask;
      if (id === 'none') { state.masks.clear(); state.masks.add('none'); }
      else { state.masks.delete('none'); state.masks.has(id) ? state.masks.delete(id) : state.masks.add(id); }
      $$('.chip', deck).forEach((c) => c.setAttribute('aria-pressed', String(state.masks.has(c.dataset.mask))));
      return;
    }
    if (e.target.closest('[data-act="restart"]')) renderCard(0, -1);
  });
  prevBtn.addEventListener('click', () => renderCard(state.card - 1, -1));
  nextBtn.addEventListener('click', () => renderCard(state.card + 1, 1));
  progress.addEventListener('click', (e) => {
    const k = $$('i', progress).indexOf(e.target.closest('i'));
    if (k > -1) renderCard(k, k > state.card ? 1 : -1);
  });
  // swipe
  let sx = null, sy = null;
  deck.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  deck.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) renderCard(state.card + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  /* ============================================================
     TEST
     ============================================================ */
  const Q = [
    // PART A — 가면 사용 정도
    ['SNS에 올리는 내 모습은 실제 일상보다 눈에 띄게 좋게 편집되어 있다.', 'A', 'sns'],
    ['사진이나 글을 고를 때, 사람들의 반응(좋아요·조회수)을 먼저 예상한다.', 'A', 'sns'],
    ['속상한 날에도 SNS에는 괜찮은 척하는 게시물을 올린 적이 있다.', 'A', 'sns'],
    ['별로 웃기지 않아도 분위기를 위해 웃거나 맞장구를 친다.', 'A', 'soc'],
    ['싫은 부탁도 거절하면 미움받을까 봐 받아들인다.', 'A', 'soc'],
    ['직장·학교 사람들 앞의 나와 가까운 사람 앞의 나는 거의 다른 사람 같다.', 'A', 'soc'],
    ['불안하거나 어색할 때 농담이나 과장된 리액션으로 넘기는 편이다.', 'A', 'joke'],
    ['사람들이 나를 ‘밝고 편한 사람’으로 여기도록 의식적으로 행동한다.', 'A', 'joke'],
    ['속마음이나 약점이 드러날 것 같으면 화제를 돌린다.', 'A', 'joke'],
    ['누구 앞에서든 내 생각과 감정을 있는 그대로 말하는 편이다.', 'A', 'joke', true],
    // PART B — 영향
    ['사람들과 있다가 돌아오면 이유 없이 기운이 다 빠진다.', 'B', 'burn'],
    ['괜찮은 척하느라 쓰는 에너지 때문에 쉬어도 잘 회복되지 않는다.', 'B', 'burn'],
    ['내가 진짜 무엇을 좋아하고 원하는지 헷갈릴 때가 있다.', 'B', 'self'],
    ['가면을 쓴 모습이 어느새 ‘진짜 나’처럼 느껴질 때가 있다.', 'B', 'self'],
    ['나는 내가 어떤 사람인지 비교적 분명하게 안다.', 'B', 'self', true],
    ['많은 사람 속에 있어도 아무도 진짜 나를 모른다고 느낀다.', 'B', 'iso'],
    ['진짜 모습을 보여주면 사람들이 떠날 것 같다.', 'B', 'iso'],
    ['가면이 벗겨질까 봐 마음 한쪽이 늘 불안하다.', 'B', 'fear'],
    ['칭찬을 받아도 ‘내가 속였다’는 생각에 마음이 편치 않다.', 'B', 'fear'],
    ['실수나 약한 모습을 들켜도 크게 불안하지 않다.', 'B', 'fear', true],
  ].map(([text, axis, sub, rev]) => ({ text, axis, sub, rev: !!rev }));
  const SUBS = {
    sns: ['SNS 연출', 'A', 'SNS: 올리기 전에 “이 사진은 누구를 위한 걸까?” 한 번 물어보기'],
    soc: ['사회적 순응', 'A', '“그건 어려울 것 같아요”를 가장 부담 없는 상황에서 한 번 연습해보기'],
    joke: ['익살·회피', 'A', '농담으로 넘기려는 순간 멈추고, 진심 한 문장만 말해보기'],
    burn: ['소진', 'B', '일정 사이에 사람 없는 10분을 먼저 확보하기 — 회복은 의지가 아니라 공백에서 와요'],
    self: ['자기소외', 'B', '하루 한 번 “오늘 나는 뭘 원했지?”를 메모하기 (남의 기준 말고 내 기준으로)'],
    iso: ['고립', 'B', '가장 안전한 한 사람에게 작은 진심 하나만 꺼내보기'],
    fear: ['발각 공포', 'B', '작은 약점을 일부러 드러내 보고 “별일 없네”를 경험해보기'],
  };
  const LABELS = ['전혀 그렇지 않다', '그렇지 않은 편이다', '보통이다', '그런 편이다', '매우 그렇다'];
  const TYPES = {
    bare: { name: '맨얼굴에 가까운 사람', book: '가면을 쓰기 전의 요조', desc: '꾸밈이 많지 않고, 그래서 크게 지치지도 않는 상태예요. 가면이 적다는 건 서툴다는 뜻이 아니라, 있는 그대로 둬도 괜찮은 관계와 환경이 곁에 있다는 신호일 수 있어요.', tips: ['지금의 균형을 만든 관계와 습관이 무엇인지 적어두기', '가면을 쓰느라 힘든 사람이 곁에 있다면, 안전한 한 사람이 되어주기'] },
    clown: { name: '능숙한 광대', book: '첫째 수기 — 익살이 통하던 시절의 요조', desc: '가면을 꽤 자주, 능숙하게 쓰지만 아직 큰 대가는 치르지 않는 상태예요. 요조도 처음엔 웃음으로 모든 게 잘 넘어갔어요. 지금은 괜찮아도 벗는 연습 없이 가면만 늘면, 어느 날 피로가 한꺼번에 올 수 있어요.', tips: ['피로가 낮은 지금, 가면 없는 시간을 하루 10분 먼저 만들어두기', '말하기 전 “내가 원해서? 미움받기 싫어서?” 한 번만 점검하기'] },
    tired: { name: '맨얼굴인데 지친 사람', book: '이 검사가 가리키는 건 가면이 아닐 수 있어요', desc: '가면을 많이 쓰지는 않는데 소진·소외감은 높게 나왔어요. 가면보다 업무량, 수면, 최근의 사건 같은 다른 요인이 크게 작용하고 있을 수 있어요. 그 피로는 “내가 약해서”가 아닐 수 있습니다.', tips: ['피로의 원인을 가면 외에도 적어보기 (수면·업무량·관계·건강)', '이런 상태가 2주 이상 이어진다면 전문가와 이야기해보기'] },
    eaten: { name: '가면에 먹히는 중인 사람', book: '둘째~셋째 수기의 요조', desc: '가면을 자주 쓰고, 그 대가도 크게 느끼고 있어요. 가면과 얼굴의 경계가 흐려질수록 쉬어도 쉬는 것 같지 않죠. 요조가 겪은 건 어느 날의 추락이라기보다 이런 피로의 누적에 가까웠어요. 하지만 요조와 달리, 당신은 지금 알아차렸어요.', tips: ['오늘은 가면 하나만 줄이기 — 가장 덜 위험한 곳부터', '안전한 한 사람에게 “사실 요즘 좀 힘들어” 한 문장 전하기', '힘든 상태가 2주 이상 이어지면 상담·진료 고려하기'] },
  };

  const tEl = {
    intro: $('#t-intro'), q: $('#t-q'), part: $('#t-part'), res: $('#t-res'),
    qTop: $('#q-top'), bar: $('#q-bar'), qText: $('#q-text'), opts: $('#q-opts'), back: $('#q-back'),
    partNum: $('#part-num'), partTitle: $('#part-title'), partLead: $('#part-lead'),
  };
  const T = { i: 0, ans: new Array(Q.length).fill(0) };

  function showT(name) {
    document.body.toggleAttribute('data-res', name === 'res');
    ['intro', 'q', 'part', 'res'].forEach((k) => tEl[k].classList.toggle('show', k === name));
    window.scrollTo({ top: 0 });
  }
  function resetTest() { T.i = 0; T.ans.fill(0); showT('intro'); }

  function renderQ() {
    const q = Q[T.i];
    tEl.qTop.innerHTML = `<b>Part ${q.axis} · ${q.axis === 'A' ? '가면 사용' : '가면의 영향'}</b><span>${String(T.i + 1).padStart(2, '0')} / ${Q.length}</span>`;
    tEl.bar.style.transform = `scaleX(${T.i / Q.length})`;
    tEl.qText.textContent = q.text;
    if (!reduce) { tEl.qText.classList.remove('rv'); tEl.qText.classList.add('rv'); splitWords(tEl.qText, 0, 0.035); }
    tEl.opts.innerHTML = LABELS.map((l, k) => `<button class="opt${T.ans[T.i] === k + 1 ? ' sel' : ''}" type="button" data-v="${k + 1}"><kbd>${k + 1}</kbd>${l}</button>`).join('');
    tEl.back.disabled = T.i === 0;
    showT('q');
  }
  function answer(v) {
    T.ans[T.i] = v;
    $$('.opt', tEl.opts).forEach((o) => o.classList.toggle('sel', +o.dataset.v === v));
    setTimeout(() => {
      if (T.i === Q.length - 1) return showResult();
      T.i++;
      if (T.i === 10 && !T.seenPart2) { T.seenPart2 = true; return showPart2(); }
      renderQ();
    }, reduce ? 0 : 260);
  }
  function showPart2() {
    tEl.bar.style.transform = 'scaleX(.5)';
    showT('part');
  }
  tEl.opts.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) answer(+o.dataset.v); });
  tEl.back.addEventListener('click', () => { if (T.i > 0) { T.i--; renderQ(); } });
  $('#t-start').addEventListener('click', () => { T.seenPart2 = false; renderQ(); });
  $('#part-go').addEventListener('click', renderQ);

  function score(axis) {
    const idx = Q.map((q, i) => i).filter((i) => Q[i].axis === axis);
    return Math.round(((idx.reduce((s, i) => s + (Q[i].rev ? 6 - T.ans[i] : T.ans[i]), 0) - idx.length) / (idx.length * 4)) * 100);
  }
  function subScore(key) {
    const idx = Q.map((q, i) => i).filter((i) => Q[i].sub === key);
    return Math.round(((idx.reduce((s, i) => s + (Q[i].rev ? 6 - T.ans[i] : T.ans[i]), 0) - idx.length) / (idx.length * 4)) * 100);
  }
  const level = (s) => (s < 34 ? '낮음' : s < 67 ? '중간' : '높음');

  function showResult() {
    const A = score('A'), B = score('B');
    const key = A >= 50 ? (B >= 50 ? 'eaten' : 'clown') : (B >= 50 ? 'tired' : 'bare');
    const ty = TYPES[key];
    const subs = Object.keys(SUBS).map((k) => ({ k, s: subScore(k), axis: SUBS[k][1] }));
    const topA = subs.filter((x) => x.axis === 'A').sort((a, b) => b.s - a.s)[0];
    const topB = subs.filter((x) => x.axis === 'B').sort((a, b) => b.s - a.s)[0];
    const tips = [...ty.tips];
    if (topA.s >= 50) tips.push(SUBS[topA.k][2]);
    if (topB.s >= 50) tips.push(SUBS[topB.k][2]);

    const quad = (x, y, txt, on) => `<text class="q-l${on ? ' act' : ''}" x="${x}" y="${y}" text-anchor="${x < 160 ? 'start' : 'end'}">${txt}</text>`;
    tEl.res.innerHTML = `
      <div class="bento">
      <div class="bx bx-hero fu">
        <p class="t-eyebrow">Your mask</p>
        <h2 class="r-type rv">${ty.name}</h2>
        <span class="r-book">${ty.book}</span>
        <p class="t-lead">${ty.desc}</p>
      </div>
      <div class="bx bx-score fu">
        <h3>두 개의 축</h3>
        <div class="score"><b data-count="${A}">0</b><span>/ 100</span><em>가면 사용 · ${level(A)}</em></div>
        <div class="bar"><i data-w="${A}"></i></div>
        <div class="score" style="margin-top:1.1rem"><b data-count="${B}">0</b><span>/ 100</span><em>영향 · ${level(B)}</em></div>
        <div class="bar"><i data-w="${B}"></i></div>
      </div>
      <div class="bx bx-matrix fu">
        <h3>나의 위치</h3>
        <svg class="matrix" viewBox="0 0 320 320" role="img" aria-label="가면 사용 ${A}점, 영향 ${B}점의 위치를 나타낸 도표">
          <rect x="0.5" y="0.5" width="319" height="319" rx="18" fill="none" stroke="rgba(28,25,23,.14)"/>
          <line x1="160" y1="8" x2="160" y2="312" stroke="rgba(28,25,23,.12)" stroke-dasharray="3 5"/>
          <line x1="8" y1="160" x2="312" y2="160" stroke="rgba(28,25,23,.12)" stroke-dasharray="3 5"/>
          ${quad(16, 30, '맨얼굴인데 지친 사람', key === 'tired')}${quad(304, 30, '가면에 먹히는 중', key === 'eaten')}
          ${quad(16, 306, '맨얼굴에 가까운 사람', key === 'bare')}${quad(304, 306, '능숙한 광대', key === 'clown')}
          <g class="dot" data-x="${(A / 100) * 280 + 20}" data-y="${300 - (B / 100) * 280}">
            <circle r="16" fill="rgba(255,111,150,.22)"/><circle r="6.5" fill="#FF6F96" stroke="#1C1917" stroke-width="1.5"/>
          </g>
        </svg>
        <p class="small" style="margin-top:.6rem;text-align:center">가로 → 가면 사용 · 세로 ↑ 영향</p>
      </div>
      <div class="bx bx-sub fu">
        <h3>세부 영역</h3>
        <div class="sub">${subs.map((x) => `<div><span>${SUBS[x.k][0]}</span><span class="bar"><i data-w="${x.s}"></i></span><b>${x.s}</b></div>`).join('')}</div>
      </div>
      <div class="bx bx-tips fu">
        <h3>오늘의 한 걸음</h3>
        <ul class="r-list">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>
      </div>
      ${B >= 75 ? `<div class="care fu"><b>요즘 많이 힘드셨다면, 혼자 견디지 않아도 괜찮아요.</b><br>자살예방 상담전화 <b>109</b> (24시간) · 정신건강 위기상담전화 <b>1577-0199</b></div>` : ''}
      <div class="r-actions fu">
        <button class="btn" type="button" id="r-copy">결과 복사하기</button>
        <a class="btn line" href="#/cards/13">해결 방법 다시 보기</a>
        <button class="btn line" type="button" id="r-retry">다시 검사하기</button>
      </div>
      <details class="note fu"><summary>이 검사의 한계와 근거</summary>
        <p>이 검사는 『인간 실격』의 주제를 바탕으로 만든 <b>자체 성찰 도구</b>이며, 타당도·신뢰도 검증을 거치지 않았습니다. <b>의학적·심리학적 진단이 아닙니다.</b> 점수는 지금 이 순간의 나를 돌아보는 참고용이에요.</p>
        <ul><li>표면 연기·감정노동 — Hochschild (1983)</li><li>임포스터 현상 — Clance &amp; Imes (1978)</li><li>진정성과 자기소외 — Wood et al. (2008)</li><li>자기 감시 — Snyder (1974)</li></ul>
        <p>응답은 이 브라우저 안에서만 계산되며 어디에도 저장·전송되지 않아요.</p>
      </details>`;
    showT('res');
    tEl.bar.style.transform = 'scaleX(1)';
    animateCard(tEl.res);
    requestAnimationFrame(() => setTimeout(() => {
      $$('[data-w]', tEl.res).forEach((b) => { b.style.transform = `scaleX(${b.dataset.w / 100})`; });
      const dot = $('.dot', tEl.res); dot.style.transform = `translate(${dot.dataset.x}px, ${dot.dataset.y}px)`;
      $$('[data-count]', tEl.res).forEach((n) => {
        const to = +n.dataset.count; const t0 = performance.now();
        const step = (t) => { const p = Math.min(1, (t - t0) / 1200); n.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }, 350));
    const summary = `[인간실격 가면 검사] 가면 사용 ${A}점 · 영향 ${B}점 → ${ty.name}`;
    $('#r-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(summary); toast('결과를 복사했어요'); }
      catch { toast(summary); }
    });
    $('#r-retry').addEventListener('click', () => { T.seenPart2 = false; resetTest(); });
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const view = document.body.dataset.view;
    if (view === 'cards') {
      if (e.key === 'ArrowRight') renderCard(state.card + 1, 1);
      else if (e.key === 'ArrowLeft') renderCard(state.card - 1, -1);
    } else if (view === 'test' && tEl.q.classList.contains('show')) {
      if (/^[1-5]$/.test(e.key)) answer(+e.key);
      else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { if (T.i > 0) { T.i--; renderQ(); } }
    }
  });

  /* ---------- router ---------- */
  let homeInit = false;
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, arg] = h.split('/');
    const view = name === 'cards' ? 'cards' : name === 'test' ? 'test' : 'home';
    const changed = document.body.dataset.view !== view;
    document.body.dataset.view = view;
    const navKey = view === 'cards' ? ({ 3: 'book', 13: 'solve' }[parseInt(arg, 10)] || 'cards') : view;
    $$('.pillnav a').forEach((a) => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (view === 'home') {
      if (!homeInit) { homeInit = true; initHomeReveal(); }
      document.title = '인간실격 — 당신의 가면은 안녕한가요?';
    } else if (view === 'cards') {
      const n = Math.max(1, Math.min(CARDS.length, parseInt(arg, 10) || 1)) - 1;
      document.title = '카드뉴스 — 인간실격';
      if (changed || !deck.firstElementChild) renderCard(n, 1, true);
      else if (n !== state.card) renderCard(n, n > state.card ? 1 : -1);
      window.scrollTo({ top: 0 });
    } else {
      document.title = '가면 검사 — 인간실격';
      if (changed) resetTest();
    }
  }
  window.addEventListener('hashchange', route);

  document.addEventListener('DOMContentLoaded', () => {
    initCursor();
    initMask();
    route();
  });
})();
