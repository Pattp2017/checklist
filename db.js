// =========================================================
// db.js
// Integração do Checklist com Supabase
// =========================================================

(function () {

  const SUPABASE_URL =
    'https://dbleblnwolbbxtscjxif.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_RIq2RdCrwvjvZc7CswobVg_0BlBfRSd';

  const TABELA_VISTORIAS =
    'checklist_vistorias';


  // =======================================================
  // HEADERS
  // =======================================================

  function getHeaders() {
    return {
      'apikey': SUPABASE_KEY,

      'Authorization':
        'Bearer ' + SUPABASE_KEY,

      'Content-Type':
        'application/json',

      'Prefer':
        'return=representation'
    };
  }


  // =======================================================
  // PEGAR ID DA VISTORIA LOCAL
  // =======================================================

  function getVistoriaId() {

    const id =
      localStorage.getItem(
        'checklist_vistoria_id'
      );

    return id || null;
  }


  // =======================================================
  // SALVAR ID LOCALMENTE
  // =======================================================

  function setVistoriaId(id) {

    if (!id) return;

    localStorage.setItem(
      'checklist_vistoria_id',
      id
    );
  }


  // =======================================================
  // REMOVER ID
  // =======================================================

  function clearVistoriaId() {

    localStorage.removeItem(
      'checklist_vistoria_id'
    );
  }


  // =======================================================
  // PEGAR DADOS DA TELA
  // =======================================================

  function getDadosFormulario() {

    const empresaId =
      document.getElementById(
        'meta-empresa-id'
      );

    const empresaNome =
      document.getElementById(
        'meta-empresa-nome'
      );

    const responsavelTecnico =
      document.getElementById(
        'meta-responsavel-tecnico'
      );

    const responsavelAuditoria =
      document.getElementById(
        'meta-responsavel-auditoria'
      );

    const dataAuditoria =
      document.getElementById(
        'meta-data-auditoria'
      );

    const horario =
      document.getElementById(
        'meta-horario'
      );


    return {

      empresa_id:
        empresaId &&
        empresaId.value
          ? empresaId.value
          : null,

      empresa_nome:
        empresaNome
          ? empresaNome.value.trim()
          : '',

      responsavel_tecnico:
        responsavelTecnico
          ? responsavelTecnico.value.trim()
          : '',

      responsavel_auditoria:
        responsavelAuditoria
          ? responsavelAuditoria.value.trim()
          : '',

      data_auditoria:
        dataAuditoria
          ? dataAuditoria.value
          : null,

      horario:
        horario
          ? horario.value.trim()
          : '',

      status:
        'EM_ANDAMENTO'
    };
  }


  // =======================================================
  // VALIDAÇÃO
  // =======================================================

  function validar(dados) {

    if (!dados.empresa_nome) {
      alert(
        'Informe a empresa.'
      );

      return false;
    }


    if (!dados.responsavel_auditoria) {
      alert(
        'Informe o responsável pela auditoria.'
      );

      return false;
    }


    if (!dados.data_auditoria) {
      alert(
        'Informe a data da auditoria.'
      );

      return false;
    }


    return true;
  }


  // =======================================================
  // CRIAR NOVA VISTORIA
  // =======================================================

  async function criarVistoria(dados) {

    const resposta =
      await fetch(
        SUPABASE_URL +
        '/rest/v1/' +
        TABELA_VISTORIAS,
        {

          method: 'POST',

          headers:
            getHeaders(),

          body:
            JSON.stringify(dados)

        }
      );


    const texto =
      await resposta.text();


    if (!resposta.ok) {

      console.error(
        'Erro ao criar vistoria:',
        resposta.status,
        texto
      );

      throw new Error(texto);
    }


    const registros =
      JSON.parse(texto);


    if (
      !registros ||
      !registros.length
    ) {

      throw new Error(
        'Supabase não retornou a vistoria criada.'
      );
    }


    const vistoria =
      registros[0];


    setVistoriaId(
      vistoria.id
    );


    return vistoria;
  }


  // =======================================================
  // ATUALIZAR VISTORIA EXISTENTE
  // =======================================================

  async function atualizarVistoria(
    id,
    dados
  ) {

    const resposta =
      await fetch(
        SUPABASE_URL +
        '/rest/v1/' +
        TABELA_VISTORIAS +
        '?id=eq.' +
        encodeURIComponent(id),
        {

          method: 'PATCH',

          headers:
            getHeaders(),

          body:
            JSON.stringify({
              ...dados,

              atualizado_em:
                new Date()
                  .toISOString()
            })

        }
      );


    const texto =
      await resposta.text();


    if (!resposta.ok) {

      console.error(
        'Erro ao atualizar vistoria:',
        resposta.status,
        texto
      );

      throw new Error(texto);
    }


    if (!texto) {
      return {
        id,
        ...dados
      };
    }


    const registros =
      JSON.parse(texto);


    return registros[0] || {
      id,
      ...dados
    };
  }


  // =======================================================
  // SALVAR VISTORIA
  // =======================================================

  async function salvarVistoria() {

    const botao =
      document.getElementById(
        'btn-salvar-meta'
      );


    const dados =
      getDadosFormulario();


    if (!validar(dados)) {
      return;
    }


    // Primeiro salva localmente
    if (
      window.VistoriaPersist &&
      typeof
        window.VistoriaPersist
          .saveAll === 'function'
    ) {

      window.VistoriaPersist
        .saveAll();
    }


    if (botao) {

      botao.disabled = true;

      botao.textContent =
        'Salvando...';
    }


    try {

      let vistoria;

      const vistoriaId =
        getVistoriaId();


      if (vistoriaId) {

        vistoria =
          await atualizarVistoria(
            vistoriaId,
            dados
          );

      } else {

        vistoria =
          await criarVistoria(
            dados
          );
      }


      console.log(
        'Vistoria salva:',
        vistoria
      );


      alert(
        'Vistoria salva com sucesso.'
      );


      return vistoria;


    } catch (erro) {

      console.error(
        'Falha ao salvar vistoria:',
        erro
      );


      alert(
        'Não foi possível salvar no banco.\n\n' +
        'Os dados continuam salvos neste aparelho.'
      );


      return null;


    } finally {

      if (botao) {

        botao.disabled = false;

        botao.textContent =
          'Salvar';
      }
    }
  }


  // =======================================================
  // NOVA VISTORIA
  // =======================================================

  function novaVistoria() {

    clearVistoriaId();

    console.log(
      'ID da vistoria atual removido.'
    );
  }


  // =======================================================
  // API GLOBAL
  // =======================================================

  window.VistoriaDB = {

    salvarVistoria,

    novaVistoria,

    getVistoriaId,

    setVistoriaId
  };

})();
