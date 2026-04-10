// persist.js
// Persistência local para o checklist — usa localStorage para salvar/recuperar.
// Requer que os elementos do DOM usem os mesmos seletores/atributos do HTML
// que te entreguei (inputs meta-..., .item-row com data-setor/data-item, radios,
// textarea.obs, checkbox para foto).
(function(){
  const STORAGE_KEY = 'vistoria_santa_amelia_v1';

  // --- Helpers ---
  function saveAll(){
    const payload = {
      meta: getMetadados(),
      items: collectResponses()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      // opcional: visual feedback
      // console.log('Salvo localmente', payload);
    } catch(e){
      console.error('Erro ao salvar no localStorage:', e);
      alert('Erro ao salvar localmente: ' + (e && e.message));
    }
  }

  function loadAll(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    try {
      return JSON.parse(raw);
    } catch(e){
      console.error('JSON inválido no localStorage:', e);
      return null;
    }
  }

  function clearAll(){
    localStorage.removeItem(STORAGE_KEY);
  }

  function downloadJSON(obj, filename='vistoria_backup.json'){
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // IMPORTANTE: Estas duas funções assumem que o HTML define essas funções ou
  // elementos. Se o teu HTML usar nomes diferentes, adapte os seletores.
  function getMetadados(){
    const empresa = document.getElementById('meta-empresa') ? document.getElementById('meta-empresa').value.trim() : '';
    const responsavel = document.getElementById('meta-responsavel') ? document.getElementById('meta-responsavel').value.trim() : '';
    const data = document.getElementById('meta-data') ? document.getElementById('meta-data').value : '';
    const horario = document.getElementById('meta-horario') ? document.getElementById('meta-horario').value.trim() : '';
    return { empresa, responsavel, data, horario };
  }

  function setMetadados(meta){
    if(!meta) return;
    if(document.getElementById('meta-empresa')) document.getElementById('meta-empresa').value = meta.empresa || '';
    if(document.getElementById('meta-responsavel')) document.getElementById('meta-responsavel').value = meta.responsavel || '';
    if(document.getElementById('meta-data')) document.getElementById('meta-data').value = meta.data || '';
    if(document.getElementById('meta-horario')) document.getElementById('meta-horario').value = meta.horario || '';
  }

  function collectResponses(){
    const rows = document.querySelectorAll('.item-row');
    const out = [];
    rows.forEach(row => {
      const setor = row.dataset.setor || '';
      const item = row.dataset.item || '';
      const radios = row.querySelectorAll('input[type="radio"]');
      let status = 'NA';
      radios.forEach(r => { if(r.checked) status = r.value; });
      const obs = row.querySelector('textarea') ? row.querySelector('textarea').value.trim() : '';
      const photoChk = row.querySelector('input[type="checkbox"]');
      const photo = photoChk ? !!photoChk.checked : false;
      out.push({setor, item, status, obs, photo});
    });
    return out;
  }

  function restoreResponses(items){
    if(!Array.isArray(items)) return;
    const rows = Array.from(document.querySelectorAll('.item-row'));
    items.forEach(it => {
      const row = rows.find(r => r.dataset.setor === it.setor && r.dataset.item === it.item);
      if(!row) return;
      const radios = row.querySelectorAll('input[type="radio"]');
      radios.forEach(r => { r.checked = (r.value === it.status); });
      const ta = row.querySelector('textarea');
      if(ta){
        ta.value = it.obs || '';
        ta.style.display = (it.status === 'NC') ? 'block' : (ta.value ? 'block' : 'none');
      }
      const photoChk = row.querySelector('input[type="checkbox"]');
      if(photoChk) photoChk.checked = !!it.photo;
    });
  }

  // --- Attach listeners to inputs for autosave ---
  function attachAutoSave(){
    // metadados
    ['meta-empresa','meta-responsavel','meta-data','meta-horario'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('change', saveAll);
      el.addEventListener('input', saveAll);
    });

    // radios, textarea, checkboxes
    document.addEventListener('change', function(e){
      const target = e.target;
      if(!target) return;
      if(target.matches('.item-row input[type="radio"], .item-row input[type="checkbox"], .item-row textarea')){
        // small debounce
        if(window._persist_debounce) clearTimeout(window._persist_debounce);
        window._persist_debounce = setTimeout(saveAll, 250);
      }
    }, true);

    // também salvar ao sair da página (opcional)
    window.addEventListener('beforeunload', saveAll);
  }

  // --- Public API: export/import/clear via botões que você pode inserir no HTML ---
  function createControlsUI(){
    // cria container flutuante no topo direito (opcional)
    const cont = document.createElement('div');
    cont.style.position='fixed';
    cont.style.right='12px';
    cont.style.bottom='12px';
    cont.style.zIndex='9999';
    cont.style.display='flex';
    cont.style.flexDirection='column';
    cont.style.gap='8px';

    const btnSave = document.createElement('button');
    btnSave.textContent = 'Salvar local';
    btnSave.style.padding='8px 10px';
    btnSave.style.borderRadius='6px';
    btnSave.style.border='none';
    btnSave.style.background='#0b6aa6';
    btnSave.style.color='#fff';
    btnSave.addEventListener('click', ()=> { saveAll(); alert('Salvo localmente.'); });

    const btnExport = document.createElement('button');
    btnExport.textContent = 'Exportar backup (.json)';
    btnExport.style.padding='8px 10px';
    btnExport.style.borderRadius='6px';
    btnExport.style.border='1px solid #ddd';
    btnExport.addEventListener('click', ()=> {
      const payload = { meta: getMetadados(), items: collectResponses(), exportedAt: new Date().toISOString() };
      downloadJSON(payload, 'vistoria_santa_amelia_backup.json');
    });

    const inputImport = document.createElement('input');
    inputImport.type = 'file';
    inputImport.accept = 'application/json';
    inputImport.style.display = 'none';
    inputImport.addEventListener('change', function(e){
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        try {
          const obj = JSON.parse(ev.target.result);
          if(obj.meta) setMetadados(obj.meta);
          if(obj.items) restoreResponses(obj.items);
          saveAll();
          alert('Backup importado com sucesso.');
        } catch(err){
          alert('Erro ao importar JSON: ' + err.message);
        }
      };
      reader.readAsText(f);
    });

    const btnImport = document.createElement('button');
    btnImport.textContent = 'Importar backup (.json)';
    btnImport.style.padding='8px 10px';
    btnImport.style.borderRadius='6px';
    btnImport.style.border='1px solid #ddd';
    btnImport.addEventListener('click', ()=> inputImport.click());

    const btnClear = document.createElement('button');
    btnClear.textContent = 'Limpar armazenamento';
    btnClear.style.padding='8px 10px';
    btnClear.style.borderRadius='6px';
    btnClear.style.border='1px solid #ddd';
    btnClear.addEventListener('click', ()=> {
      if(confirm('Remover todos os dados salvos localmente?')){ clearAll(); alert('Armazenamento local limpo.'); }
    });

    cont.appendChild(btnSave);
    cont.appendChild(btnExport);
    cont.appendChild(btnImport);
    cont.appendChild(btnClear);
    document.body.appendChild(cont);
  }

  // Inicialização: tenta carregar e restaurar
  function init(){
    // espera DOM
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    // carrega
    const stored = loadAll();
    if(stored){
      if(stored.meta) setMetadados(stored.meta);
      if(stored.items) restoreResponses(stored.items);
      console.log('Dados restaurados do localStorage.');
    }
    attachAutoSave();
    createControlsUI();
  }

  // executar
  init();

  // expõe (opcional) para console
  window.VistoriaPersist = {
    saveAll, loadAll, clearAll, collectResponses, setMetadados
  };
})();
