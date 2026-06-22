/**
 * planning-sync.js — PHÉNIX · Atelier Funk
 * Fetch index.html, extrait l'audio de la dernière répétition pour ce morceau,
 * remplace le bloc "Audio répétition" dans la fiche.
 *
 * Convention :
 *   <meta name="phenix-slug" content="easy-lover">   ← à placer dans chaque fiche
 *
 * Mapping t-name → slug :
 *   "Worth It"               → worth-it
 *   "Still a Friend of Mine" → still-a-friend
 *   "Easy Lover"             → easy-lover
 *   "Say Say Say"            → say-say-say
 *   "Medley Justin"          → medley-jt
 *   "Heyoka Chelles"         → heyoka-chelles
 *   "This Place Hotel"       → this-place-hotel
 *   "Medley Chaka"           → medley-chaka
 */
(function(){
  'use strict';

  const SLUG_MAP = {
    'worth it':               'worth-it',
    'still a friend of mine': 'still-a-friend',
    'easy lover':             'easy-lover',
    'say say say':            'say-say-say',
    'medley justin':          'medley-jt',
    'heyoka chelles':         'heyoka-chelles',
    'this place hotel':       'this-place-hotel',
    'medley chaka':           'medley-chaka',
  };

  function getSlug(){
    const meta = document.querySelector('meta[name="phenix-slug"]');
    if(meta) return meta.getAttribute('content');
    // Fallback: extraire du pathname
    const p = window.location.pathname.replace(/.*\//, '').replace('.html','');
    return p;
  }

  function normalizeTitle(txt){
    return txt.replace(/<[^>]+>/g,'').trim().toLowerCase();
  }

  function makeAudioBlock(src, date, type){
    const id = 'audio-sync-repet-' + Date.now();
    const typeAttr = type || 'audio/mpeg';
    return `<div class="audio-block" id="sync-repet-block">
      <div class="audio-label">
        <span class="audio-label-main"><span data-lucide="mic-vocal"></span><span class="sync-repet-label">${date}</span></span>
      </div>
      <audio id="${id}" controls preload="none">
        <source src="${src}" type="${typeAttr}">
        <span>Lecture impossible</span>
      </audio>
      <div class="audio-controls">
        <span class="speed-lbl"><span data-lucide="gauge"></span>Vitesse</span>
        <button class="audio-speed" onclick="setSpeed('${id}',0.75,this)">0.75×</button>
        <button class="audio-speed active" onclick="setSpeed('${id}',1,this)">1×</button>
        <button class="audio-speed" onclick="setSpeed('${id}',1.25,this)">1.25×</button>
        <a href="${src.replace('raw=1','').replace(/[?&]$/, '') + (src.includes('?') ? '&' : '?') + 'dl=1'}" class="audio-dl"><span data-lucide="download"></span>Télécharger</a>
      </div>
    </div>`;
  }

  async function syncPlanning(){
    const slug = getSlug();
    if(!slug) return;

    let html;
    try {
      const resp = await fetch('index.html', { cache: 'default' });
      if(!resp.ok) return;
      html = await resp.text();
    } catch(e){ return; }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Trouver toutes les répétitions (event-row avec data-date)
    const rows = Array.from(doc.querySelectorAll('.event-row[data-date]'));
    // Filtrer: uniquement les répétitions (pas le concert) et <= aujourd'hui
    const today = new Date(); today.setHours(23,59,59,999);
    const repets = rows.filter(row => {
      const d = new Date(row.getAttribute('data-date'));
      return !isNaN(d) && d <= today && !row.classList.contains('concert');
    });
    if(!repets.length) return;

    // Trier par date décroissante → prendre la plus récente
    repets.sort((a,b) => new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date')));
    const latest = repets[0];
    const latestDate = latest.getAttribute('data-date');

    // Formater la date
    const d = new Date(latestDate);
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const dateLabel = `Atelier du ${d.getDate()} ${months[d.getMonth()]}`;

    // Chercher un audio-track correspondant au slug dans cette répétition
    const tracks = Array.from(latest.querySelectorAll('.audio-track'));
    let matchSrc = null, matchType = 'audio/mpeg';

    for(const track of tracks){
      const nameEl = track.querySelector('.t-name');
      if(!nameEl) continue;
      const normalized = normalizeTitle(nameEl.textContent);

      // Vérifier si ce track correspond au slug courant
      let matched = false;
      for(const [key, val] of Object.entries(SLUG_MAP)){
        if(val === slug && normalized.startsWith(key)){
          matched = true; break;
        }
      }
      if(!matched) continue;

      const source = track.querySelector('audio source');
      if(source){
        matchSrc = source.getAttribute('src');
        matchType = source.getAttribute('type') || 'audio/mpeg';
        break;
      }
    }

    if(!matchSrc) return;

    // Remplacer ou injecter le bloc audio répétition dans la section Audios
    // Chercher un bloc existant avec id="sync-repet-block" (mise à jour idempotente)
    const existing = document.getElementById('sync-repet-block');
    if(existing){
      // Mettre à jour le src et le label
      const src = existing.querySelector('audio source');
      if(src) src.setAttribute('src', matchSrc);
      const lbl = existing.querySelector('.sync-repet-label');
      if(lbl) lbl.textContent = dateLabel;
      const dl = existing.querySelector('.audio-dl');
      if(dl) dl.href = matchSrc.replace('raw=1','').replace(/[?&]$/, '') + (matchSrc.includes('?') ? '&' : '?') + 'dl=1';
      return;
    }

    // Chercher le bloc "Audio répétition" placeholder à remplacer
    const audioSection = document.querySelector('section .section-title [data-fr="Audios"]')
      ?.closest('section');
    if(!audioSection) return;

    // Chercher le bloc placeholder avec "Audio répétition"
    let targetBlock = null;
    for(const block of audioSection.querySelectorAll('.audio-block')){
      const lbl = block.querySelector('.audio-label-main');
      if(lbl && /répétition/i.test(lbl.textContent)){
        targetBlock = block; break;
      }
    }

    const newBlockHtml = makeAudioBlock(matchSrc, dateLabel, matchType);
    if(targetBlock){
      targetBlock.outerHTML = newBlockHtml;
    } else {
      // Insérer à la fin de la section audios
      audioSection.insertAdjacentHTML('beforeend', newBlockHtml);
    }

    // Masquer le bloc audio original s'il contient #REMPLACER
    const origBlock = Array.from(audioSection.querySelectorAll('.audio-block')).find(b => {
      const ph = b.querySelector('.audio-placeholder');
      return ph && ph.textContent.includes('#REMPLACER');
    });
    if(origBlock) origBlock.style.display = 'none';

    // Réinitialiser Lucide icons sur les nouveaux éléments
    if(window.lucide && lucide.createIcons) lucide.createIcons();
  }

  // Lancer après chargement complet
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', syncPlanning);
  } else {
    syncPlanning();
  }
})();
