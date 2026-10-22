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

  /* Where each note starts inside one measure, counted in beats. In 2/4 a
     quarter note lasts one beat and an eighth half a beat, so these are
     exactly the moments a note sounds — the rest of the measure is silence. */
  const RHYTHMS = {
    eeee: [0, 0.5, 1, 1.5],
    eeq: [0, 0.5, 1],
    qee: [0, 1, 1.5],
    qq: [0, 1],
  };

  const patternOf = (file) => String(file).replace(/\.[^.]+$/, '');
  const rhythmOf = (file) => RHYTHMS[patternOf(file)] || [0];

  /* Bounding box of every notehead in the art, as fractions of the image:
     [x, y, width, height], measured off the PNGs. The accent re-draws the
     note being played from this box, so it only ever has to cover that
     notehead. */
  const NOTE_HEADS = {
    eeee: [
      [0.103, 0.6194, 0.1051, 0.1381],
      [0.3212, 0.6194, 0.1071, 0.1343],
      [0.5414, 0.6194, 0.1051, 0.1381],
      [0.7596, 0.6194, 0.1071, 0.1343],
    ],
    eeq: [
      [0.1391, 0.6134, 0.1048, 0.1375],
      [0.3569, 0.6134, 0.1069, 0.1338],
      [0.6875, 0.6097, 0.1069, 0.1338],
    ],
    qee: [
      [0.2157, 0.6171, 0.1069, 0.1338],
      [0.5141, 0.6208, 0.1048, 0.1375],
      [0.7319, 0.6208, 0.1069, 0.1338],
    ],
    qq: [
      [0.2141, 0.6157, 0.1071, 0.1343],
      [0.6101, 0.6194, 0.1071, 0.1343],
    ],
  };

  /* "2/4" means two beats to the measure. */
  const beatsPerMeasure = () => Number(state.timeSignature.split('/')[0]) || 2;

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

  const PLAY_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
      stroke-width="3" stroke-linejoin="round" aria-hidden="true">
      <path d="M9.5 7.5v9L17 12z" />
    </svg>`;

  const STOP_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.8" />
    </svg>`;

  /* Shown in the one empty tact that can still be switched on. */
  const ADD_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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

          <button
            class="play"
            type="button"
            data-act="play"
            aria-label="Play measure ${measure.id}"
            data-play-label="Play measure ${measure.id}"
            data-stop-label="Stop measure ${measure.id}"
          >${PLAY_ICON}</button>
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
    cell.querySelector('.play').disabled = !measure.enabled;

    if (!measure.image) {
      /* Clear the node rather than leaving a src-less <img>, which would show
         a broken-image icon. syncAdd() puts the "+" back when this tact is
         the one that can be switched on next. */
      box.replaceChildren();
      return;
    }

    let art = box.querySelector('.measure__art');
    if (!art) {
      /* A wrapper carries the blend and the stroke filter, so the <img> itself
         only ever has to be inverted. */
      art = document.createElement('span');
      art.className = 'measure__art';

      const image = document.createElement('img');
      image.className = 'measure__img';
      art.appendChild(image);

      box.replaceChildren(art);
    }

    const img = art.firstElementChild;

    img.src = tactSrc(measure.image);
    img.alt = tactLabel(measure.image);
    img.onload = () => layoutMarks(measure.id);

    buildMarks(measure, art, img);

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

  /* ======================================================================
     Sequential toggling
     ====================================================================== */

  /* The tacts are switched on from the left and off from the right, so the
     enabled ones always form a run starting at tact 1. That leaves exactly two
     numbers able to act at any moment: the last tact that is on (switch it
     off) and the first tact that is off after it (switch it on). */
  function toggleTargets() {
    const lastOn = [...state.measures].reverse().find((measure) => measure.enabled);

    if (!lastOn) {
      /* Nothing is on, so the only move is to start the run with tact 1. */
      return { toEnable: state.measures[0] ? state.measures[0].id : null, toDisable: null };
    }

    const next = state.measures.find((measure) => measure.id === lastOn.id + 1);
    return { toEnable: next ? next.id : null, toDisable: lastOn.id };
  }

  /* Locks every number that cannot act and flags the one that is next in line,
     so the only available move is always the obvious one. */
  function syncToggles() {
    const { toEnable, toDisable } = toggleTargets();

    state.measures.forEach((measure) => {
      const cell = measureCell(measure.id);
      const actionable = measure.id === toEnable || measure.id === toDisable;

      cell.querySelector('.num').disabled = !actionable;
      cell.classList.toggle('is-next', measure.id === toEnable);
    });
  }

  /* Puts the "+" affordance on the single empty tact that can be switched on
     next. Locked empty tacts stay blank. */
  function syncAdd() {
    const { toEnable } = toggleTargets();

    state.measures.forEach((measure) => {
      const box = measureCell(measure.id).querySelector('.measure__box');
      const wanted = !measure.enabled && measure.id === toEnable;
      const shown = box.querySelector('.measure__add');

      if (wanted && !shown) {
        box.replaceChildren(
          nodeFromHtml(
            `<button class="measure__add" type="button" data-act="toggle"
                     aria-label="Add measure ${measure.id}">${ADD_ICON}</button>`
          )
        );
      } else if (!wanted && shown) {
        box.replaceChildren();
      }
    });
  }

  measuresEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-act]');
    if (!button || button.disabled) return;

    const id = Number(button.closest('.measure').dataset.id);
    if (button.dataset.act === 'toggle') toggleMeasure(id);
    if (button.dataset.act === 'refresh') refreshMeasure(id, button);
    if (button.dataset.act === 'play') togglePlayback([id], button);
  });

  /* Clicking the number switches the measure below it on or off — but only
     when that tact is the one the sequence allows to move next. */
  function toggleMeasure(id) {
    const { toEnable, toDisable } = toggleTargets();
    if (id !== toEnable && id !== toDisable) return;

    /* The board is about to change under the player. */
    stopPlayback();

    const measure = findMeasure(id);
    measure.enabled = !measure.enabled;

    /* Enabling places a new random pattern; disabling takes it away. */
    measure.image = measure.enabled ? randomTact(null) : null;

    renderMeasure(measure);
    updateBarlines();
    syncToggles();
    syncAdd();
    syncShuffle();
    syncTransport();
  }

  /* Swaps in a different pattern — never the one already showing. */
  function refreshMeasure(id, button) {
    const measure = findMeasure(id);
    if (!measure.enabled) return;

    stopPlayback();

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
    stopPlayback();

    state.measures.forEach((measure) => {
      if (!measure.enabled) return;
      /* Every enabled tact visibly changes, so nothing stays put. */
      measure.image = randomTact(measure.image);
      renderMeasure(measure);
    });

    spin(shuffleButton);
  });

  /* ======================================================================
     Playback
     ====================================================================== */

  const tempoSlider = document.getElementById('tempoSlider');
  const tempoValue = document.getElementById('tempoValue');
  const playAllButton = document.getElementById('playAll');
  const tempoDown = document.getElementById('tempoDown');
  const tempoUp = document.getElementById('tempoUp');
  const emphasisToggle = document.getElementById('emphasisToggle');

  const BPM = () => Number(tempoSlider.value) || 100;

  /* With emphasis on, the first beat of every tact is accented — louder and
     higher. Off, every beat gets the same click. */
  let emphasis = true;

  emphasisToggle.addEventListener('click', () => {
    emphasis = !emphasis;
    emphasisToggle.setAttribute('aria-checked', String(emphasis));
  });

  /* The audio context is created on the first press — browsers only allow
     audio to start from a user gesture anyway. */
  let audioCtx = null;

  function audio() {
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  const transport = {
    playing: false,
    trigger: null,
    ids: [],
    index: 0,
    nextAt: 0,
    finishAt: Infinity,
    events: [],
    nodes: [],
    spans: [],
    timer: 0,
    raf: 0,
    activeId: null,
    activeMark: null,
    lastOnset: null,
  };

  /* Seconds of audio queued ahead of the clock, and how often we top it up. */
  const SCHEDULE_AHEAD = 0.18;
  const SCHEDULER_MS = 25;

  /* The noise grain behind every click, built once and reused. */
  let clickNoise = null;

  function noiseGrain(ctx) {
    if (!clickNoise || clickNoise.sampleRate !== ctx.sampleRate) {
      const length = Math.ceil(ctx.sampleRate * 0.05);
      clickNoise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = clickNoise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return clickNoise;
  }

  /* A dry metronome tick: a very short band-passed noise transient for the
     snap, plus a brief high tone so the downbeat can be told apart by pitch. */
  function blip(ctx, when, accent) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseGrain(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(accent ? 3200 : 2200, when);
    filter.Q.setValueAtTime(0.9, when);

    const snap = ctx.createGain();
    snap.gain.setValueAtTime(accent ? 0.55 : 0.38, when);
    snap.gain.exponentialRampToValueAtTime(0.0001, when + 0.02);

    noise.connect(filter).connect(snap).connect(ctx.destination);
    noise.start(when);
    noise.stop(when + 0.05);

    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(accent ? 1800 : 1200, when);

    const body = ctx.createGain();
    body.gain.setValueAtTime(accent ? 0.28 : 0.19, when);
    body.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);

    tone.connect(body).connect(ctx.destination);
    tone.start(when);
    tone.stop(when + 0.05);

    transport.nodes.push({ sources: [noise, tone], gains: [snap, body] });
  }

  /* Queues whole measures ahead of the audio clock. Going a measure at a time
     is what lets the tempo slider take effect while something is playing. */
  function schedule() {
    const ctx = audioCtx;
    if (!ctx || !transport.playing) return;

    const beat = 60 / BPM();
    const measureLength = beat * beatsPerMeasure();

    while (
      transport.index < transport.ids.length &&
      transport.nextAt < ctx.currentTime + SCHEDULE_AHEAD
    ) {
      const id = transport.ids[transport.index];
      const measure = findMeasure(id);
      const onsets = measure ? rhythmOf(measure.image) : [0];
      const startAt = transport.nextAt;

      onsets.forEach((offset, index) => {
        const when = startAt + offset * beat;
        blip(ctx, when, emphasis && offset === 0);
        /* The note index travels with the tick so the accent knows which
           notehead to light up. */
        transport.events.push({ time: when, id, index });
      });

      transport.nextAt = startAt + measureLength;
      transport.spans.push({ start: startAt, end: transport.nextAt });
      transport.index += 1;

      if (transport.index >= transport.ids.length) {
        /* Let the last note ring out before the UI clears. */
        transport.finishAt = transport.nextAt + 0.3;
      }
    }
  }

  /* ---------------------------------------------------------------------
     Note accents
     --------------------------------------------------------------------- */

  /* The art is one flat image, so the note being played is drawn a second time
     on top of it: a copy of the image cropped to that notehead's box and
     enlarged. Only the current note is visible, so at rest the board looks
     exactly as it did. */
  function buildMarks(measure, art, img) {
    const old = art.querySelector('.note-layer');
    if (old) old.remove();

    const heads = NOTE_HEADS[patternOf(measure.image)] || [];
    if (!heads.length) return;

    const layer = document.createElement('span');
    layer.className = 'note-layer';

    heads.forEach(([x, y, w, h], index) => {
      const mark = document.createElement('span');
      mark.className = 'note-mark';
      mark.dataset.index = String(index);
      /* Placed by the notehead's centre, as a fraction of the drawn art. */
      mark.style.left = `${(x + w / 2) * 100}%`;
      mark.style.top = `${(y + h / 2) * 100}%`;
      mark.style.width = `${w * 100}%`;
      mark.style.height = `${h * 100}%`;

      const crop = document.createElement('span');
      crop.className = 'note-mark__crop';

      const copy = document.createElement('img');
      copy.className = 'note-mark__img';
      copy.src = img.src;
      copy.alt = '';
      /* The copy is the whole image again, sized so the notehead box lands
         inside the crop. Every value is relative to the crop box, so it stays
         aligned however large the board is drawn. */
      copy.style.width = `${100 / w}%`;
      copy.style.height = `${100 / h}%`;
      copy.style.left = `${(-x / w) * 100}%`;
      copy.style.top = `${(-y / h) * 100}%`;

      const glow = document.createElement('span');
      glow.className = 'note-mark__glow';

      crop.appendChild(copy);
      /* Glow last so it blooms over the crop instead of being cut out of it. */
      mark.append(crop, glow);
      layer.appendChild(mark);
    });

    art.appendChild(layer);
    layoutMarks(measure.id);
  }

  /* object-fit: contain letterboxes the art inside its box, so the layer has to
     match the drawn image rather than the box. */
  function layoutMarks(id) {
    const cell = measureCell(id);
    const art = cell && cell.querySelector('.measure__art');
    const layer = cell && cell.querySelector('.note-layer');
    const img = cell && cell.querySelector('.measure__img');
    if (!art || !layer || !img || !img.naturalWidth) return;

    const aspect = img.naturalWidth / img.naturalHeight;
    const boxW = art.clientWidth;
    const boxH = art.clientHeight;
    let width = boxW;
    let height = boxW / aspect;

    if (height > boxH) {
      height = boxH;
      width = boxH * aspect;
    }

    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;
    layer.style.left = `${(boxW - width) / 2}px`;
    layer.style.top = `${(boxH - height) / 2}px`;
  }

  function layoutAllMarks() {
    state.measures.forEach((measure) => layoutMarks(measure.id));
  }

  /* The note that just sounded: a bloom on its head while it is the current
     one, and nothing else — the note itself keeps its printed size. */
  function accentNote(id, index) {
    const cell = measureCell(id);
    const mark = cell && cell.querySelector(`.note-mark[data-index="${index}"]`);
    if (!mark) return null;

    mark.classList.add('is-current');
    return mark;
  }

  /* The boxes are fluid, so re-measure the note layers when the board changes. */
  window.addEventListener('resize', layoutAllMarks);

  /* Keeps the tact highlight and the note accent in step with what is audible. */
  function frame() {
    if (!transport.playing || !audioCtx) return;

    const now = audioCtx.currentTime;
    let active = null;
    let latest = null;

    transport.events.forEach((event) => {
      if (event.time <= now) {
        active = event.id;
        latest = event;
      }
    });

    if (active !== transport.activeId) {
      transport.activeId = active;
      state.measures.forEach((measure) => {
        measureCell(measure.id).classList.toggle('is-playing', measure.id === active);
      });
    }

    if (latest !== transport.lastOnset) {
      transport.lastOnset = latest;

      if (transport.activeMark) transport.activeMark.classList.remove('is-current');
      transport.activeMark = latest ? accentNote(latest.id, latest.index) : null;
    }

    if (now >= transport.finishAt) {
      stopPlayback();
      return;
    }

    transport.raf = requestAnimationFrame(frame);
  }

  /* A transport button reads as "stop" while it is the one playing. */
  function setTrigger(button, playing) {
    if (!button) return;

    button.classList.toggle('is-playing', playing);
    button.innerHTML = playing ? STOP_ICON : PLAY_ICON;
    button.setAttribute(
      'aria-label',
      (playing ? button.dataset.stopLabel : button.dataset.playLabel) || 'Play'
    );
  }

  function startPlayback(ids, trigger) {
    const ctx = audio();
    if (!ctx || !ids.length) return;

    stopPlayback();

    transport.playing = true;
    transport.trigger = trigger;
    transport.ids = ids.slice();
    transport.index = 0;
    transport.nextAt = ctx.currentTime + 0.12;
    transport.finishAt = Infinity;
    transport.events = [];
    transport.nodes = [];
    transport.spans = [];
    transport.activeId = null;
    transport.activeMark = null;
    transport.lastOnset = null;

    setTrigger(trigger, true);

    layoutAllMarks();

    schedule();
    transport.timer = setInterval(schedule, SCHEDULER_MS);
    transport.raf = requestAnimationFrame(frame);
  }

  function stopPlayback() {
    if (!transport.playing) return;

    transport.playing = false;
    clearInterval(transport.timer);
    cancelAnimationFrame(transport.raf);
    transport.timer = 0;
    transport.raf = 0;

    transport.nodes.forEach(({ sources, gains }) => {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch (error) {
          /* already finished */
        }
        source.disconnect();
      });
      gains.forEach((gain) => gain.disconnect());
    });
    transport.nodes = [];
    transport.events = [];
    transport.spans = [];

    if (transport.activeMark) transport.activeMark.classList.remove('is-current');
    transport.activeMark = null;

    setTrigger(transport.trigger, false);
    transport.trigger = null;
    transport.activeId = null;
    transport.lastOnset = null;

    state.measures.forEach((measure) => {
      measureCell(measure.id).classList.remove('is-playing');
    });
  }

  /* Pressing the button that is already playing stops it; pressing a different
     one switches straight to that. */
  function togglePlayback(ids, button) {
    if (transport.playing && transport.trigger === button) {
      stopPlayback();
      return;
    }
    startPlayback(ids, button);
  }

  playAllButton.addEventListener('click', () => {
    const ids = state.measures
      .filter((measure) => measure.enabled)
      .map((measure) => measure.id);

    if (ids.length) togglePlayback(ids, playAllButton);
  });

  /* The big play button needs at least one tact to play. */
  function syncTransport() {
    if (transport.playing) return;
    playAllButton.disabled = state.measures.every((measure) => !measure.enabled);
  }

  function renderTempo() {
    const min = Number(tempoSlider.min);
    const max = Number(tempoSlider.max);
    const value = Number(tempoSlider.value);

    tempoValue.textContent = String(value);
    tempoSlider.style.setProperty('--fill', `${((value - min) / (max - min)) * 100}%`);

    tempoDown.disabled = value <= min;
    tempoUp.disabled = value >= max;
  }

  tempoSlider.addEventListener('input', renderTempo);

  /* One-beat nudges, so a precise tempo doesn't need a steady hand on the
     slider. Clamped to the slider's own range. */
  function stepTempo(delta) {
    const min = Number(tempoSlider.min);
    const max = Number(tempoSlider.max);
    const current = Number(tempoSlider.value);
    const next = Math.min(max, Math.max(min, current + delta));

    if (next === current) return;

    tempoSlider.value = String(next);
    renderTempo();
  }

  tempoDown.addEventListener('click', () => stepTempo(-1));
  tempoUp.addEventListener('click', () => stepTempo(1));

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
  syncToggles();
  syncAdd();
  syncShuffle();
  syncTransport();
  renderTempo();
  renderTimeSignature();
})();
