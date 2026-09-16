// =========================================================
// vistoria-medida-corretiva.js
// Medida corretiva padrão do item, congelada no snapshot
// =========================================================
(function () {
  const SUPABASE_URL = 'https://dbleblnwolbbxtscjxif.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_kCX0kt1EFYYL0sR3zQHDzg_6rLVRJQ8';
  const cacheSnapshot = new Map();
  const cacheMestre = new Map();
  const timers = new WeakMap();

  function headers(prefer) {
    const h = {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (prefer) h.Prefer = prefer;
    return h;
  }

  async function api(path, options = {}) {
    const resposta = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      ...options,
      headers: { ...headers(options.prefer), ...(options.headers || {}) }
    });
    const texto = await resposta.text();
    if (!resposta.ok) throw new Error(texto || ('Erro ' + resposta.status));
    if (!texto) return null;
    try { return JSON.parse(texto); } catch { return texto; }
  }

  function norm(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getVistoriaId() {
    const params = new URLSearchParams(location.search);
    return params.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || null;
  }

  function chave(setor, item) {
    return norm(setor) + '||' + norm(item);
  }

  async function carregarSnapshot() {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId) return;
    const registros = await api(
      `checklist_vistoria_itens?vistoria_id=eq.${encodeURIComponent(vistoriaId)}` +
      `&select=id,item_mestre_id,local_nome_snapshot,item_descricao_snapshot,medida_corretiva_snapshot`
    ) || [];
    cacheSnapshot.clear();
    registros.forEach(reg => cacheSnapshot.set(chave(reg.local_nome_snapshot, reg.item_descricao_snapshot), reg));
  }

  async function buscarPadrao(itemMestreId) {
    if (!itemMestreId) return '';
    if (cacheMestre.has(itemMestreId)) return cacheMestre.get(itemMestreId);
    const dados = await api(
      `checklist_itens_mestre?id=eq.${encodeURIComponent(itemMestreId)}` +
      `&select=id,medida_corretiva_recomendada`
    ) || [];
    const valor = dados[0]?.medida_corretiva_recomendada || '';
    cacheMestre.set(itemMestreId, valor);
    return valor;
  }

  async function salvarSnapshot(registro, valor) {
    if (!registro?.id) return;
    await api(`checklist_vistoria_itens?id=eq.${encodeURIComponent(registro.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        medida_corretiva_snapshot: valor || null,
        atualizado_em: new Date().toISOString()
      }),
      prefer: 'return=minimal'
    });
    registro.medida_corretiva_snapshot = valor || null;
  }

  function criarCampo(row) {
    if (row.querySelector('.medida-corretiva-nc')) return;
    const camposNC = row.querySelector('.campos-nc');
    if (!camposNC) return;

    const titulo = document.createElement('div');
    titulo.className = 'medida-corretiva-label';
    titulo.textContent = 'Medida corretiva recomendada';

    const textarea = document.createElement('textarea');
    textarea.className = 'medida-corretiva-nc';
    textarea.rows = 3;
    textarea.placeholder = 'Medida corretiva recomendada para esta N/C';

    const responsavel = camposNC.querySelector('.responsavel-nc');
    if (responsavel) {
      camposNC.insertBefore(titulo, responsavel);
      camposNC.insertBefore(textarea, responsavel);
    } else {
      camposNC.appendChild(titulo);
      camposNC.appendChild(textarea);
    }

    textarea.addEventListener('input', () => {
      clearTimeout(timers.get(textarea));
      timers.set(textarea, setTimeout(async () => {
        const reg = cacheSnapshot.get(chave(row.dataset.setor, row.dataset.item));
        if (!reg) return;
        try {
          await salvarSnapshot(reg, textarea.value.trim());
        } catch (erro) {
          console.error('Erro ao salvar medida corretiva:', erro);
        }
      }, 500));
    });
  }

  async function preencherLinha(row) {
    criarCampo(row);
    const textarea = row.querySelector('.medida-corretiva-nc');
    if (!textarea) return;

    const reg = cacheSnapshot.get(chave(row.dataset.setor, row.dataset.item));
    if (!reg) return;

    if (textarea.value.trim()) return;
    if (reg.medida_corretiva_snapshot) {
      textarea.value = reg.medida_corretiva_snapshot;
      return;
    }

    const radioNC = row.querySelector('input[type="radio"][value="NC"]');
    if (!radioNC?.checked) return;

    const padrao = await buscarPadrao(reg.item_mestre_id);
    if (!padrao) return;
    textarea.value = padrao;
    try {
      await salvarSnapshot(reg, padrao);
    } catch (erro) {
      console.error('Erro ao congelar medida corretiva no snapshot:', erro);
    }
  }

  async function prepararTudo() {
    try {
      await carregarSnapshot();
      const rows = Array.from(document.querySelectorAll('.item-row'));
      rows.forEach(criarCampo);
      for (const row of rows) await preencherLinha(row);
    } catch (erro) {
      console.error('Erro ao preparar medidas corretivas:', erro);
    }
  }

  document.addEventListener('change', async event => {
    const target = event.target;
    if (!target || target.type !== 'radio' || target.value !== 'NC' || !target.checked) return;
    const row = target.closest('.item-row');
    if (!row) return;
    try {
      if (!cacheSnapshot.size) await carregarSnapshot();
      await preencherLinha(row);
    } catch (erro) {
      console.error('Erro ao carregar medida corretiva padrão:', erro);
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .medida-corretiva-label{font-size:13px;font-weight:700;margin:10px 0 6px;color:#334155}
    .medida-corretiva-nc{width:100%;min-height:78px;resize:vertical}
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepararTudo);
  } else {
    prepararTudo();
  }

  window.VistoriaMedidaCorretiva = { prepararTudo, carregarSnapshot };
})();
