/* MusicOne — measure board
   Time signature picker, four toggleable measures, and rhythm-pattern art. */

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     Background light field parallax
     ====================================================================== */

  (function lights() {
    const glows = Array.from(document.querySelectorAll('.glow'));
    if (!glows.length || reducedMotion) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    /* Pixels of travel per glow. Varied values create a sense of depth. */
    const DEPTH = [42, -30, 26, -16, 34];

    window.addEventListener(
      'pointermove',
      (event) => {
        targetX = event.clientX / window.innerWidth - 0.5;
        targetY = event.clientY / window.innerHeight - 0.5;
      },
      { passive: true }
    );

    (function animate() {
      /* Heavy easing keeps the movement slow and dreamy. */
      currentX += (targetX - currentX) * 0.022;
      currentY += (targetY - currentY) * 0.022;

      glows.forEach((glow, index) => {
        const depth = DEPTH[index % DEPTH.length];
        glow.style.translate = `${(currentX * depth).toFixed(2)}px ${(currentY * depth).toFixed(2)}px`;
      });

      requestAnimationFrame(animate);
    })();
  })();

  /* ======================================================================
     Data
     ====================================================================== */

  /* Only one option is available for now. */
  const TIME_SIGNATURES = ['2/4'];
  const MEASURE_COUNT = 4;

  /* One folder per time signature, named "tm" + the digits: "2/4" -> tacts/tm24/ */
  const TACT_SETS = {
    '2/4': ['eeee.PNG', 'eeq.PNG', 'qee.PNG', 'qq.PNG'],
  };

  /* Alt text for the notation, keyed by filename without its extension. */
  const TACT_LABELS = {
    eeee: 'four eighth notes',
    eeq: 'two eighth notes followed by a quarter note',
    qee: 'a quarter note followed by two eighth notes',
    qq: 'two quarter notes',
  };

  const state = {
    timeSignature: TIME_SIGNATURES[0],
    measures: Array.from({ length: MEASURE_COUNT }, (_, index) => ({
      id: index + 1,
      enabled: true,
      image: null,
    })),
  };

  const tactDir = () => `tacts/tm${state.timeSignature.replace('/', '')}/`;
  const tactPool = () => TACT_SETS[state.timeSignature] || [];
  const tactSrc = (file) => tactDir() + file;
  const tactLabel = (file) => TACT_LABELS[file.replace(/\.[^.]+$/, '')] || 'rhythm pattern';

  /* Picks at random, never returning `exclude` when an alternative exists. */
  function randomTact(exclude) {
    const pool = tactPool().filter((file) => file !== exclude);
    if (!pool.length) return exclude || null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function preloadTacts() {
    tactPool().forEach((file) => {
      const img = new Image();
      img.src = tactSrc(file);
    });
  }

  const REFRESH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>`;

  /* Shown in place of the art while a measure is switched off. */
  const ADD_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 7.75v8.5M7.75 12h8.5" />
    </svg>`;

  function nodeFromHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  /* Renders "2/4" as a stacked fraction: 2 over a rule over 4. */
  function fractionMarkup(value) {
    const [top, bottom] = value.split('/');
    return `<span class="fraction" aria-hidden="true">
        <span class="fraction__top">${top}</span>
        <span class="fraction__bottom">${bottom}</span>
      </span>`;
  }

  /* ======================================================================
     Measures
     ====================================================================== */

  const measuresEl = document.getElementById('measures');

  measuresEl.innerHTML = state.measures
    .map(
      (measure) => `
      <section class="measure ${measure.enabled ? 'is-on' : ''}" data-id="${measure.id}">
        <header class="measure__head">
          <button
            class="num"
            type="button"
            data-act="toggle"
            aria-pressed="${measure.enabled}"
            aria-label="Measure ${measure.id}"
          >${measure.id}</button>

          <button
            class="refresh"
            type="button"
            data-act="refresh"
            aria-label="Refresh measure ${measure.id}"
          >${REFRESH_ICON}</button>
        </header>

        <div class="measure__box"></div>
      </section>
    `
    )
    .join('');

  const measureCell = (id) => measuresEl.querySelector(`.measure[data-id="${id}"]`);
  const findMeasure = (id) => state.measures.find((entry) => entry.id === id);

  function renderMeasure(measure) {
    const cell = measureCell(measure.id);
    const box = cell.querySelector('.measure__box');
    const refreshButton = cell.querySelector('.refresh');

    cell.classList.toggle('is-on', measure.enabled);
    cell.querySelector('.num').setAttribute('aria-pressed', String(measure.enabled));
    refreshButton.disabled = !measure.enabled;

    if (!measure.image) {
      /* Swap the whole node out. A src-less <img> renders as a broken-image
         icon, so the placeholder replaces it rather than emptying it. */
      box.replaceChildren(nodeFromHtml(`<span class="measure__add" aria-hidden="true">${ADD_ICON}</span>`));
      return;
    }

    let img = box.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'measure__img';
      img.alt = '';
      box.replaceChildren(img);
    }

    img.src = tactSrc(measure.image);
    img.alt = tactLabel(measure.image);

    if (!reducedMotion) {
      img.animate(
        [
          { opacity: 0, transform: 'scale(0.92)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 450, easing: 'ease' }
      );
    }
  }

  /* The final bar line follows the last tact that is switched on. */
  function updateBarlines() {
    const lastEnabled = [...state.measures].reverse().find((measure) => measure.enabled);

    state.measures.forEach((measure) => {
      measureCell(measure.id).classList.toggle(
        'is-last',
        Boolean(lastEnabled) && measure.id === lastEnabled.id
      );
    });
  }

  measuresEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-act]');
    if (!button || button.disabled) return;

    const id = Number(button.closest('.measure').dataset.id);
    if (button.dataset.act === 'toggle') toggleMeasure(id);
    if (button.dataset.act === 'refresh') refreshMeasure(id, button);
  });

  /* Clicking the number switches the measure below it on or off. */
  function toggleMeasure(id) {
    const measure = findMeasure(id);
    measure.enabled = !measure.enabled;

    /* Enabling places a new random pattern; disabling takes it away. */
    measure.image = measure.enabled ? randomTact(null) : null;

    renderMeasure(measure);
    updateBarlines();
    syncShuffle();
  }

  /* Swaps in a different pattern — never the one already showing. */
  function refreshMeasure(id, button) {
    const measure = findMeasure(id);
    if (!measure.enabled) return;

    measure.image = randomTact(measure.image);
    renderMeasure(measure);

    spin(button);
  }

  function spin(button) {
    button.classList.remove('is-spinning');
    void button.offsetWidth; /* restart the animation */
    button.classList.add('is-spinning');
  }

  /* The animation runs on the inner <svg>, so walk back up to the button
     that owns the state class. */
  document.addEventListener('animationend', (event) => {
    if (event.animationName !== 'spin') return;
    const host = event.target.closest?.('.is-spinning');
    if (host) host.classList.remove('is-spinning');
  });

  /* ======================================================================
     Randomize every enabled tact
     ====================================================================== */

  const shuffleButton = document.getElementById('shuffleAll');

  function syncShuffle() {
    shuffleButton.disabled = state.measures.every((measure) => !measure.enabled);
  }

  shuffleButton.addEventListener('click', () => {
    state.measures.forEach((measure) => {
      if (!measure.enabled) return;
      /* Every enabled tact visibly changes, so nothing stays put. */
      measure.image = randomTact(measure.image);
      renderMeasure(measure);
    });

    spin(shuffleButton);
  });

  /* ======================================================================
     Time signature dropdown
     ====================================================================== */

  const timesigEl = document.getElementById('timesig');
  const timesigButton = document.getElementById('timesigButton');
  const timesigValue = document.getElementById('timesigValue');
  const timesigMenu = document.getElementById('timesigMenu');

  timesigMenu.innerHTML = TIME_SIGNATURES.map(
    (value) => `
      <li class="timesig__option" role="option" tabindex="-1" data-value="${value}"
          aria-selected="${value === state.timeSignature}">
        ${fractionMarkup(value)}
        <span class="timesig__option-label">${value}</span>
        <svg class="timesig__check" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </li>
    `
  ).join('');

  const options = Array.from(timesigMenu.querySelectorAll('[role="option"]'));

  function renderTimeSignature() {
    timesigValue.innerHTML = fractionMarkup(state.timeSignature);

    const [top, bottom] = state.timeSignature.split('/');
    timesigButton.setAttribute('aria-label', `Time signature ${top} over ${bottom}`);

    options.forEach((option) => {
      option.setAttribute('aria-selected', String(option.dataset.value === state.timeSignature));
    });
  }

  function isOpen() {
    return timesigButton.getAttribute('aria-expanded') === 'true';
  }

  function setOpen(next) {
    timesigButton.setAttribute('aria-expanded', String(next));
    timesigMenu.hidden = !next;
    timesigEl.classList.toggle('is-open', next);

    if (next) {
      const selected = options.find((option) => option.getAttribute('aria-selected') === 'true');
      (selected || options[0]).focus();
    }
  }

  function selectTimeSignature(value) {
    state.timeSignature = value;
    renderTimeSignature();
  }

  timesigButton.addEventListener('click', () => setOpen(!isOpen()));

  timesigMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"]');
    if (!option) return;
    selectTimeSignature(option.dataset.value);
    setOpen(false);
    timesigButton.focus();
  });

  timesigMenu.addEventListener('keydown', (event) => {
    const index = options.indexOf(document.activeElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      options[(index + step + options.length) % options.length].focus();
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (index > -1) {
        selectTimeSignature(options[index].dataset.value);
        setOpen(false);
        timesigButton.focus();
      }
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !timesigEl.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      timesigButton.focus();
    }
  });

  /* ======================================================================
     Start
     ====================================================================== */

  preloadTacts();
  state.measures.forEach((measure) => {
    if (measure.enabled) measure.image = randomTact(null);
    renderMeasure(measure);
  });
  updateBarlines();
  syncShuffle();
  renderTimeSignature();
})();
