// =========================================================
// vistoria-add-item.js
// Adiciona itens do cadastro mestre à vistoria atual
// Suporta pesquisa e inclusão offline com sincronização posterior
// =========================================================
(function () {
  const SUPABASE_URL = 'https://uofnninqxnsvaemxpwhh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_kCX0kt1EFYYL0sR3zQHDzg_6rLVRJQ8';
  const CACHE_ITENS = 'checklist_itens_mestre_offline_v1';
  const FILA = 'checklist_add_item_fila_v1';
  let itensMestre = [];
  let selecionados = new Set();
  let localAtual = '';

  function headers(prefer) {
    const h = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Accept: 'application/json' };
    if (prefer) h.Prefer = prefer;
    return h;
  }
  async function api(path, options = {}) {
    const resposta = await fetch(SUPABASE_URL + '/rest/v1/' + path, { ...options, headers: { ...headers(options.prefer), ...(options.headers || {}) } });
    const texto = await resposta.text();
    if (!resposta.ok) throw new Error(texto || ('Erro ' + resposta.status));
    if (!texto) return null;
    try { return JSON.parse(texto); } catch { return texto; }
  }
  function norm(valor) { return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function esc(valor) { return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
  function getVistoriaId() { const p = new URLSearchParams(location.search); return p.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || null; }
  function lerJSON(chave, padrao) { try { return JSON.parse(localStorage.getItem(chave) || '') || padrao; } catch { return padrao; } }
  function salvarJSON(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch (e) { console.error(e); return false; } }
  function carregarItensCache() { const x = lerJSON(CACHE_ITENS, []); return Array.isArray(x) ? x : []; }
  function salvarItensCache(lista) { if (Array.isArray(lista) && lista.length) salvarJSON(CACHE_ITENS, lista); }
  function lerFila() { const x = lerJSON(FILA, []); return Array.isArray(x) ? x : []; }
  function salvarFila(fila) { salvarJSON(FILA, fila); }

  function criarBotoesLocais() {
    document.querySelectorAll('.btn-adicionar-item-local').forEach(b => b.remove());
    document.querySelectorAll('.sector').forEach(section => {
      const local = section.dataset.setor || '';
      if (!local) return;
      const botao = document.createElement('button');
      botao.type = 'button'; botao.className = 'btn btn-adicionar-item-local'; botao.textContent = '+ Adicionar item'; botao.dataset.local = local;
      botao.addEventListener('click', () => abrir(local)); section.appendChild(botao);
    });
  }

  function criarInterface() {
    if (document.getElementById('add-item-overlay')) { criarBotoesLocais(); return; }
    const overlay = document.createElement('div'); overlay.id = 'add-item-overlay';
    overlay.innerHTML = `<div class="add-item-dialog" role="dialog" aria-modal="true" aria-labelledby="add-item-titulo"><div class="add-item-cabecalho"><div><h3 id="add-item-titulo">Selecionar itens</h3><div id="add-item-local" class="add-item-local"></div></div><button id="add-item-fechar" type="button" aria-label="Fechar">×</button></div><input id="add-item-busca" type="search" placeholder="Pesquisar item... (opcional)" autocomplete="off"><div id="add-item-lista" class="add-item-lista"></div><div class="add-item-rodape"><span id="add-item-contador">0 selecionados</span><button id="add-item-cancelar" type="button" class="add-item-sec">Cancelar</button><button id="add-item-confirmar" type="button" class="btn">Adicionar selecionados</button></div></div>`;
    document.body.appendChild(overlay);
    const style = document.createElement('style'); style.textContent = `.btn-adicionar-item-local{display:block;margin:16px auto 6px;min-height:42px;padding:9px 18px}#add-item-overlay{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55)}#add-item-overlay.aberto{display:flex}.add-item-dialog{width:min(720px,100%);max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:14px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.25)}.add-item-cabecalho{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.add-item-cabecalho h3{margin:0;color:#163a5f}.add-item-local{font-size:13px;color:#64748b;margin-top:4px}#add-item-fechar{border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer;color:#475569}#add-item-busca{width:100%;margin:14px 0 10px;padding:11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.add-item-lista{overflow:auto;border:1px solid #e2e8f0;border-radius:9px;min-height:120px}.add-item-opcao{display:flex;gap:10px;align-items:flex-start;padding:11px;border-bottom:1px solid #eef2f7;cursor:pointer}.add-item-opcao:last-child{border-bottom:0}.add-item-opcao input{width:18px;height:18px;flex:0 0 auto;margin-top:1px}.add-item-opcao span{font-size:14px;line-height:1.35}.add-item-vazio{padding:18px;text-align:center;color:#64748b}.add-item-rodape{display:flex;gap:8px;align-items:center;margin-top:12px}.add-item-rodape span{margin-right:auto;font-size:13px;color:#64748b}.add-item-rodape button{min-height:42px;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer}.add-item-sec{border:0;background:#eef2f7;color:#334155}@media(max-width:600px){.btn-adicionar-item-local{width:calc(100% - 16px)}.add-item-dialog{max-height:92vh}.add-item-rodape{display:grid;grid-template-columns:1fr 1fr}.add-item-rodape span{grid-column:1/-1}.add-item-rodape button{width:100%;padding:8px 6px;font-size:13px}}`;
    document.head.appendChild(style);
    document.getElementById('add-item-fechar').addEventListener('click', fechar); document.getElementById('add-item-cancelar').addEventListener('click', fechar); document.getElementById('add-item-busca').addEventListener('input', renderLista); document.getElementById('add-item-confirmar').addEventListener('click', adicionarSelecionados);
    overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
    document.getElementById('add-item-lista').addEventListener('change', e => { const cb = e.target.closest('input[type="checkbox"][data-id]'); if (!cb) return; if (cb.checked) selecionados.add(cb.dataset.id); else selecionados.delete(cb.dataset.id); atualizarContador(); });
    criarBotoesLocais();
  }

  async function atualizarCacheMestre() {
    if (!navigator.onLine) return carregarItensCache();
    try { const lista = await api('checklist_itens_mestre?ativo=eq.true&select=id,descricao&order=descricao.asc') || []; salvarItensCache(lista); return lista; }
    catch (e) { console.warn('Usando cadastro mestre offline.', e); return carregarItensCache(); }
  }

  async function abrir(local) {
    localAtual = local || ''; if (!localAtual) return;
    if (!getVistoriaId()) { alert('Não foi possível identificar a vistoria atual.'); return; }
    selecionados = new Set(); document.getElementById('add-item-local').textContent = 'Local: ' + localAtual; document.getElementById('add-item-busca').value = ''; document.getElementById('add-item-lista').innerHTML = '<div class="add-item-vazio">Carregando itens...</div>'; document.getElementById('add-item-overlay').classList.add('aberto'); atualizarContador();
    itensMestre = await atualizarCacheMestre();
    if (!itensMestre.length) document.getElementById('add-item-lista').innerHTML = '<div class="add-item-vazio">Cadastro de itens ainda não disponível offline. Abra esta função uma vez com internet.</div>'; else renderLista();
    setTimeout(() => document.getElementById('add-item-busca').focus(), 50);
  }
  function fechar() { document.getElementById('add-item-overlay')?.classList.remove('aberto'); }
  function atualizarContador() { const n = selecionados.size; const el = document.getElementById('add-item-contador'); if (el) el.textContent = n + (n === 1 ? ' selecionado' : ' selecionados'); }
  function renderLista() { const lista = document.getElementById('add-item-lista'); if (!lista) return; const termo = norm(document.getElementById('add-item-busca')?.value); const filtrados = itensMestre.filter(item => !termo || norm(item.descricao).includes(termo)); if (!filtrados.length) { lista.innerHTML = '<div class="add-item-vazio">Nenhum item encontrado.</div>'; return; } lista.innerHTML = filtrados.map(item => `<label class="add-item-opcao"><input type="checkbox" data-id="${item.id}" ${selecionados.has(String(item.id)) ? 'checked' : ''}><span>${esc(item.descricao)}</span></label>`).join(''); }
  async function resolverLocalMestre() { const locais = await api('checklist_locais?ativo=eq.true&select=id,nome') || []; return locais.find(l => norm(l.nome) === norm(localAtual)) || null; }

  function incluirNoCacheDaVistoria(escolhidos) {
    if (!window.ChecklistOffline) return;
    const cache = window.ChecklistOffline.read(); if (!cache || !Array.isArray(cache.modelo)) return;
    let ordem = Math.max(0, ...cache.modelo.filter(x => norm(x.setor) === norm(localAtual)).map(x => Number(x.ordem) || 0));
    escolhidos.forEach(item => {
      const existe = cache.modelo.some(x => norm(x.setor) === norm(localAtual) && (String(x.item_id || '') === String(item.id) || norm(x.item) === norm(item.descricao)));
      if (!existe) cache.modelo.push({ local_id: null, item_id: item.id, setor: localAtual, item: item.descricao, ordem: ++ordem, status: 'C' });
    });
    window.ChecklistOffline.write(cache);
  }

  async function adicionarOnline(vistoriaId, escolhidos) {
    const [localMestre, existentes] = await Promise.all([resolverLocalMestre(), api(`checklist_vistoria_itens?vistoria_id=eq.${encodeURIComponent(vistoriaId)}&select=item_mestre_id,local_nome_snapshot,item_descricao_snapshot,ordem`) || []]);
    const existentesNoLocal = existentes.filter(x => norm(x.local_nome_snapshot) === norm(localAtual));
    const ids = new Set(existentesNoLocal.map(x => String(x.item_mestre_id || '')).filter(Boolean)); const textos = new Set(existentesNoLocal.map(x => norm(x.item_descricao_snapshot)));
    const novos = escolhidos.filter(x => !ids.has(String(x.id)) && !textos.has(norm(x.descricao))); if (!novos.length) return 0;
    let ordem = Math.max(0, ...existentesNoLocal.map(x => Number(x.ordem) || 0));
    const payload = novos.map(item => ({ vistoria_id: vistoriaId, item_mestre_id: item.id, local_id: localMestre?.id || null, local_nome_snapshot: localAtual, item_descricao_snapshot: item.descricao, status: 'C', observacao: null, ordem: ++ordem }));
    await api('checklist_vistoria_itens', { method: 'POST', body: JSON.stringify(payload), prefer: 'return=minimal' }); return novos.length;
  }

  async function adicionarSelecionados() {
    if (!selecionados.size) { alert('Selecione pelo menos um item.'); return; }
    const vistoriaId = getVistoriaId(); const botao = document.getElementById('add-item-confirmar'); botao.disabled = true; botao.textContent = 'Adicionando...';
    const escolhidos = itensMestre.filter(x => selecionados.has(String(x.id)));
    try {
      if (!navigator.onLine) {
        const fila = lerFila(); escolhidos.forEach(item => { if (!fila.some(x => x.vistoria_id === vistoriaId && norm(x.local_nome) === norm(localAtual) && String(x.item_id) === String(item.id))) fila.push({ vistoria_id: vistoriaId, local_nome: localAtual, item_id: item.id, descricao: item.descricao, criado_em: new Date().toISOString() }); }); salvarFila(fila); incluirNoCacheDaVistoria(escolhidos); fechar(); alert('Item salvo no aparelho. Será sincronizado quando a internet voltar.'); location.reload(); return;
      }
      const n = await adicionarOnline(vistoriaId, escolhidos); if (!n) { alert('Os itens selecionados já existem neste local da vistoria.'); return; } fechar(); location.reload();
    } catch (erro) { console.error('Erro ao adicionar item à vistoria:', erro); alert('Não foi possível adicionar os itens à vistoria.'); }
    finally { botao.disabled = false; botao.textContent = 'Adicionar selecionados'; }
  }

  async function sincronizarFila() {
    if (!navigator.onLine) return; const fila = lerFila(); if (!fila.length) return;
    const restantes = [];
    for (const registro of fila) {
      try { localAtual = registro.local_nome; await adicionarOnline(registro.vistoria_id, [{ id: registro.item_id, descricao: registro.descricao }]); }
      catch (e) { console.warn('Inclusão offline ainda pendente.', e); restantes.push(registro); }
    }
    salvarFila(restantes);
  }

  function iniciar() {
    criarInterface();
    if (navigator.onLine) atualizarCacheMestre();
    sincronizarFila(); window.addEventListener('online', sincronizarFila);
    const checklist = document.getElementById('checklist'); if (checklist) { const observer = new MutationObserver(() => criarBotoesLocais()); observer.observe(checklist, { childList: true }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
