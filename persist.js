// =========================================================
// persist.js - Persistência local do Checklist
// =========================================================
(function () {
  const STORAGE_PREFIX = 'checklist_vistoria_local_v3_';

  function getVistoriaId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || '';
  }
  function getStorageKey() { const id = getVistoriaId(); return STORAGE_PREFIX + (id || 'sem_id'); }

  function getMetadados() {
    return {
      empresa_id: document.getElementById('meta-empresa-id')?.value || null,
      empresa_nome: document.getElementById('meta-empresa-nome')?.value.trim() || '',
      responsavel_tecnico: document.getElementById('meta-responsavel-tecnico')?.value.trim() || '',
      responsavel_auditoria: document.getElementById('meta-responsavel-auditoria')?.value.trim() || '',
      data_auditoria: document.getElementById('meta-data-auditoria')?.value || '',
      horario: document.getElementById('meta-horario')?.value.trim() || ''
    };
  }

  function setMetadados(meta) {
    if (!meta) return;
    const campos = {
      'meta-empresa-id': meta.empresa_id || '', 'meta-empresa-nome': meta.empresa_nome || '',
      'meta-responsavel-tecnico': meta.responsavel_tecnico || '', 'meta-responsavel-auditoria': meta.responsavel_auditoria || '',
      'meta-data-auditoria': meta.data_auditoria || '', 'meta-horario': meta.horario || ''
    };
    Object.entries(campos).forEach(([id, valor]) => { const el = document.getElementById(id); if (el) el.value = valor; });
  }

  async function carregarDadosVistoria() {
    const vistoriaId = getVistoriaId(); if (!vistoriaId) return null;
    const SUPABASE_URL = 'https://dbleblnwolbbxtscjxif.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_RIq2RdCrwvjvZc7CswobVg_0BlBfRSd';
    try {
      const resposta = await fetch(`${SUPABASE_URL}/rest/v1/checklist_vistorias?id=eq.${encodeURIComponent(vistoriaId)}&select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
      const texto = await resposta.text(); if (!resposta.ok) throw new Error(texto || 'Erro ao carregar vistoria.');
      const registros = texto ? JSON.parse(texto) : []; if (!registros.length) throw new Error('Vistoria não encontrada.');
      const vistoria = registros[0];
      setMetadados(vistoria); localStorage.setItem('checklist_vistoria_id', vistoria.id); return vistoria;
    } catch (erro) { console.error('Erro ao carregar vistoria:', erro); alert('Não foi possível carregar os dados da vistoria.'); return null; }
  }

  function collectResponses() {
    return Array.from(document.querySelectorAll('.item-row')).map(row => {
      const marcado = row.querySelector('input[type="radio"]:checked');
      const textarea = row.querySelector('textarea.obs');
      const responsavel = row.querySelector('.responsavel-nc');
      const dataNC = row.querySelector('.data-nc');
      const status = marcado ? marcado.value : 'C';
      return {
        setor: row.dataset.setor || '', item: row.dataset.item || '', local_id: row.dataset.localId || '', item_id: row.dataset.itemId || '',
        status,
        obs: status === 'NC' && textarea ? textarea.value.trim() : '',
        responsavel_nc: status === 'NC' && responsavel ? responsavel.value.trim() : '',
        data_nc: status === 'NC' && dataNC ? dataNC.value : '',
        photo: row.dataset.temFoto === 'true'
      };
    });
  }

  function aplicarRespostaNaLinha(row, it) {
    row.querySelectorAll('input[type="radio"]').forEach(radio => { radio.checked = radio.value === it.status; });
    const textarea = row.querySelector('textarea.obs'); if (textarea) textarea.value = it.obs || '';
    const responsavel = row.querySelector('.responsavel-nc'); if (responsavel) responsavel.value = it.responsavel_nc || '';
    const dataNC = row.querySelector('.data-nc'); if (dataNC) dataNC.value = it.data_nc || '';
    if (it.photo) row.dataset.temFoto = 'true'; else delete row.dataset.temFoto;
    const marcado = row.querySelector('input[type="radio"]:checked');
    if (marcado) marcado.dispatchEvent(new Event('change', { bubbles: true }));
    // O change acima exibe os campos. Restauramos os valores depois para evitar limpeza acidental.
    if (it.status === 'NC') {
      if (textarea) textarea.value = it.obs || '';
      if (responsavel) responsavel.value = it.responsavel_nc || '';
      if (dataNC) dataNC.value = it.data_nc || document.getElementById('meta-data-auditoria')?.value || '';
    }
  }

  function restoreResponses(items) {
    if (!Array.isArray(items) || !items.length) return 0;
    const rows = Array.from(document.querySelectorAll('.item-row')); let restaurados = 0;
    items.forEach(it => {
      const row = rows.find(r => it.local_id && it.item_id && r.dataset.localId && r.dataset.itemId
        ? String(r.dataset.localId) === String(it.local_id) && String(r.dataset.itemId) === String(it.item_id)
        : r.dataset.setor === it.setor && r.dataset.item === it.item);
      if (!row) return; aplicarRespostaNaLinha(row, it); restaurados++;
    }); return restaurados;
  }

  function saveAll() {
    const payload = { vistoria_id: getVistoriaId() || null, meta: getMetadados(), items: collectResponses(), salvo_em: new Date().toISOString() };
    try { localStorage.setItem(getStorageKey(), JSON.stringify(payload)); } catch (erro) { console.error('Erro ao salvar localmente:', erro); }
  }
  function loadAll() { const raw = localStorage.getItem(getStorageKey()); if (!raw) return null; try { return JSON.parse(raw); } catch (erro) { console.error('Erro ao carregar dados locais:', erro); return null; } }
  function clearCurrent() { localStorage.removeItem(getStorageKey()); }

  function esperarChecklistPronto(timeoutMs = 10000) {
    return new Promise(resolve => { const inicio = Date.now(); function verificar() { if (document.querySelectorAll('.item-row').length) return resolve(true); if (Date.now() - inicio >= timeoutMs) return resolve(false); setTimeout(verificar, 100); } verificar(); });
  }

  function attachAutoSave() {
    ['meta-empresa-id','meta-empresa-nome','meta-responsavel-tecnico','meta-responsavel-auditoria','meta-data-auditoria','meta-horario'].forEach(id => {
      const el = document.getElementById(id); if (!el) return; el.addEventListener('input', saveAll); el.addEventListener('change', saveAll);
    });
    function agendarSave() { clearTimeout(window._persist_debounce); window._persist_debounce = setTimeout(saveAll, 250); }
    document.addEventListener('change', event => { if (event.target?.matches('.item-row input[type="radio"], .item-row textarea, .item-row .responsavel-nc, .item-row .data-nc')) agendarSave(); }, true);
    document.addEventListener('input', event => { if (event.target?.matches('.item-row textarea, .item-row .responsavel-nc, .item-row .data-nc')) agendarSave(); }, true);
    window.addEventListener('beforeunload', saveAll);
  }

  function preencherHorarioAutomatico() {
    const campo = document.getElementById('meta-horario'); if (!campo || campo.value) return;
    const agora = new Date(); const hora = String(agora.getHours()).padStart(2, '0'); const minuto = String(agora.getMinutes()).padStart(2, '0'); campo.value = `Início ${hora}:${minuto}`;
  }

  async function init() {
    const novaVistoria = localStorage.getItem('checklist_nova_vistoria') === 'true';
    if (novaVistoria) { clearCurrent(); await carregarDadosVistoria(); localStorage.removeItem('checklist_nova_vistoria'); }
    else { const stored = loadAll(); if (stored?.meta) setMetadados(stored.meta); else await carregarDadosVistoria(); }
    preencherHorarioAutomatico();
    const checklistPronto = await esperarChecklistPronto();
    if (checklistPronto) { const stored = loadAll(); if (stored?.items) restoreResponses(stored.items); }
    attachAutoSave(); saveAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.VistoriaPersist = { saveAll, loadAll, clearCurrent, getStorageKey, getMetadados, setMetadados, collectResponses, restoreResponses };
})();
