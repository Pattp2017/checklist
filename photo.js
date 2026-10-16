// =========================================================
// photo.js
// Fotos de itens N/C com persistência offline em IndexedDB
// =========================================================
(function () {
  const fotosPendentes = new Map();
  const DB_NAME = 'checklist_fotos_offline';
  const DB_VERSION = 1;
  const FOTO_MAX_DIMENSAO = 1600;
  const FOTO_QUALIDADE = 0.78;
  const STORE = 'fotos';
  let dbPromise = null;

  function getVistoriaId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('vistoria_id') || localStorage.getItem('checklist_vistoria_id') || '';
  }

  function getChaveItem(row) {
    return (row.dataset.setor || '') + '||' + (row.dataset.item || '');
  }

  function getStatus(row) {
    const radio = row.querySelector('input[type="radio"]:checked');
    return radio ? radio.value : '';
  }

  function abrirDB() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB indisponível'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('vistoria_id', 'vistoria_id', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB'));
    });
    return dbPromise;
  }

  async function idbSalvar(chave, arquivo) {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId || !arquivo) return;
    const db = await abrirDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        id: vistoriaId + '||' + chave,
        vistoria_id: vistoriaId,
        chave,
        arquivo,
        nome: Array.isArray(arquivo) ? 'fotos' : arquivo.name || 'foto.jpg',
        tipo: Array.isArray(arquivo) ? 'image/jpeg' : arquivo.type || 'image/jpeg',
        salvo_em: new Date().toISOString()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbRemover(chave) {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId) return;
    try {
      const db = await abrirDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(vistoriaId + '||' + chave);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { console.warn('Não foi possível remover foto offline:', e); }
  }

  async function idbCarregarVistoria() {
    const vistoriaId = getVistoriaId();
    if (!vistoriaId) return [];
    try {
      const db = await abrirDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const idx = tx.objectStore(STORE).index('vistoria_id');
        const req = idx.getAll(vistoriaId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Fotos offline não puderam ser restauradas:', e);
      return [];
    }
  }

  async function idbLimparVistoria() {
    const registros = await idbCarregarVistoria();
    if (!registros.length) return;
    const db = await abrirDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      registros.forEach(r => store.delete(r.id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  function marcarBotao(row, temFoto) {
    if (temFoto) row.dataset.temFoto = 'true';
    else delete row.dataset.temFoto;
    const botao = row.querySelector('.btn-foto');
    if (botao) {
      botao.textContent = temFoto ? `📷 ${((fotosPendentes.get(getChaveItem(row)) || []).length || 1)} foto(s) ✓` : '📷 Adicionar fotos';
      botao.classList.toggle('foto-ok', temFoto);
    }
  }

  async function removerFoto(row) {
    const chave = getChaveItem(row);
    fotosPendentes.delete(chave);
    marcarBotao(row, false);
    await idbRemover(chave);
  }

  async function comprimirFoto(arquivo) {
    if (!arquivo || !arquivo.type?.startsWith('image/')) return arquivo;
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, FOTO_MAX_DIMENSAO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao comprimir foto.')), 'image/jpeg', FOTO_QUALIDADE);
    });
    return new File([blob], 'foto-' + Date.now() + '.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  }

  async function registrarFotos(row, arquivos) {
    const chave = getChaveItem(row);
    const botao = row.querySelector('.btn-foto');
    const anteriores = fotosPendentes.get(chave) || [];
    const lista = Array.isArray(anteriores) ? anteriores : [anteriores];
    try {
      if (botao) { botao.disabled = true; botao.textContent = '📷 Processando...'; }
      const novas = [];
      for (const arquivo of arquivos) {
        if (arquivo.type.startsWith('image/')) novas.push(await comprimirFoto(arquivo));
      }
      if (!novas.length) return;
      const todas = [...lista, ...novas];
      await idbSalvar(chave, todas);
      fotosPendentes.set(chave, todas);
      marcarBotao(row, true);
      mostrarMiniaturas(row);
    } catch (erro) {
      console.error('Falha ao salvar fotografias:', erro);
      alert('Não foi possível armazenar as fotografias. Verifique o espaço disponível.');
    } finally {
      if (botao) botao.disabled = false;
      marcarBotao(row, fotosPendentes.has(chave));
    }
  }

  function mostrarMiniaturas(row) {
    row.querySelector('.fotos-miniaturas')?.remove();
    const chave = getChaveItem(row);
    const arquivos = fotosPendentes.get(chave);
    if (!arquivos) return;
    const lista = Array.isArray(arquivos) ? arquivos : [arquivos];
    const painel = document.createElement('div');
    painel.className = 'fotos-miniaturas';
    painel.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:10px 0';
    lista.forEach((arquivo, indice) => {
      const bloco = document.createElement('div');
      bloco.style.cssText = 'position:relative;width:90px;height:90px';
      const img = document.createElement('img');
      const url = URL.createObjectURL(arquivo);
      img.src = url; img.alt = 'Foto ' + (indice + 1);
      img.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:6px';
      img.onload = () => URL.revokeObjectURL(url);
      const excluir = document.createElement('button');
      excluir.type = 'button'; excluir.textContent = '×'; excluir.title = 'Excluir foto';
      excluir.style.cssText = 'position:absolute;right:0;top:0;background:#b91c1c;color:white;border:0;border-radius:50%;width:25px;height:25px;cursor:pointer';
      excluir.addEventListener('click', async () => {
        const atual = fotosPendentes.get(chave) || [];
        const restantes = (Array.isArray(atual) ? atual : [atual]).filter((_, i) => i !== indice);
        if (restantes.length) { await idbSalvar(chave, restantes); fotosPendentes.set(chave, restantes); }
        else { fotosPendentes.delete(chave); await idbRemover(chave); }
        marcarBotao(row, restantes.length > 0);
        mostrarMiniaturas(row);
      });
      bloco.append(img, excluir); painel.appendChild(bloco);
    });
    (row.querySelector('.campos-nc') || row).appendChild(painel);
  }

  function abrirCamera(row) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    // Sem capture: no computador permite selecionar várias fotos de uma vez.
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      await registrarFotos(row, Array.from(input.files || []));
      input.remove();
    }, { once: true });
    input.click();
  }

  function criarBotaoFoto(row) {
    if (row.querySelector('.btn-foto')) return;
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'btn-foto';
    botao.textContent = row.dataset.temFoto === 'true' ? '📷 Foto anexada ✓' : '📷 Foto';
    if (row.dataset.temFoto === 'true') botao.classList.add('foto-ok');
    botao.addEventListener('click', () => abrirCamera(row));

    const speechControls = row.querySelector('.speech-controls');
    if (speechControls) {
      const status = speechControls.querySelector('.speech-status');
      if (status) speechControls.insertBefore(botao, status);
      else speechControls.appendChild(botao);
      return;
    }
    const obs = row.querySelector('textarea.obs');
    if (obs) obs.insertAdjacentElement('afterend', botao);
    else row.appendChild(botao);
  }

  function removerBotaoFoto(row) {
    const botao = row.querySelector('.btn-foto');
    if (botao) botao.remove();
    row.querySelector('.fotos-miniaturas')?.remove();
  }

  function atualizarFoto(row) {
    const status = getStatus(row);
    if (status === 'NC') {
      criarBotaoFoto(row);
      if (fotosPendentes.has(getChaveItem(row))) marcarBotao(row, true);
    } else {
      const chave = getChaveItem(row);
      if (fotosPendentes.has(chave) || row.dataset.temFoto === 'true') removerFoto(row);
      removerBotaoFoto(row);
    }
  }

  async function restaurarFotos() {
    const registros = await idbCarregarVistoria();
    registros.forEach(reg => {
      if (reg.chave && reg.arquivo) fotosPendentes.set(reg.chave, reg.arquivo);
    });
    document.querySelectorAll('.item-row').forEach(row => {
      if (getStatus(row) === 'NC' && fotosPendentes.has(getChaveItem(row))) {
        row.dataset.temFoto = 'true';
        criarBotaoFoto(row);
        marcarBotao(row, true);
        mostrarMiniaturas(row);
      }
    });
    if (registros.length) console.log(registros.length + ' foto(s) restaurada(s) do armazenamento offline.');
  }

  document.addEventListener('change', function (event) {
    const target = event.target;
    if (!target || target.type !== 'radio') return;
    const row = target.closest('.item-row');
    if (row) atualizarFoto(row);
  });

  async function iniciar() {
    // Sem MutationObserver global: alterações em uma foto não podem disparar
    // uma nova varredura de todas as linhas do checklist.
    document.querySelectorAll('.item-row').forEach(atualizarFoto);
    await restaurarFotos();
    // A montagem do checklist é assíncrona. Uma única restauração tardia é suficiente.
    setTimeout(restaurarFotos, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.VistoriaFotos = {
    getFoto(row) { const f = fotosPendentes.get(getChaveItem(row)); return Array.isArray(f) ? f[0] : f || null; },
    getFotosPorDados(setor, item) { const f = fotosPendentes.get(setor + '||' + item); return f ? (Array.isArray(f) ? f : [f]) : []; },
    getFotoPorDados(setor, item) { return fotosPendentes.get(setor + '||' + item) || null; },
    getFotoPorChave(chave) { return fotosPendentes.get(chave) || null; },
    getQuantidade() { return fotosPendentes.size; },
    getTodas() { return Array.from(fotosPendentes.entries()); },
    removerFoto,
    restaurarFotos,
    async removerPersistidaPorDados(setor, item) { await idbRemover(setor + '||' + item); },
    async limparPersistidas() { await idbLimparVistoria(); },
    async limpar() {
      fotosPendentes.clear();
      await idbLimparVistoria();
      document.querySelectorAll('.btn-foto').forEach(botao => botao.remove());
    }
  };
})();

// Módulo isolado para incluir itens somente na vistoria atual.
(function carregarModuloAdicionarItem() {
  if (document.querySelector('script[data-vistoria-add-item]')) return;
  const script = document.createElement('script');
  script.src = 'vistoria-add-item.js?v=1';
  script.dataset.vistoriaAddItem = 'true';
  document.body.appendChild(script);
})();

// Módulo isolado para medida corretiva recomendada das N/C.
(function carregarModuloMedidaCorretiva() {
  if (document.querySelector('script[data-vistoria-medida-corretiva]')) return;
  const script = document.createElement('script');
  script.src = 'vistoria-medida-corretiva.js?v=1';
  script.dataset.vistoriaMedidaCorretiva = 'true';
  document.body.appendChild(script);
})();