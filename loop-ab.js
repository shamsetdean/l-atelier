/* ════════════════════════════════════════════════════════════════
   L'ATELIER — Boucle A↔B pour <audio> et <video>
   Branche automatiquement un panneau de contrôle sur chaque
   media element qui a la classe .ab-loop ou data-ab-loop
   ════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';

  // Formate seconds → "M:SS"
  function fmt(s){
    if(!isFinite(s) || s < 0) return '–:––';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  // Détecte si le device préfère currentLang
  const currentLang = (localStorage.getItem('atelier-lang') || 'fr');
  const L = {
    fr: {pointA: 'A', pointB: 'B', loop: 'Boucle', clear: 'Effacer', setA: 'Définir point A à la position actuelle', setB: 'Définir point B à la position actuelle', toggleLoop: 'Activer / désactiver la boucle A↔B', reset: 'Effacer les points A et B'},
    es: {pointA: 'A', pointB: 'B', loop: 'Bucle', clear: 'Borrar', setA: 'Definir punto A en la posición actual', setB: 'Definir punto B en la posición actual', toggleLoop: 'Activar / desactivar el bucle A↔B', reset: 'Borrar los puntos A y B'}
  };
  const t = L[currentLang] || L.fr;

  // Construit le panneau de contrôle A↔B pour un media element
  function buildPanel(media){
    const panel = document.createElement('div');
    panel.className = 'ab-loop-panel';
    panel.innerHTML = `
      <button type="button" class="ab-btn ab-a" title="${t.setA}">
        <span class="ab-label">${t.pointA}</span>
        <span class="ab-time" data-role="time-a">––:––</span>
      </button>
      <button type="button" class="ab-btn ab-b" title="${t.setB}">
        <span class="ab-label">${t.pointB}</span>
        <span class="ab-time" data-role="time-b">––:––</span>
      </button>
      <button type="button" class="ab-btn ab-loop-toggle" title="${t.toggleLoop}" disabled>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
        <span class="ab-label">${t.loop}</span>
      </button>
      <button type="button" class="ab-btn ab-clear" title="${t.reset}" disabled>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    return panel;
  }

  function attachABLoop(media){
    if(media.dataset.abAttached === '1') return;
    media.dataset.abAttached = '1';

    const panel = buildPanel(media);
    // Insérer juste après le media (et avant les audio-controls existants s'il y en a)
    media.parentNode.insertBefore(panel, media.nextSibling);

    const btnA = panel.querySelector('.ab-a');
    const btnB = panel.querySelector('.ab-b');
    const btnLoop = panel.querySelector('.ab-loop-toggle');
    const btnClear = panel.querySelector('.ab-clear');
    const timeA = panel.querySelector('[data-role="time-a"]');
    const timeB = panel.querySelector('[data-role="time-b"]');

    let pointA = null;
    let pointB = null;
    let loopOn = false;

    function refreshUI(){
      timeA.textContent = pointA !== null ? fmt(pointA) : '––:––';
      timeB.textContent = pointB !== null ? fmt(pointB) : '––:––';
      btnA.classList.toggle('set', pointA !== null);
      btnB.classList.toggle('set', pointB !== null);
      const canLoop = pointA !== null && pointB !== null && pointB > pointA;
      btnLoop.disabled = !canLoop;
      btnLoop.classList.toggle('active', loopOn && canLoop);
      btnClear.disabled = pointA === null && pointB === null;
    }

    btnA.addEventListener('click', function(){
      pointA = media.currentTime;
      // Si B existe et qu'on met A après B, on swap
      if(pointB !== null && pointA >= pointB){
        pointB = null;
      }
      refreshUI();
    });

    btnB.addEventListener('click', function(){
      const t = media.currentTime;
      if(pointA === null || t > pointA){
        pointB = t;
      } else {
        // Si on met B avant A, on l'ignore
        return;
      }
      refreshUI();
    });

    btnLoop.addEventListener('click', function(){
      if(pointA === null || pointB === null || pointB <= pointA) return;
      loopOn = !loopOn;
      if(loopOn){
        // Démarrer la lecture depuis A si pas dans la zone
        if(media.currentTime < pointA || media.currentTime > pointB){
          media.currentTime = pointA;
        }
        media.play().catch(function(){});
      }
      refreshUI();
    });

    btnClear.addEventListener('click', function(){
      pointA = null;
      pointB = null;
      loopOn = false;
      refreshUI();
    });

    // Surveille le timeupdate pour appliquer la boucle
    media.addEventListener('timeupdate', function(){
      if(loopOn && pointA !== null && pointB !== null && pointB > pointA){
        if(media.currentTime >= pointB){
          media.currentTime = pointA;
        }
      }
    });

    refreshUI();
  }

  function init(){
    // Tous les <audio> et toutes les <video class="video-native"> reçoivent le panneau
    const medias = document.querySelectorAll('audio, video.video-native');
    medias.forEach(attachABLoop);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Réattaque si on change de langue (re-render)
  window.addEventListener('atelier-lang-change', init);
})();
