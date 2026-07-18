/* ════════════════════════════════════════════════════════════════
   L'ATELIER — Fenêtre popup PDF partagée
   Injecte automatiquement la modale + les fonctions openPdfModal()
   et closePdfModal() sur n'importe quelle page qui inclut ce script.
   Usage : onclick="openPdfModal('URL_ENCODEE', 'Titre')"
   ════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .pdf-modal-overlay{position:fixed;inset:0;background:rgba(11,7,16,.75);z-index:280;display:none;align-items:center;justify-content:center;padding:1rem;}
    .pdf-modal-overlay.open{display:flex;}
    .pdf-modal{position:relative;width:100%;max-width:900px;height:88vh;border-radius:16px;overflow:hidden;background:#2a2a2a;box-shadow:0 30px 80px rgba(0,0,0,.5);}
    .pdf-modal-iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
    .pdf-modal-close{position:absolute;top:.6rem;right:.6rem;z-index:2;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;}
    .pdf-modal-close:hover{background:rgba(0,0,0,.75);}
    .pdf-modal-close [data-lucide]{width:18px;height:18px;}
  `;
  document.head.appendChild(style);

  function injectModal(){
    if(document.getElementById('pdf-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'pdf-modal-overlay';
    overlay.className = 'pdf-modal-overlay';
    overlay.setAttribute('onclick', "if(event.target===this)closePdfModal()");
    overlay.innerHTML = `
      <div class="pdf-modal">
        <button class="pdf-modal-close" onclick="closePdfModal()" aria-label="Fermer"><span data-lucide="x"></span></button>
        <iframe id="pdf-modal-frame" class="pdf-modal-iframe" title="Partition PDF"></iframe>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectModal);
  } else {
    injectModal();
  }

  /* Ouvre une partition (ou tout autre PDF Dropbox) dans la fenêtre popup,
     sans quitter la page courante. encodedUrl doit être encodeURIComponent()
     de l'URL Dropbox complète. */
  window.openPdfModal = function(encodedUrl, title){
    injectModal();
    const iframe = document.getElementById('pdf-modal-frame');
    const fromPage = window.location.pathname.split('/').pop() || 'index.html';
    iframe.src = 'pdf-view.html?url=' + encodedUrl + '&title=' + encodeURIComponent(title || 'Partition') + '&from=' + fromPage;
    document.getElementById('pdf-modal-overlay').classList.add('open');
    if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  };

  window.closePdfModal = function(){
    const overlay = document.getElementById('pdf-modal-overlay');
    if(overlay) overlay.classList.remove('open');
    const iframe = document.getElementById('pdf-modal-frame');
    if(iframe) iframe.src = '';
  };
})();
