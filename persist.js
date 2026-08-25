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

  function init() {

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

})();
