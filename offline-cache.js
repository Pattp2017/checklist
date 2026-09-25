// =========================================================
// offline-cache.js - Cache offline da vistoria
// =========================================================
(function () {
  'use strict';
  const VERSION = 1;
  const PREFIX = 'checklist_offline_v1_';

  function getVistoriaId() {
    const p = new URLSearchParams(location.search);
    return p.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || '';
  }
  function key() { return PREFIX + (getVistoriaId() || 'sem_id'); }
  function read() {
    try { return JSON.parse(localStorage.getItem(key()) || 'null'); }
    catch (e) { console.warn('Cache offline inválido.', e); return null; }
  }
  function write(payload) {
    try {
      localStorage.setItem(key(), JSON.stringify({
        version: VERSION, atualizado_em: new Date().toISOString(), ...payload
      }));
      return true;
    } catch (e) { console.error('Falha ao gravar cache offline.', e); return false; }
  }
  function saveModel(vistoria, dados) {
    if (!Array.isArray(dados) || !dados.length) return false;
    const atual = read() || {};
    return write({ ...atual, vistoria: vistoria || atual.vistoria || null, modelo: dados });
  }
  function loadModel() {
    const c = read();
    return Array.isArray(c?.modelo) && c.modelo.length ? c : null;
  }
  function setBanner(text, tipo) {
    let el = document.getElementById('offline-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'offline-status';
      el.style.cssText = 'display:none;margin:10px 0;padding:10px 12px;border-radius:8px;font-weight:700;text-align:center;border:1px solid #e5e7eb;';
      document.querySelector('.controls-top')?.insertAdjacentElement('beforebegin', el);
    }
    el.textContent = text;
    el.style.display = 'block';
    el.style.background = tipo === 'offline' ? '#fff7d6' : '#e9f8ef';
    el.style.color = tipo === 'offline' ? '#725600' : '#176b39';
  }

  function setNetworkBorder(online) {
    // Elemento próprio em vez de pseudo-elemento do <html>.
    // Em navegadores móveis o html::after pode acompanhar a área rolável
    // quando a barra do navegador muda de tamanho, dando a impressão de
    // que o retângulo "anda" pela tela.
    let border = document.getElementById('checklist-network-border');
    if (!border) {
      border = document.createElement('div');
      border.id = 'checklist-network-border';
      border.setAttribute('aria-hidden', 'true');
      border.style.cssText = [
        'position:fixed',
        'top:0',
        'right:0',
        'bottom:0',
        'left:0',
        'width:100vw',
        'height:100dvh',
        'box-sizing:border-box',
        'pointer-events:none',
        'z-index:2147483647',
        'border:3px solid #22c55e',
        'transition:border-color .25s ease',
        'transform:translateZ(0)'
      ].join(';');
      (document.body || document.documentElement).appendChild(border);
    }
    border.style.borderColor = online ? '#22c55e' : '#f59e0b';
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    setNetworkBorder(online);

    if (!online) setBanner('📴 Modo offline • dados permanecem neste aparelho', 'offline');
    else {
      const el = document.getElementById('offline-status');
      if (el) el.style.display = 'none';
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  document.addEventListener('DOMContentLoaded', updateNetworkStatus);
  updateNetworkStatus();

  window.ChecklistOffline = { saveModel, loadModel, read, write, updateNetworkStatus };
})();
