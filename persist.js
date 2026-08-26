// =========================================================
// persist.js
// Persistência local do Checklist
// =========================================================

(function () {

  const STORAGE_KEY =
    'checklist_vistoria_local_v2';


  // =======================================================
  // METADADOS
  // =======================================================

  function getMetadados() {

    return {

      empresa_id:
        document.getElementById(
          'meta-empresa-id'
        )?.value || null,

      empresa_nome:
        document.getElementById(
          'meta-empresa-nome'
        )?.value.trim() || '',

      responsavel_tecnico:
        document.getElementById(
          'meta-responsavel-tecnico'
        )?.value.trim() || '',

      responsavel_auditoria:
        document.getElementById(
          'meta-responsavel-auditoria'
        )?.value.trim() || '',

      data_auditoria:
        document.getElementById(
          'meta-data-auditoria'
        )?.value || '',

      horario:
        document.getElementById(
          'meta-horario'
        )?.value.trim() || ''
    };
  }


  function setMetadados(meta) {

    if (!meta) return;


    const campos = {

      'meta-empresa-id':
        meta.empresa_id || '',

      'meta-empresa-nome':
        meta.empresa_nome || '',

      'meta-responsavel-tecnico':
        meta.responsavel_tecnico || '',

      'meta-responsavel-auditoria':
        meta.responsavel_auditoria || '',

      'meta-data-auditoria':
        meta.data_auditoria || '',

      'meta-horario':
        meta.horario || ''
    };


    Object.keys(campos)
      .forEach(id => {

        const el =
          document.getElementById(id);

        if (el) {
          el.value =
            campos[id];
        }
      });
  }

   // =======================================================
  // CARREGA CABEÇALHO
  // =======================================================
async function carregarDadosVistoria() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const vistoriaId =
    params.get(
      'vistoria_id'
    ) ||
    localStorage.getItem(
      'checklist_vistoria_id'
    );


  if (!vistoriaId) {
    return;
  }


  const SUPABASE_URL =
    'https://dbleblnwolbbxtscjxif.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_RIq2RdCrwvjvZc7CswobVg_0BlBfRSd';


  try {

    const resposta =
      await fetch(
        `${SUPABASE_URL}/rest/v1/checklist_vistorias?id=eq.${encodeURIComponent(vistoriaId)}&select=*`,
        {
          headers: {

            apikey:
              SUPABASE_KEY,

            Authorization:
              'Bearer ' +
              SUPABASE_KEY
          }
        }
      );


    if (!resposta.ok) {

      const texto =
        await resposta.text();

      throw new Error(
        texto
      );
    }


    const registros =
      await resposta.json();


    if (!registros.length) {

      throw new Error(
        'Vistoria não encontrada.'
      );
    }


    const vistoria =
      registros[0];


    document
      .getElementById(
        'meta-empresa-id'
      )
      .value =
        vistoria.empresa_id || '';


    document
      .getElementById(
        'meta-empresa-nome'
      )
      .value =
        vistoria.empresa_nome || '';


    document
      .getElementById(
        'meta-responsavel-tecnico'
      )
      .value =
        vistoria.responsavel_tecnico || '';


    document
      .getElementById(
        'meta-responsavel-auditoria'
      )
      .value =
        vistoria.responsavel_auditoria || '';


    document
      .getElementById(
        'meta-data-auditoria'
      )
      .value =
        vistoria.data_auditoria || '';


    document
      .getElementById(
        'meta-horario'
      )
      .value =
        vistoria.horario || '';


    localStorage.setItem(
      'checklist_vistoria_id',
      vistoria.id
    );


    console.log(
      'Dados da vistoria carregados:',
      vistoria
    );


  } catch (erro) {

    console.error(
      'Erro ao carregar vistoria:',
      erro
    );

    alert(
      'Não foi possível carregar os dados da vistoria.'
    );
  }
}
  
  // =======================================================
  // RESPOSTAS
  // =======================================================

  function collectResponses() {

    const rows =
      document.querySelectorAll(
        '.item-row'
      );


    const out = [];


    rows.forEach(row => {

      const setor =
        row.dataset.setor || '';

      const item =
        row.dataset.item || '';


      const marcado =
        row.querySelector(
          'input[type="radio"]:checked'
        );


      const status =
        marcado
          ? marcado.value
          : 'NA';


      const textarea =
        row.querySelector(
          'textarea.obs'
        );


      const obs =
        textarea
          ? textarea.value.trim()
          : '';


      const foto =
        row.querySelector(
          'input[type="checkbox"]'
        );


      out.push({

        setor,

        item,

        status,

        obs,

        photo:
          foto
            ? foto.checked
            : false
      });
    });


    return out;
  }


  function restoreResponses(items) {

    if (!Array.isArray(items)) {
      return;
    }


    const rows =
      Array.from(
        document.querySelectorAll(
          '.item-row'
        )
      );


    items.forEach(it => {

      const row =
        rows.find(r =>
          r.dataset.setor ===
            it.setor &&
          r.dataset.item ===
            it.item
        );


      if (!row) return;


      const radios =
        row.querySelectorAll(
          'input[type="radio"]'
        );


      radios.forEach(r => {

        r.checked =
          r.value === it.status;
      });


      const textarea =
        row.querySelector(
          'textarea.obs'
        );


      if (textarea) {

        textarea.value =
          it.obs || '';


        textarea.style.display =
          it.status === 'NC'
            ? 'block'
            : 'none';
      }


      const foto =
        row.querySelector(
          'input[type="checkbox"]'
        );


      if (foto) {

        foto.checked =
          !!it.photo;
      }
    });
  }


  // =======================================================
  // SALVAR LOCAL
  // =======================================================

  function saveAll() {

    const payload = {

      meta:
        getMetadados(),

      items:
        collectResponses(),

      salvo_em:
        new Date()
          .toISOString()
    };


    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(payload)
      );

    } catch (erro) {

      console.error(
        'Erro ao salvar localmente:',
        erro
      );
    }
  }


  // =======================================================
  // CARREGAR LOCAL
  // =======================================================

  function loadAll() {

    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (!raw) {
      return null;
    }


    try {

      return JSON.parse(raw);

    } catch (erro) {

      console.error(
        'Erro ao carregar dados locais:',
        erro
      );

      return null;
    }
  }


  // =======================================================
  // AUTOSAVE
  // =======================================================

  function attachAutoSave() {

    const ids = [

      'meta-empresa-id',

      'meta-empresa-nome',

      'meta-responsavel-tecnico',

      'meta-responsavel-auditoria',

      'meta-data-auditoria',

      'meta-horario'
    ];


    ids.forEach(id => {

      const el =
        document.getElementById(id);


      if (!el) return;


      el.addEventListener(
        'input',
        saveAll
      );


      el.addEventListener(
        'change',
        saveAll
      );
    });


    document.addEventListener(
      'change',
      function (event) {

        const target =
          event.target;


        if (!target) return;


        if (
          target.matches(
            '.item-row input[type="radio"],' +
            '.item-row input[type="checkbox"],' +
            '.item-row textarea'
          )
        ) {

          clearTimeout(
            window
              ._persist_debounce
          );


          window
            ._persist_debounce =
              setTimeout(
                saveAll,
                250
              );
        }
      },
      true
    );


    document.addEventListener(
      'input',
      function (event) {

        if (
          event.target &&
          event.target.matches(
            '.item-row textarea'
          )
        ) {

          clearTimeout(
            window
              ._persist_debounce
          );


          window
            ._persist_debounce =
              setTimeout(
                saveAll,
                250
              );
        }
      },
      true
    );


    window.addEventListener(
      'beforeunload',
      saveAll
    );
  }


  // =======================================================
  // INICIALIZAÇÃO
  // =======================================================

  async function init() {

  const novaVistoria =
    localStorage.getItem(
      'checklist_nova_vistoria'
    ) === 'true';


  // =========================================
  // NOVA VISTORIA
  // =========================================

  if (novaVistoria) {

    // remove dados da vistoria anterior
    localStorage.removeItem(
      STORAGE_KEY
    );


    // carrega os dados reais
    // da vistoria recém-criada no Supabase
    await carregarDadosVistoria();


    // marca como já carregada
    localStorage.removeItem(
      'checklist_nova_vistoria'
    );


    console.log(
      'Nova vistoria carregada do Supabase.'
    );


  } else {

    // =======================================
    // VISTORIA JÁ EXISTENTE / RECUPERAÇÃO
    // =======================================

    const stored =
      loadAll();


    if (stored) {

      if (stored.meta) {

        setMetadados(
          stored.meta
        );
      }


      if (stored.items) {

        restoreResponses(
          stored.items
        );
      }


      console.log(
        'Dados restaurados do localStorage.'
      );

    } else {

      // sem dados locais:
      // tenta carregar pelo vistoria_id
      await carregarDadosVistoria();
    }
  }


  attachAutoSave();
}


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();
  }


  // =======================================================
  // API GLOBAL
  // =======================================================

  window.VistoriaPersist = {

    saveAll,

    loadAll,

    getMetadados,

    setMetadados,

    collectResponses,

    restoreResponses
  };

  // =======================================================
  // HORA AUTOMÁTICA
  // =======================================================
function preencherHorarioAutomatico() {
  const campo = document.getElementById('meta-horario');

  if (!campo) return;

  if (!campo.value) {
    const agora = new Date();

    const hora = String(
      agora.getHours()
    ).padStart(2, '0');

    const minuto = String(
      agora.getMinutes()
    ).padStart(2, '0');

    campo.value =
      `Início ${hora}:${minuto}`;
  }
}

preencherHorarioAutomatico();
})();

