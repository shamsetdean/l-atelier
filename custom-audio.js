/* ════════════════════════════════════════════════════════════════
   L'ATELIER · Lecteur audio maison
   Remplace l'apparence native des <audio controls> (différente selon
   Safari, Chrome, Firefox) par un lecteur clair et identique partout.
   L'élément <audio> reste dans la page (masqué) : la boucle A-B
   (loop-ab.js), les changements de piste et le téléchargement
   continuent de fonctionner sans rien modifier.
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var css = ''
    + '.ca-player{display:flex;align-items:center;gap:.75rem;width:100%;box-sizing:border-box;height:54px;padding:0 1.1rem 0 .65rem;background:#F1F3F4;border-radius:999px;font-family:var(--sans,system-ui,-apple-system,sans-serif);color:#1A1726;}'
    + '.ca-btn{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:50%;background:transparent;color:#1A1726;cursor:pointer;padding:0;transition:background .15s;}'
    + '.ca-btn:hover{background:rgba(0,0,0,.06);}'
    + '.ca-btn svg{width:20px;height:20px;}'
    + '.ca-btn.ca-vol{color:#5F6368;}'
    + '.ca-time{flex-shrink:0;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap;}'
    + '.ca-seek{flex:1;min-width:40px;height:20px;margin:0;background:transparent;-webkit-appearance:none;appearance:none;cursor:pointer;}'
    + '.ca-seek:focus{outline:none;}'
    + '.ca-seek::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(to right,#3A3550 var(--p,0%),#C4C7CC var(--p,0%));}'
    + '.ca-seek::-moz-range-track{height:4px;border-radius:4px;background:#C4C7CC;}'
    + '.ca-seek::-moz-range-progress{height:4px;border-radius:4px;background:#3A3550;}'
    + '.ca-seek::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-4px;border-radius:50%;background:#3A3550;border:0;opacity:0;transition:opacity .15s;}'
    + '.ca-seek::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#3A3550;border:0;opacity:0;transition:opacity .15s;}'
    + '.ca-player:hover .ca-seek::-webkit-slider-thumb,.ca-player.playing .ca-seek::-webkit-slider-thumb{opacity:1;}'
    + '.ca-player:hover .ca-seek::-moz-range-thumb,.ca-player.playing .ca-seek::-moz-range-thumb{opacity:1;}'
    + 'audio.ca-native{display:none !important;}'
    + '@media(max-width:420px){.ca-player{gap:.45rem;padding:0 .8rem 0 .45rem;}.ca-time{font-size:13px;}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var ICON = {
    play:  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    vol:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>',
    mute:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>'
  };

  function fmt(s){
    if(!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function enhance(audio){
    if(audio.dataset.caDone === '1') return;
    audio.dataset.caDone = '1';
    audio.removeAttribute('controls');
    audio.classList.add('ca-native');

    var ui = document.createElement('div');
    ui.className = 'ca-player';
    ui.innerHTML =
        '<button type="button" class="ca-btn ca-play" aria-label="Lecture">' + ICON.play + '</button>'
      + '<span class="ca-time"><span class="ca-cur">0:00</span> / <span class="ca-dur">0:00</span></span>'
      + '<input type="range" class="ca-seek" min="0" max="1000" step="1" value="0" aria-label="Position">'
      + '<button type="button" class="ca-btn ca-vol" aria-label="Son">' + ICON.vol + '</button>';
    // Placé AVANT l'audio : le panneau A-B de loop-ab.js, inséré après l'audio, reste en dessous.
    audio.parentNode.insertBefore(ui, audio);

    var bPlay = ui.querySelector('.ca-play'),
        bVol  = ui.querySelector('.ca-vol'),
        seek  = ui.querySelector('.ca-seek'),
        cur   = ui.querySelector('.ca-cur'),
        dur   = ui.querySelector('.ca-dur'),
        dragging = false;

    function paint(){
      var d = audio.duration, t = audio.currentTime;
      var p = (isFinite(d) && d > 0) ? (t / d) : 0;
      if(!dragging){ seek.value = Math.round(p * 1000); }
      seek.style.setProperty('--p', (seek.value / 10) + '%');
      cur.textContent = fmt(dragging && isFinite(d) ? seek.value / 1000 * d : t);
      dur.textContent = fmt(d);
    }
    function state(){
      var on = !audio.paused && !audio.ended;
      bPlay.innerHTML = on ? ICON.pause : ICON.play;
      bPlay.setAttribute('aria-label', on ? 'Pause' : 'Lecture');
      ui.classList.toggle('playing', on);
      bVol.innerHTML = audio.muted ? ICON.mute : ICON.vol;
    }

    bPlay.addEventListener('click', function(){
      if(audio.paused || audio.ended){
        // Un seul audio à la fois sur la page
        document.querySelectorAll('audio').forEach(function(o){ if(o !== audio && !o.paused) o.pause(); });
        audio.play().catch(function(){});
      } else {
        audio.pause();
      }
    });
    bVol.addEventListener('click', function(){ audio.muted = !audio.muted; state(); });

    seek.addEventListener('input', function(){ dragging = true; paint(); });
    seek.addEventListener('change', function(){
      var d = audio.duration;
      if(isFinite(d) && d > 0) audio.currentTime = seek.value / 1000 * d;
      dragging = false; paint();
    });

    ['timeupdate','loadedmetadata','durationchange','seeked','emptied'].forEach(function(ev){ audio.addEventListener(ev, paint); });
    ['play','pause','ended','volumechange','emptied'].forEach(function(ev){ audio.addEventListener(ev, state); });
    paint(); state();
  }

  function init(){ document.querySelectorAll('audio[controls]').forEach(enhance); }
  window.atelierEnhanceAudio = init;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
