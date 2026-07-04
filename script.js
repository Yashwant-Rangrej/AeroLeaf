(function() {
    'use strict';

    /* ── Constants ── */
    const TICK_MS       = 2200;
    const DIRS          = ['N','NE','E','SE','S','SW','W','NW'];
    const DIR_DEG       = {N:0,NE:45,E:90,SE:135,S:180,SW:225,W:270,NW:315};
    const TIP_THRESHOLD = 0.5;           // mm per bucket tip
    const MAX_PARTICLES = 30;
    const MAX_DROPS     = 22;

    /* ── State ── */
    let simTimer   = null;
    let clockTimer = null;

    const S = {
      temp:      28,
      hum:       55,
      solar:     450,
      pressure:  101.3,
      aq:        35,
      wind:      5.5,
      dirIdx:    6,          // NW
      dirTick:   0,
      rainRate:  0,
      rainAccum: 0,
      rainTips:  0,
      uv:        4,
      battery:   75,
    };

    /* ── DOM cache ── */
    const $ = id => document.getElementById(id);

    /* ── Bounded random walk ── */
    function walk(cur, min, max, step, center) {
      center = center !== undefined ? center : (min + max) / 2;
      const bias = (center - cur) / (max - min) * step * 0.35;
      const d    = (Math.random() - 0.5) * 2 * step + bias;
      return Math.max(min, Math.min(max, cur + d));
    }

    /* ============================================================
       CLOCK
       ============================================================ */
    function tickClock() {
      const d = new Date();
      $('live-clock').textContent =
        String(d.getHours()).padStart(2,'0') + ':' +
        String(d.getMinutes()).padStart(2,'0') + ':' +
        String(d.getSeconds()).padStart(2,'0');
    }

    /* ============================================================
       PARTICLE POOL (Air Quality)
       ============================================================ */
    function initParticles() {
      const area = $('particles-area');
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const sz = 2 + Math.random() * 5;
        p.style.width  = sz + 'px';
        p.style.height = sz + 'px';
        p.style.left   = (5 + Math.random() * 90) + '%';
        p.style.top    = (5 + Math.random() * 85) + '%';
        p.style.setProperty('--dx', (Math.random()*16-8)+'px');
        p.style.setProperty('--dy', (Math.random()*-18-4)+'px');
        p.style.animationDelay    = (Math.random()*3.5)+'s';
        p.style.animationDuration = (2.5+Math.random()*2.5)+'s';
        area.appendChild(p);
      }
    }

    /* ============================================================
       RAIN DROP POOL
       ============================================================ */
    function initDrops() {
      const area = $('rain-area');
      for (let i = 0; i < MAX_DROPS; i++) {
        const d = document.createElement('div');
        d.className = 'rdrop';
        d.style.left = (4 + Math.random() * 88) + '%';
        d.style.animationDelay    = (Math.random() * 0.9) + 's';
        d.style.animationDuration = (0.6 + Math.random() * 0.5) + 's';
        area.appendChild(d);
      }
    }

    /* ============================================================
       SIMULATION TICK
       ============================================================ */
    function tick() {
      /* -- Walk sensor values -- */
      S.temp     = walk(S.temp,     0,   100,  1.8,  30);
      S.hum      = walk(S.hum,      5,   95,   3,    55);
      S.solar    = walk(S.solar,    0,   2000, 90,   500);
      S.pressure = walk(S.pressure, 15,  115,  0.6,  101.3);
      S.aq       = walk(S.aq,       10,  500,  18,   40);
      S.wind     = walk(S.wind,     0,   20,   1.4,  5.5);
      S.uv       = walk(S.uv,       0,   14,   0.9,  5);
      S.rainRate = Math.max(0, walk(S.rainRate, 0, 12, 1.2, 1.5));

      /* -- Wind direction (intermittent) -- */
      S.dirTick++;
      if (S.dirTick >= 3 + Math.floor(Math.random() * 4)) {
        S.dirTick = 0;
        const shift = Math.floor(Math.random() * 3) - 1;
        S.dirIdx = (S.dirIdx + shift + 8) % 8;
      }

      /* -- Rainfall accumulation -- */
      S.rainAccum += S.rainRate * (TICK_MS / 1000 / 60);   // rough mm
      let tipped = false;
      if (S.rainAccum >= TIP_THRESHOLD) {
        S.rainAccum -= TIP_THRESHOLD;
        S.rainTips++;
        tipped = true;
      }

      /* -- Turbine derived values -- */
      const ws = S.wind;
      const genPower   = Math.min(300, 0.1 * ws * ws * ws);
      const genCurrent = genPower / 24;
      const rotorRpm   = Math.round(ws * 55);

      /* Battery charge/discharge */
      if (ws > 1) {
        S.battery = Math.min(100, S.battery + 0.04);
      } else {
        S.battery = Math.max(0, S.battery - 0.02);
      }
      const inverterV = S.battery > 10 ? (218 + Math.random() * 8) : 0;

      /* ===== UPDATE UI ===== */

      /* -- Turbine -- */
      $('rotor-rpm').textContent   = rotorRpm;
      $('gen-power').textContent   = genPower.toFixed(1);
      $('gen-current').textContent = genCurrent.toFixed(2);
      $('battery-pct').textContent = Math.round(S.battery);
      $('inverter-v').textContent  = Math.round(inverterV);

      const bf = $('battery-fill');
      bf.style.width = S.battery + '%';
      bf.className = 'battery-fill' +
        (S.battery < 20 ? ' low' : S.battery < 50 ? ' mid' : '');

      /* Rotor animation speed */
      const rb = $('rotor-blades');
      if (ws < 0.3) {
        rb.style.animationPlayState = 'paused';
      } else {
        rb.style.animationPlayState = 'running';
        rb.style.animationDuration  = Math.max(0.15, 5 / ws) + 's';
      }

      /* ---- Sensor cards ---- */

      /* 1 Temperature → mercury column */
      $('temp-val').textContent = S.temp.toFixed(1);
      setStatus('temp-st', tempStatus(S.temp));
      const mFill = $('mercury-fill');
      const mH = (S.temp / 100) * 66;          // tube inner ~66 SVG units
      mFill.setAttribute('height', mH);
      mFill.setAttribute('y', 80 - mH);        // bottom at y=80

      /* 2 Humidity → droplet fill */
      $('hum-val').textContent = Math.round(S.hum);
      setStatus('hum-st', humStatus(S.hum));
      const hFill = $('hum-fill');
      const hY = 70 - ((S.hum - 5) / 90) * 60;
      hFill.setAttribute('y', hY);
      hFill.setAttribute('height', 70 - hY);

      /* 3 Solar → sun pulse scale */
      $('solar-val').textContent = Math.round(S.solar);
      setStatus('solar-st', solarStatus(S.solar));
      const sc = 1 + (S.solar / 2000) * 0.14;
      $('sun-pulse').style.setProperty('--sun-s', sc);
      $('sun-pulse').style.opacity = 0.4 + (S.solar / 2000) * 0.6;

      /* 4 Pressure → gauge needle */
      $('pres-val').textContent = S.pressure.toFixed(1);
      setStatus('pres-st', presStatus(S.pressure));
      const pAngle = ((S.pressure - 15) / 100) * 180 - 90;
      $('pressure-needle').style.transform = 'rotate(' + pAngle + 'deg)';

      /* 5 Air quality → particles */
      $('aq-val').textContent = Math.round(S.aq);
      setStatus('aq-st', aqStatus(S.aq));
      const pCount = Math.round(3 + (S.aq - 10) / 490 * (MAX_PARTICLES - 3));
      const pEls = $('particles-area').children;
      for (let i = 0; i < pEls.length; i++) {
        pEls[i].classList.toggle('visible', i < pCount);
      }

      /* 6 Wind speed → micro-turbine */
      $('ws-val').textContent = S.wind.toFixed(1);
      setStatus('ws-st', windStatus(S.wind));
      const mt = $('micro-turbine');
      if (ws < 0.3) {
        mt.style.animationPlayState = 'paused';
      } else {
        mt.style.animationPlayState = 'running';
        mt.style.animationDuration  = Math.max(0.12, 3 / ws) + 's';
      }

      /* 7 Wind direction → compass needle */
      $('wd-val').textContent = DIRS[S.dirIdx];
      const deg = DIR_DEG[DIRS[S.dirIdx]];
      $('wd-st').textContent = deg + '°';
      $('compass-needle').style.transform = 'rotate(' + deg + 'deg)';

      /* 8 Rainfall → drops + bucket */
      $('rain-val').textContent = (S.rainTips * TIP_THRESHOLD).toFixed(1);
      setStatus('rain-st', rainStatus(S.rainRate));
      $('rain-meta').textContent = 'Tips: ' + S.rainTips;
      const dropCount = Math.round(Math.min(MAX_DROPS, S.rainRate * 2));
      const dEls = $('rain-area').children;
      for (let i = 0; i < dEls.length; i++) {
        dEls[i].classList.toggle('active', i < dropCount);
      }
      if (tipped) {
        const bkt = $('tip-bucket');
        bkt.classList.add('tip');
        setTimeout(() => bkt.classList.remove('tip'), 380);
      }

      /* 9 UV index → banded bar marker */
      $('uv-val').textContent = S.uv.toFixed(1);
      setStatus('uv-st', uvStatus(S.uv));
      const uvPct = Math.min(S.uv / 13, 1) * 100;
      $('uv-marker').style.left = uvPct + '%';
    }

    /* ============================================================
       STATUS HELPERS
       ============================================================ */
    function setStatus(id, s) {
      const el = $(id);
      el.textContent = s.t;
      el.className   = 'card-status ' + s.c;
    }
    function tempStatus(v)  { return v<15?{t:'Cold',c:'st-info'}:v<25?{t:'Cool',c:'st-info'}:v<35?{t:'Warm',c:'st-moderate'}:{t:'Hot',c:'st-alert'}; }
    function humStatus(v)   { return v<30?{t:'Dry',c:'st-moderate'}:v<60?{t:'Comfortable',c:'st-good'}:v<80?{t:'Humid',c:'st-moderate'}:{t:'Very Humid',c:'st-alert'}; }
    function solarStatus(v) { return v<100?{t:'Low',c:'st-info'}:v<500?{t:'Moderate',c:'st-moderate'}:v<1000?{t:'Bright',c:'st-good'}:{t:'Intense',c:'st-alert'}; }
    function presStatus(v)  { return v<98?{t:'Low',c:'st-info'}:v<104?{t:'Stable',c:'st-good'}:{t:'High',c:'st-alert'}; }
    function aqStatus(v)    { return v<50?{t:'Good',c:'st-good'}:v<100?{t:'Moderate',c:'st-moderate'}:v<200?{t:'Unhealthy',c:'st-alert'}:{t:'Hazardous',c:'st-alert'}; }
    function windStatus(v)  { return v<2?{t:'Calm',c:'st-info'}:v<5?{t:'Light',c:'st-good'}:v<10?{t:'Moderate',c:'st-moderate'}:{t:'Strong',c:'st-alert'}; }
    function rainStatus(v)  { return v<0.3?{t:'Dry',c:'st-good'}:v<3?{t:'Light',c:'st-info'}:v<7?{t:'Moderate',c:'st-moderate'}:{t:'Heavy',c:'st-alert'}; }
    function uvStatus(v)    { return v<3?{t:'Low',c:'st-good'}:v<6?{t:'Moderate',c:'st-moderate'}:v<8?{t:'High',c:'st-alert'}:v<11?{t:'Very High',c:'st-alert'}:{t:'Extreme',c:'st-alert'}; }

    /* ============================================================
       START / STOP SIMULATION
       ============================================================ */
    window.startSimulation = function() {
      tickClock();
      clockTimer = setInterval(tickClock, 1000);
      initParticles();
      initDrops();
      tick();                        // first immediate tick
      simTimer = setInterval(tick, TICK_MS);
    };

    window.stopSimulation = function() {
      clearInterval(simTimer);
      clearInterval(clockTimer);
      simTimer = null;
      clockTimer = null;
    };

  })();