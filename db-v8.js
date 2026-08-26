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

  const TABELA_ITENS =
    'checklist_itens';
  const BUCKET_FOTOS =
    'checklist-fotos';

  // =======================================================
  // HEADERS
  // =======================================================

  function getHeaders(prefer = 'return=representation') {
    return {
      apikey: SUPABASE_KEY,
      Authorization:
        'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: prefer
    };
  }


  // =======================================================
  // ID DA VISTORIA
  // =======================================================

  function getVistoriaId() {
    return (
      localStorage.getItem(
        'checklist_vistoria_id'
      ) || null
    );
  }


  function setVistoriaId(id) {
    if (!id) return;

    localStorage.setItem(
      'checklist_vistoria_id',
      id
    );
  }


  function clearVistoriaId() {
    localStorage.removeItem(
      'checklist_vistoria_id'
    );
  }


  // =======================================================
  // DADOS DA VISTORIA
  // =======================================================

  function getDadosFormulario() {

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
        )?.value || null,

      horario:
        document.getElementById(
          'meta-horario'
        )?.value.trim() || '',

      status:
        'EM_ANDAMENTO'
    };
  }


  // =======================================================
  // VALIDAÇÃO
  // =======================================================

  function validar(dados) {

    if (!dados.empresa_nome) {
      alert('Informe a empresa.');
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
  // CRIAR VISTORIA
  // =======================================================

  async function criarVistoria(dados) {

    const resposta =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${TABELA_VISTORIAS}`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(dados)
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


    if (!registros?.length) {
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
  // ATUALIZAR VISTORIA
  // =======================================================

  async function atualizarVistoria(
    id,
    dados
  ) {

    const resposta =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${TABELA_VISTORIAS}?id=eq.${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({
            ...dados,
            atualizado_em:
              new Date().toISOString()
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


    return (
      registros[0] || {
        id,
        ...dados
      }
    );
  }


  // =======================================================
  // PEGAR ITENS DA TELA
  // =======================================================

  function getItensChecklist(
    vistoriaId
  ) {

    if (
      !window.VistoriaPersist ||
      typeof window.VistoriaPersist
        .collectResponses !==
        'function'
    ) {

      throw new Error(
        'Persistência local não carregada.'
      );
    }


    const respostas =
      window.VistoriaPersist
        .collectResponses();


    return respostas.map(
      resposta => ({
        vistoria_id:
          vistoriaId,

        setor:
          resposta.setor,

        item:
          resposta.item,

        status:
          resposta.status,

        observacao:
          resposta.obs || null,

        arquivar_foto:
          !!resposta.photo,

        foto_path:
          null
      })
    );
  }


  // =======================================================
  // APAGAR ITENS ANTIGOS
  // =======================================================

  async function apagarItens(
    vistoriaId
  ) {

    const resposta =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${TABELA_ITENS}?vistoria_id=eq.${encodeURIComponent(vistoriaId)}`,
        {
          method: 'DELETE',
          headers:
            getHeaders(
              'return=minimal'
            )
        }
      );


    if (!resposta.ok) {

      const texto =
        await resposta.text();

      console.error(
        'Erro ao apagar itens antigos:',
        resposta.status,
        texto
      );

      throw new Error(texto);
    }
  }


  // =======================================================
  // INSERIR ITENS
  // =======================================================

  async function inserirItens(
    itens
  ) {

    if (!itens.length) {
      return [];
    }


    const resposta =
      await fetch(
        `${SUPABASE_URL}/rest/v1/${TABELA_ITENS}`,
        {
          method: 'POST',
          headers:
            getHeaders(
              'return=minimal'
            ),
          body:
            JSON.stringify(itens)
        }
      );


    if (!resposta.ok) {

      const texto =
        await resposta.text();

      console.error(
        'Erro ao inserir itens:',
        resposta.status,
        texto
      );

      throw new Error(texto);
    }


    return itens;
  }

// =======================================================
// UPLOAD DE FOTO
// =======================================================

async function uploadFoto(
  vistoriaId,
  setor,
  item,
  arquivo
) {

  if (!arquivo) {
    return null;
  }

  const extensao =
    arquivo.name &&
    arquivo.name.includes('.')
      ? arquivo.name
          .split('.')
          .pop()
          .toLowerCase()
      : 'jpg';

  const nomeArquivo =
    crypto.randomUUID() +
    '.' +
    extensao;

  const caminho =
    vistoriaId +
    '/' +
    nomeArquivo;

  const resposta =
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${caminho}`,
      {
        method: 'POST',

        headers: {
          apikey: SUPABASE_KEY,

          Authorization:
            'Bearer ' + SUPABASE_KEY,

          'Content-Type':
            arquivo.type || 'image/jpeg',

          'x-upsert':
            'false'
        },

        body: arquivo
      }
    );

  if (!resposta.ok) {

    const texto =
      await resposta.text();

    console.error(
      'Erro no upload da foto:',
      resposta.status,
      texto
    );

    throw new Error(
      'Erro ao enviar foto: ' +
      texto
    );
  }

  console.log(
    'Foto enviada:',
    caminho
  );

  return caminho;
}
  // =======================================================
  // SALVAR ITENS DA VISTORIA
  // =======================================================

async function salvarItens(
  vistoriaId
) {

  const itens =
    getItensChecklist(
      vistoriaId
    );


  // =====================================================
  // ENVIAR FOTOS PENDENTES
  // =====================================================

  for (const item of itens) {

    if (
      !window.VistoriaFotos ||
      typeof window.VistoriaFotos
        .getFotoPorDados !== 'function'
    ) {
      continue;
    }


    const arquivo =
      window.VistoriaFotos
        .getFotoPorDados(
          item.setor,
          item.item
        );


    if (!arquivo) {
      continue;
    }


    console.log(
      'Enviando foto:',
      item.setor,
      item.item
    );


    const caminho =
      await uploadFoto(
        vistoriaId,
        item.setor,
        item.item,
        arquivo
      );


    item.foto_path =
      caminho;

    item.arquivar_foto =
      true;
  }


  // =====================================================
  // SUBSTITUIR ITENS DA VISTORIA
  // =====================================================

  await apagarItens(
    vistoriaId
  );


  await inserirItens(
    itens
  );


  console.log(
    `${itens.length} item(ns) salvo(s).`
  );


  return itens;
}
  // =======================================================
  // SALVAR TUDO
  // =======================================================

 async function salvarVistoria() {

   alert('ENTROU NO DB-V8');

  const botao =
    document.getElementById(
      'btn-salvar-meta'
    );


  const dados =
    getDadosFormulario();


  alert('2 - dados do formulário carregados');


  // =====================================================
  // VALIDAR DADOS PRINCIPAIS
  // =====================================================

  if (!validar(dados)) {
    return;
  }


  alert('3 - dados principais validados');


  // =====================================================
  // VALIDAR OBSERVAÇÃO DOS N/C
  // =====================================================

  if (!validarItensNC()) {
    return;
  }


  alert('4 - N/C validado');


  // =====================================================
  // SALVAR LOCALMENTE
  // =====================================================

  if (
    window.VistoriaPersist &&
    typeof window.VistoriaPersist
      .saveAll ===
      'function'
  ) {

    window.VistoriaPersist
      .saveAll();
  }


  alert('5 - persistência local concluída');


  // =====================================================
  // ALTERAR BOTÃO
  // =====================================================

  if (botao) {

    botao.disabled = true;

    botao.textContent =
      'Salvando...';
  }


  alert('6 - iniciando comunicação com banco');


  try {

    let vistoria;


    let vistoriaId =
      getVistoriaId();


    alert(
      '7 - vistoria ID: ' +
      (vistoriaId || 'NOVA')
    );


    // ===================================================
    // ATUALIZAR OU CRIAR VISTORIA
    // ===================================================

    if (vistoriaId) {

      alert(
        '8 - atualizando vistoria existente'
      );


      vistoria =
        await atualizarVistoria(
          vistoriaId,
          dados
        );


      alert(
        '9 - vistoria atualizada'
      );


    } else {

      alert(
        '8 - criando nova vistoria'
      );


      vistoria =
        await criarVistoria(
          dados
        );


      alert(
        '9 - vistoria criada'
      );


      vistoriaId =
        vistoria.id;
    }


    // ===================================================
    // SALVAR ITENS + FOTOS
    // ===================================================

    alert(
      '10 - iniciando salvamento dos itens'
    );


    await salvarItens(
      vistoriaId
    );


    alert(
      '11 - itens salvos'
    );


    // ===================================================
    // CONCLUÍDO
    // ===================================================

    alert(
      'Vistoria e itens salvos com sucesso.'
    );


    console.log(
      'Vistoria salva:',
      vistoria
    );


    return vistoria;


  } catch (erro) {

    console.error(
      'Falha ao salvar:',
      erro
    );


    alert(
      'ERRO NO SALVAMENTO:\n\n' +
      (
        erro?.message ||
        String(erro)
      )
    );


    return null;


  } finally {

    if (botao) {

      botao.disabled =
        false;

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
      'Vistoria atual encerrada localmente.'
    );
  }


  // =======================================================
  // API GLOBAL
  // =======================================================

window.VistoriaDB = {

  salvarVistoria,

  salvarItens,

  uploadFoto,

  novaVistoria,

  getVistoriaId,

  setVistoriaId
};

})();
