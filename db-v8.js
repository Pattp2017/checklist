// =========================================================
// db-v8.js - Integração do Checklist com Supabase
// =========================================================
(function () {
  const SUPABASE_URL = 'https://dbleblnwolbbxtscjxif.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_RIq2RdCrwvjvZc7CswobVg_0BlBfRSd';
  const TABELA_VISTORIAS = 'checklist_vistorias';
  const TABELA_ITENS = 'checklist_itens';
  const BUCKET_FOTOS = 'checklist-fotos';

  function getHeaders(prefer = 'return=representation') {
    return { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: prefer };
  }
  function getVistoriaId() { const params = new URLSearchParams(window.location.search); return params.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || null; }
  function setVistoriaId(id) { if (id) localStorage.setItem('checklist_vistoria_id', id); }
  function clearVistoriaId() { localStorage.removeItem('checklist_vistoria_id'); }

  function getDadosFormulario() {
    return {
      empresa_id: document.getElementById('meta-empresa-id')?.value || null,
      empresa_nome: document.getElementById('meta-empresa-nome')?.value.trim() || '',
      responsavel_tecnico: document.getElementById('meta-responsavel-tecnico')?.value.trim() || '',
      responsavel_auditoria: document.getElementById('meta-responsavel-auditoria')?.value.trim() || '',
      data_auditoria: document.getElementById('meta-data-auditoria')?.value || null,
      horario: document.getElementById('meta-horario')?.value.trim() || '',
      status: 'EM_ANDAMENTO'
    };
  }

  function validar(dados) {
    if (!dados.empresa_nome) { alert('Informe a empresa.'); return false; }
    if (!dados.responsavel_auditoria) { alert('Informe o responsável pela auditoria.'); return false; }
    if (!dados.data_auditoria) { alert('Informe a data da auditoria.'); return false; }
    return true;
  }

  async function criarVistoria(dados) {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA_VISTORIAS}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(dados) });
    const texto = await resposta.text(); if (!resposta.ok) throw new Error(texto || 'Erro ao criar vistoria.');
    const registros = texto ? JSON.parse(texto) : []; if (!registros.length) throw new Error('Supabase não retornou a vistoria criada.');
    setVistoriaId(registros[0].id); return registros[0];
  }

  async function atualizarVistoria(id, dados) {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA_VISTORIAS}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ ...dados, atualizado_em: new Date().toISOString() })
    });
    const texto = await resposta.text(); if (!resposta.ok) throw new Error(texto || 'Erro ao atualizar vistoria.');
    if (!texto) return { id, ...dados }; const registros = JSON.parse(texto); return registros[0] || { id, ...dados };
  }

  function getItensChecklist(vistoriaId) {
    if (!window.VistoriaPersist || typeof window.VistoriaPersist.collectResponses !== 'function') throw new Error('Persistência local não carregada.');
    return window.VistoriaPersist.collectResponses().map(resposta => ({
      vistoria_id: vistoriaId,
      setor: resposta.setor,
      item: resposta.item,
      status: resposta.status,
      observacao: resposta.status === 'NC' ? (resposta.obs || null) : null,
      responsavel_nc: resposta.status === 'NC' ? (resposta.responsavel_nc || null) : null,
      data_nc: resposta.status === 'NC' ? (resposta.data_nc || null) : null,
      arquivar_foto: !!resposta.photo,
      foto_path: null
    }));
  }

  async function apagarItens(vistoriaId) {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA_ITENS}?vistoria_id=eq.${encodeURIComponent(vistoriaId)}`, { method: 'DELETE', headers: getHeaders('return=minimal') });
    if (!resposta.ok) { const texto = await resposta.text(); throw new Error(texto || 'Erro ao apagar itens antigos.'); }
  }

  async function inserirItens(itens) {
    if (!itens.length) return [];
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA_ITENS}`, { method: 'POST', headers: getHeaders('return=minimal'), body: JSON.stringify(itens) });
    if (!resposta.ok) { const texto = await resposta.text(); throw new Error(texto || 'Erro ao inserir itens.'); }
    return itens;
  }

  async function uploadFoto(vistoriaId, setor, item, arquivo) {
    if (!arquivo) return null;
    const extensao = arquivo.name && arquivo.name.includes('.') ? arquivo.name.split('.').pop().toLowerCase() : 'jpg';
    const idArquivo = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
    const caminho = vistoriaId + '/' + idArquivo + '.' + extensao;
    const resposta = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${caminho}`, {
      method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': arquivo.type || 'image/jpeg', 'x-upsert': 'false' }, body: arquivo
    });
    if (!resposta.ok) { const texto = await resposta.text(); throw new Error('Erro ao enviar foto: ' + texto); }
    return caminho;
  }

  async function salvarItens(vistoriaId) {
    const itens = getItensChecklist(vistoriaId);
    for (const item of itens) {
      if (!window.VistoriaFotos || typeof window.VistoriaFotos.getFotoPorDados !== 'function') break;
      const arquivo = window.VistoriaFotos.getFotoPorDados(item.setor, item.item); if (!arquivo) continue;
      item.foto_path = await uploadFoto(vistoriaId, item.setor, item.item, arquivo); item.arquivar_foto = true;
    }
    await apagarItens(vistoriaId); await inserirItens(itens); return itens;
  }

  function validarItensNC() {
    if (!window.VistoriaPersist || typeof window.VistoriaPersist.collectResponses !== 'function') return true;
    const respostas = window.VistoriaPersist.collectResponses();
    const pendentes = respostas.filter(item => item.status === 'NC' && (
      !item.obs || item.obs.trim().length < 3 || !item.responsavel_nc || !item.responsavel_nc.trim() || !item.data_nc
    ));

    document.querySelectorAll('.obs-required').forEach(el => el.classList.remove('obs-required'));
    if (!pendentes.length) return true;

    const primeiro = pendentes[0];
    const row = Array.from(document.querySelectorAll('.item-row')).find(r => r.dataset.setor === primeiro.setor && r.dataset.item === primeiro.item);
    if (row) {
      const faltandoObs = !primeiro.obs || primeiro.obs.trim().length < 3;
      const faltandoResponsavel = !primeiro.responsavel_nc || !primeiro.responsavel_nc.trim();
      const faltandoData = !primeiro.data_nc;
      const alvo = faltandoObs ? row.querySelector('textarea.obs') : faltandoResponsavel ? row.querySelector('.responsavel-nc') : row.querySelector('.data-nc');
      const campos = row.querySelector('.campos-nc'); if (campos) campos.style.display = 'block';
      if (alvo) { alvo.classList.add('obs-required'); alvo.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => alvo.focus(), 300); }
    }
    alert(`Existem ${pendentes.length} item(ns) N/C com dados incompletos.\n\nPreencha observação, responsável e data antes de salvar.`);
    return false;
  }

  async function salvarVistoria() {
    const botao = document.getElementById('btn-salvar-meta'); const dados = getDadosFormulario();
    if (!validar(dados) || !validarItensNC()) return null;
    if (window.VistoriaPersist?.saveAll) window.VistoriaPersist.saveAll();
    if (botao) { botao.disabled = true; botao.textContent = 'Salvando...'; }
    try {
      let vistoria, vistoriaId = getVistoriaId();
      if (vistoriaId) vistoria = await atualizarVistoria(vistoriaId, dados);
      else { vistoria = await criarVistoria(dados); vistoriaId = vistoria.id; }
      setVistoriaId(vistoriaId); await salvarItens(vistoriaId); if (window.VistoriaPersist?.saveAll) window.VistoriaPersist.saveAll();
      alert('Vistoria e itens salvos com sucesso.'); return { ...vistoria, id: vistoriaId };
    } catch (erro) { console.error('Falha ao salvar:', erro); alert('Não foi possível salvar a vistoria.\n\n' + (erro?.message || String(erro))); return null; }
    finally { if (botao) { botao.disabled = false; botao.textContent = 'Salvar'; } }
  }

  async function concluirVistoria() {
    const botao = document.getElementById('btn-concluir-checklist');
    try {
      if (botao) { botao.disabled = true; botao.textContent = 'Concluindo...'; }
      const vistoria = await salvarVistoria(); if (!vistoria) return false;
      const vistoriaId = getVistoriaId(); if (!vistoriaId) throw new Error('ID da vistoria não encontrado.');
      const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA_VISTORIAS}?id=eq.${encodeURIComponent(vistoriaId)}`, {
        method: 'PATCH', headers: getHeaders('return=representation'), body: JSON.stringify({ status: 'FINALIZADA', atualizado_em: new Date().toISOString() })
      });
      const texto = await resposta.text(); if (!resposta.ok) throw new Error(texto || 'Não foi possível finalizar a vistoria.');
      if (window.VistoriaPersist?.clearCurrent) window.VistoriaPersist.clearCurrent(); clearVistoriaId(); localStorage.removeItem('checklist_nova_vistoria');
      alert('Checklist concluído com sucesso.'); window.location.href = 'index.html'; return true;
    } catch (erro) { console.error('Erro ao concluir checklist:', erro); alert('Não foi possível concluir o checklist.\n\n' + (erro?.message || String(erro))); return false; }
    finally { if (botao) { botao.disabled = false; botao.textContent = 'Concluir Checklist'; } }
  }

  function novaVistoria() { if (window.VistoriaPersist?.clearCurrent) window.VistoriaPersist.clearCurrent(); clearVistoriaId(); console.log('Vistoria atual encerrada localmente.'); }
  window.VistoriaDB = { salvarVistoria, concluirVistoria, salvarItens, uploadFoto, novaVistoria, getVistoriaId, setVistoriaId };
})();
