// =========================================================
// photo.js
// Captura de fotos dos itens do checklist
// =========================================================

(function () {

  const fotosPendentes = new Map();

  // -------------------------------------------------------
  // Criar input de câmera
  // -------------------------------------------------------

  function abrirCamera(row, checkbox) {

    const input = document.createElement('input');

    input.type = 'file';
    input.accept = 'image/*';

    // No celular tenta abrir câmera traseira
    input.capture = 'environment';

    input.style.display = 'none';

    document.body.appendChild(input);


    input.addEventListener('change', () => {

      const arquivo =
        input.files &&
        input.files[0];


      if (!arquivo) {

        checkbox.checked = false;

        input.remove();

        return;
      }


      registrarFoto(
        row,
        arquivo
      );


      input.remove();
    });


    input.click();
  }


  // -------------------------------------------------------
  // Identificação única do item
  // -------------------------------------------------------

  function getChaveItem(row) {

    const setor =
      row.dataset.setor || '';

    const item =
      row.dataset.item || '';

    return setor + '||' + item;
  }


  // -------------------------------------------------------
  // Registrar foto temporariamente
  // -------------------------------------------------------

  function registrarFoto(
    row,
    arquivo
  ) {

    const chave =
      getChaveItem(row);


    fotosPendentes.set(
      chave,
      arquivo
    );


    row.dataset.temFoto =
      'true';


    mostrarIndicadorFoto(
      row
    );


    console.log(
      'Foto selecionada:',
      chave,
      arquivo.name,
      arquivo.size
    );
  }


  // -------------------------------------------------------
  // Indicador visual
  // -------------------------------------------------------

  function mostrarIndicadorFoto(
    row
  ) {

    let indicador =
      row.querySelector(
        '.foto-indicador'
      );


    if (!indicador) {

      indicador =
        document.createElement(
          'div'
        );


      indicador.className =
        'foto-indicador';


      const obs =
        row.querySelector(
          '.obs'
        );


      if (obs) {

        obs.insertAdjacentElement(
          'afterend',
          indicador
        );

      } else {

        row.appendChild(
          indicador
        );
      }
    }


    indicador.textContent =
      '📷 Foto selecionada';
  }


  // -------------------------------------------------------
  // Remover foto
  // -------------------------------------------------------

  function removerFoto(row) {

    const chave =
      getChaveItem(row);


    fotosPendentes.delete(
      chave
    );


    delete row.dataset.temFoto;


    const indicador =
      row.querySelector(
        '.foto-indicador'
      );


    if (indicador) {
      indicador.remove();
    }
  }


  // -------------------------------------------------------
  // Clique no checkbox "Arquivar foto"
  // -------------------------------------------------------

  document.addEventListener(
    'change',
    function (event) {

      const checkbox =
        event.target;


      if (
        !checkbox ||
        checkbox.type !==
          'checkbox'
      ) {
        return;
      }


      const row =
        checkbox.closest(
          '.item-row'
        );


      if (!row) {
        return;
      }


      if (checkbox.checked) {

        abrirCamera(
          row,
          checkbox
        );

      } else {

        removerFoto(
          row
        );
      }
    }
  );


  // -------------------------------------------------------
  // API GLOBAL
  // -------------------------------------------------------

  window.VistoriaFotos = {

    getFoto(row) {

      return fotosPendentes.get(
        getChaveItem(row)
      ) || null;
    },


    getFotoPorDados(
      setor,
      item
    ) {

      return fotosPendentes.get(
        setor + '||' + item
      ) || null;
    },


    getQuantidade() {

      return fotosPendentes.size;
    },


    getTodas() {

      return Array.from(
        fotosPendentes.entries()
      );
    },


    removerFoto,

    limpar() {

      fotosPendentes.clear();

      document
        .querySelectorAll(
          '.foto-indicador'
        )
        .forEach(
          el => el.remove()
        );
    }
  };

})();
