document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos ---
    const tabs = document.querySelectorAll('.tab-link');
    const tabVenta = document.querySelector('[data-tab="tab-venta"]');
    const searchInput = document.getElementById('search-participante');
    const listaParticipantes = document.getElementById('lista-participantes');
    const nombreRifaActiva = document.getElementById('nombre-rifa-activa');
    const premioRifaActiva = document.getElementById('premio-rifa-activa');
    const botonSortear = document.getElementById('boton-sortear');
    const ganadorDisplay = document.getElementById('ganador-display');
    const totalRecaudadoSpan = document.getElementById('total-recaudado');
    const boletosRestantesSpan = document.getElementById('boletos-restantes');
    const btnSeleccionAleatoria = document.getElementById('btn-seleccion-aleatoria');
    const infoRifaActivaContainer = document.getElementById('info-rifa-activa');
    const inputCantidad = document.getElementById('cantidad-a-comprar');
    const selectorRifa = document.getElementById('selector-rifa-activa');
    const boletosGridManual = document.getElementById('boletos-grid-manual');
    const resumenCompraDiv = document.getElementById('resumen-compra');
    const opcionesVentaContainer = document.getElementById('opciones-venta-container');
    
    // --- Estado de la Aplicación ---
    let rifas = [];
    let rifaActiva = null;
    const RIFAS_STORAGE_KEY = 'listaDeRifas';

    // --- Funciones ---

     /**
     * Carga las rifas en el selector desplegable.
     */
    const popularSelectorDeRifas = () => {
        rifas = JSON.parse(localStorage.getItem(RIFAS_STORAGE_KEY)) || [];
        selectorRifa.innerHTML = '<option value="">-- Selecciona una Rifa --</option>';
        const rifasActivas = rifas.filter(r => r.estado !== 'archivada');
        rifasActivas.forEach(rifa => {
            const option = document.createElement('option');
            option.value = rifa.id;
            option.textContent = rifa.nombre;
            selectorRifa.appendChild(option);
        });

        // Si hay una rifa activa guardada, la seleccionamos
        const rifaActivaId = localStorage.getItem('rifaActivaId');
        if (rifaActivaId) {
            selectorRifa.value = rifaActivaId;
        }
    };

     /**
     * Carga los datos de una rifa específica en la pestaña de venta.
     */
    const cargarRifaActiva = () => {
        const rifaActivaId = selectorRifa.value;
        localStorage.setItem('rifaActivaId', rifaActivaId); // Guardar la selección
        rifas = JSON.parse(localStorage.getItem(RIFAS_STORAGE_KEY)) || [];
        rifaActiva = rifas.find(r => r.id === rifaActivaId) || null;

        if (rifaActiva) {
            nombreRifaActiva.textContent = rifaActiva.nombre;
            premioRifaActiva.textContent = rifaActiva.premios?.principal?.[0] || 'N/A';
            actualizarVista();
            renderizarBoletosManuales();
            infoRifaActivaContainer.style.display = 'block'; // Mostrar info
            opcionesVentaContainer.style.display = 'block'; // Mostrar opciones de venta
        } else {
            // Limpiar y ocultar la información de la rifa
            if (nombreRifaActiva) nombreRifaActiva.textContent = "Selecciona una rifa para empezar";
            if (premioRifaActiva) premioRifaActiva.textContent = "N/A";
            if (totalRecaudadoSpan) totalRecaudadoSpan.textContent = '--';
            if (boletosRestantesSpan) boletosRestantesSpan.textContent = '--';
            if (infoRifaActivaContainer) infoRifaActivaContainer.style.display = 'none';
            opcionesVentaContainer.style.display = 'none'; // Ocultar opciones de venta
            boletosGridManual.innerHTML = '<p>No hay una rifa seleccionada.</p>';
            listaParticipantes.innerHTML = '';
        }
        limpiarSeleccionManual();
    };

     /**
     * Verifica si un número de boleto es especial (ej. 11, 22, 33...).
     * @param {number} numero - El número del boleto.
     * @returns {boolean} - True si es especial.
     */
    const esEspecial = (numero) => {
        if (!rifaActiva || !rifaActiva.numerosEspeciales) return false;
        return rifaActiva.numerosEspeciales.includes(numero);
    };

     /**
     * Procesa la compra de boletos seleccionados.
     * @param {number[]} numerosSeleccionados - Array de números de boletos a comprar.
     */
    const procesarCompra = async (numerosSeleccionados) => {
        if (numerosSeleccionados.length === 0) {
            alert("No has seleccionado ningún boleto.");
            return;
        }

        const montoTotal = numerosSeleccionados.reduce((total, num) => {
            return total + (esEspecial(num) ? rifaActiva.precioEspecial : rifaActiva.precioBoleto);
        }, 0);
        
        // Usar el modal de venta para múltiples boletos
        const datosComprador = await mostrarModalVenta(numerosSeleccionados, montoTotal);

        if (datosComprador) {
            const fechaVenta = new Date().toLocaleString('es-ES');
            
            // Por defecto, todas las nuevas compras se marcan como 'pagado'
            numerosSeleccionados.forEach(num => {
                const precioBoleto = esEspecial(num) ? rifaActiva.precioEspecial : rifaActiva.precioBoleto;
                rifaActiva.participantes[num] = {
                    nombre: datosComprador.nombre,
                    telefono: datosComprador.telefono,
                    fecha: fechaVenta,
                    monto: precioBoleto,
                    estadoPago: datosComprador.estadoPago // Usar el estado seleccionado en el modal
                };
            });

            // Generar la factura para la compra
            mostrarFactura({
                numeros: numerosSeleccionados,
                ...datosComprador,
                monto: montoTotal, // Corregido para pasar el monto total
                nombreRifa: rifaActiva.nombre,
                fechaSorteo: rifaActiva.fechaSorteo,
                premios: rifaActiva.premios,
                fecha: fechaVenta
            });

            actualizarVista();
            guardarParticipantes();
            renderizarBoletosManuales(); // Re-renderizar para mostrar los vendidos
            limpiarSeleccionManual();
        }
    };

     /**
     * Maneja la lógica de selección aleatoria de boletos.
     */
    const manejarSeleccionAleatoria = () => {
        if (!rifaActiva) {
            alert("Por favor, selecciona una rifa primero.");
            return;
        }

        const cantidad = parseInt(inputCantidad.value, 10);
        if (isNaN(cantidad) || cantidad < 1) {
            alert("Por favor, ingresa una cantidad válida de boletos.");
            return;
        }

        const boletosDisponibles = [];
        for (let i = 0; i < rifaActiva.totalBoletos; i++) {
            if (!rifaActiva.participantes[i]) {
                boletosDisponibles.push(i);
            }
        }

        if (boletosDisponibles.length < cantidad) {
            alert(`No hay suficientes boletos disponibles. Solo quedan ${boletosDisponibles.length}.`);
            return;
        }

        // Seleccionar 'cantidad' de boletos al azar
        const seleccionados = [];
        for (let i = 0; i < cantidad; i++) {
            const randomIndex = Math.floor(Math.random() * boletosDisponibles.length);
            seleccionados.push(boletosDisponibles.splice(randomIndex, 1)[0]);
        }

        procesarCompra(seleccionados);
    };

     /**
     * Actualiza la lista de participantes y el resumen de la rifa.
     */
    const actualizarVista = () => {
        if (!rifaActiva) return;

        // Calcular y mostrar resumen
        const boletosVendidos = Object.keys(rifaActiva.participantes).length;
        const boletosRestantes = rifaActiva.totalBoletos - boletosVendidos;
        const totalRecaudado = Object.values(rifaActiva.participantes).reduce((total, p) => total + p.monto, 0);
        totalRecaudadoSpan.textContent = formatCurrency(totalRecaudado);
        boletosRestantesSpan.textContent = boletosRestantes;

        // --- Actualizar la lista de participantes (con agrupación) ---
        listaParticipantes.innerHTML = '';
        const filtro = searchInput.value.toLowerCase();

        // 1. Agrupar boletos por participante
        const participantesAgrupados = {};
        Object.entries(rifaActiva.participantes).forEach(([numero, datos]) => {
            const clave = `${datos.nombre.toLowerCase()}-${datos.telefono}`;
            if (!participantesAgrupados[clave]) {
                participantesAgrupados[clave] = {
                    nombre: datos.nombre,
                    telefono: datos.telefono,
                    boletos: [],
                    estados: {} // Para rastrear el estado de cada boleto
                };
            }
            participantesAgrupados[clave].boletos.push(parseInt(numero, 10));
        });

        // 2. Filtrar y renderizar la lista agrupada
        Object.values(participantesAgrupados)
        .filter(p => {
            const nombre = p.nombre.toLowerCase();
            const boletosStr = p.boletos.map(b => String(b).padStart(2, '0'));
            return nombre.includes(filtro) || boletosStr.some(b => b.includes(filtro));
        }).forEach(participante => {
            const li = document.createElement('li');
            
            // Ordenar y formatear los números de boleto
            participante.boletos.sort((a, b) => a - b);
            const boletosFormateados = participante.boletos.map(b => `#${String(b).padStart(2, '0')}`).join(', ');

            // Crear enlace de WhatsApp
            const telefonoLimpio = formatearTelefonoParaWhatsApp(participante.telefono);
            const mensaje = `¡Hola ${participante.nombre}! Te contacto sobre tu participación en la rifa "${rifaActiva.nombre}".`;
            const whatsappLink = esDispositivoMovil()
                ? `whatsapp://send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`
                : `https://web.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`;
            
            li.innerHTML = `
                <div class="participante-info">
                    <span>${boletosFormateados}</span> ${participante.nombre}
                </div>
                <div class="participante-actions">
                    <button class="btn-editar-participante" data-nombre="${participante.nombre}" data-telefono="${participante.telefono}">Editar</button>
                    <a href="${whatsappLink}" class="btn-whatsapp" target="_blank">WhatsApp</a>
                    <button class="btn-recibo-regenerar" data-nombre="${participante.nombre}" data-telefono="${participante.telefono}">Recibo</button>
                    <button class="btn-png-regenerar" data-nombre="${participante.nombre}" data-telefono="${participante.telefono}">PNG</button>
                </div>
            `;
            listaParticipantes.appendChild(li);
        });

        // Añadir eventos a los botones de acciones del participante
        listaParticipantes.querySelectorAll('.btn-recibo-regenerar, .btn-png-regenerar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nombre = e.currentTarget.dataset.nombre;
                const telefono = e.currentTarget.dataset.telefono;
                const esPng = e.currentTarget.classList.contains('btn-png-regenerar');
                regenerarFactura(nombre, telefono, esPng);
            });
        });

        listaParticipantes.querySelectorAll('.btn-editar-participante').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nombreActual = e.currentTarget.dataset.nombre;
                const telefonoActual = e.currentTarget.dataset.telefono;
                mostrarModalEdicion(nombreActual, telefonoActual);
            });
        });

        window.dispatchEvent(new CustomEvent('participante-agregado'));
    };

    const limpiarSeleccionManual = () => {
        resumenCompraDiv.innerHTML = '';
    };

     /**
     * Actualiza el resumen de la compra manual.
     */
    const actualizarResumenManual = () => {
        const seleccionados = boletosGridManual.querySelectorAll('.boleto.seleccionado');
        if (seleccionados.length === 0) {
            limpiarSeleccionManual();
            return;
        }

        let montoTotal = 0;
        const numerosSeleccionados = [];
        seleccionados.forEach(boletoDiv => {
            const numero = parseInt(boletoDiv.dataset.numero, 10);
            numerosSeleccionados.push(numero);
            montoTotal += esEspecial(numero) ? rifaActiva.precioEspecial : rifaActiva.precioBoleto;
        });

        resumenCompraDiv.innerHTML = `
            <p><strong>Boletos seleccionados:</strong> ${seleccionados.length}</p>
            <p><strong>Monto Total:</strong> ${formatCurrency(montoTotal)}</p>
            <div class="resumen-actions">
                <button id="btn-comprar-manual" class="btn-seleccion">Comprar Selección</button>
                <button id="btn-limpiar-manual" class="btn-seleccion btn-limpiar-seleccion">Limpiar</button>
            </div>
        `;

        document.getElementById('btn-comprar-manual').addEventListener('click', () => {
            procesarCompra(numerosSeleccionados);
        });

        document.getElementById('btn-limpiar-manual').addEventListener('click', () => {
            seleccionados.forEach(boleto => {
                boleto.classList.remove('seleccionado');
            });
            actualizarResumenManual();
        });
    };

     /**
     * Maneja el clic en un boleto de la cuadrícula manual.
     */
    const manejarClickBoletoManual = (event) => {
        const boletoDiv = event.currentTarget;
        if (boletoDiv.classList.contains('vendido')) {
            return;
        }
        boletoDiv.classList.toggle('seleccionado');
        actualizarResumenManual();
    };

     /**
     * Renderiza la cuadrícula de boletos para selección manual.
     */
    const renderizarBoletosManuales = (pagina = 0) => {
        if (!rifaActiva) return;
        boletosGridManual.innerHTML = '';
        const boletosPorPagina = 100;
        const totalPaginas = Math.ceil(rifaActiva.totalBoletos / boletosPorPagina);
        const inicio = pagina * boletosPorPagina;
        const fin = Math.min(inicio + boletosPorPagina, rifaActiva.totalBoletos);

        // Contenedor para los boletos de la página actual
        const grid = document.createElement('div');
        grid.className = 'boletos-grid-content';

        for (let i = inicio; i < fin; i++) {
            const boletoDiv = document.createElement('div');
            boletoDiv.classList.add('boleto');
            // Ajustar el padding dinámicamente según el número de dígitos
            const numDigitos = String(rifaActiva.totalBoletos - 1).length;
            boletoDiv.textContent = i.toString().padStart(numDigitos, '0');
            boletoDiv.dataset.numero = i;

            if (rifaActiva.participantes[i]) {
                boletoDiv.classList.add('vendido');
                boletoDiv.title = `Vendido a: ${rifaActiva.participantes[i].nombre}`;
            } else {
                // Re-aplicar la clase 'seleccionado' si el boleto ya estaba elegido
                if (document.querySelector(`.boleto[data-numero="${i}"].seleccionado`)) {
                    boletoDiv.classList.add('seleccionado');
                }
                boletoDiv.addEventListener('click', manejarClickBoletoManual);
            }

            if (esEspecial(i)) {
                boletoDiv.classList.add('especial');
            }
            grid.appendChild(boletoDiv);
        }
        boletosGridManual.appendChild(grid);

        // Renderizar controles de paginación si hay más de una página
        if (totalPaginas > 1) {
            renderizarPaginacion(pagina, totalPaginas);
        }

        actualizarResumenManual(); // Asegura que el resumen se mantenga al cambiar de página
    };

    /**
     * Regenera la factura para un participante específico.
     * @param {string} nombre - Nombre del participante.
     * @param {string} telefono - Teléfono del participante.
     * @param {boolean} descargarPng - Si es true, descarga como PNG en lugar de mostrar.
     */
    const regenerarFactura = (nombre, telefono, descargarPng = false) => {
        if (!rifaActiva) return;

        const boletosParticipante = [];
        let montoTotal = 0;
        let fechaVenta = '';

        Object.entries(rifaActiva.participantes).forEach(([numero, datos]) => {
            if (datos.nombre === nombre && datos.telefono === telefono) {
                const num = parseInt(numero, 10);
                boletosParticipante.push(num);
                montoTotal += datos.monto;
                if (!fechaVenta) fechaVenta = datos.fecha; // Tomar la fecha de la primera venta encontrada
            }
        });

        if (boletosParticipante.length > 0) {
            const datosFactura = {
                numeros: boletosParticipante.sort((a, b) => a - b),
                nombre,
                telefono,
                monto: montoTotal,
                nombreRifa: rifaActiva.nombre,
                fechaSorteo: rifaActiva.fechaSorteo,
                premios: rifaActiva.premios,
                fecha: fechaVenta
            };

            mostrarFactura(datosFactura); // Siempre se muestra la factura en el contenedor
            if (descargarPng) {
                document.querySelector('#factura-container .btn-descargar-png').click();
            }
        }
    };

    /**
     * Renderiza los controles de paginación para la selección manual.
     * @param {number} paginaActual - La página activa.
     * @param {number} totalPaginas - El número total de páginas.
     */
    const renderizarPaginacion = (paginaActual, totalPaginas) => {
        const paginacionContainer = document.createElement('div');
        paginacionContainer.className = 'paginacion-container';

        for (let i = 0; i < totalPaginas; i++) {
            const btnPagina = document.createElement('button');
            btnPagina.className = 'btn-pagina';
            const inicio = i * 100;
            const fin = Math.min(inicio + 99, rifaActiva.totalBoletos - 1);
            btnPagina.textContent = `${inicio}-${fin}`;
            if (i === paginaActual) {
                btnPagina.classList.add('active');
            }
            btnPagina.addEventListener('click', () => {
                renderizarBoletosManuales(i);
            });
            paginacionContainer.appendChild(btnPagina);
        }
        boletosGridManual.appendChild(paginacionContainer);
    };

    /**
     * Detecta si el usuario está en un dispositivo móvil.
     * @returns {boolean}
     */
    const esDispositivoMovil = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

     /**
     * Guarda el objeto de participantes en localStorage.
     */
    const guardarParticipantes = () => {
        if (!rifaActiva) return;
        // Encontrar el índice de la rifa activa y actualizarla en el array principal
        const rifaIndex = rifas.findIndex(r => r.id === rifaActiva.id);
        if (rifaIndex !== -1) {
            rifas[rifaIndex] = rifaActiva;
        }
        localStorage.setItem(RIFAS_STORAGE_KEY, JSON.stringify(rifas));
        window.dispatchEvent(new CustomEvent('participante-agregado'));
    };

    /**
     * Muestra un modal para editar los datos de un participante.
     * @param {string} nombreActual 
     * @param {string} telefonoActual 
     */
    const mostrarModalEdicion = async (nombreActual, telefonoActual) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h2>Editar Participante</h2>
                <form id="form-edicion">
                    <div class="form-group">
                        <label for="nombre-editar">Nombre Completo:</label>
                        <input type="text" id="nombre-editar" name="nombre" value="${nombreActual}" required>
                    </div>
                    <div class="form-group">
                        <label for="telefono-editar">Teléfono:</label>
                        <input type="tel" id="telefono-editar" name="telefono" value="${telefonoActual}" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-comprar">Guardar Cambios</button>
                        <button type="button" class="btn-cancelar">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const cerrarModal = () => document.body.removeChild(modal);

        modal.querySelector('#form-edicion').addEventListener('submit', (e) => {
            e.preventDefault();
            const nuevoNombre = modal.querySelector('#nombre-editar').value.trim();
            const nuevoTelefono = modal.querySelector('#telefono-editar').value.trim();

            if (rifaActiva) {
                // Actualizar todos los boletos asociados a este participante
                Object.entries(rifaActiva.participantes).forEach(([numero, datos]) => {
                    if (datos.nombre === nombreActual && datos.telefono === telefonoActual) {
                        rifaActiva.participantes[numero].nombre = nuevoNombre;
                        rifaActiva.participantes[numero].telefono = nuevoTelefono;
                    }
                });
                guardarParticipantes();
                actualizarVista();
                alert('¡Datos del participante actualizados!');
            }
            cerrarModal();
        });

        modal.querySelector('.modal-close').addEventListener('click', cerrarModal);
        modal.querySelector('.btn-cancelar').addEventListener('click', cerrarModal);
    };





     /**
     * Realiza el sorteo para la rifa activa y muestra al ganador.
     */
    const realizarSorteo = () => {
        if (!rifaActiva) {
            alert("No hay una rifa activa seleccionada.");
            return;
        }

        // --- Validación de Rentabilidad ---
        const totalRecaudado = Object.values(rifaActiva.participantes).reduce((total, p) => total + p.monto, 0);
        const costoPremios = rifaActiva.costoPremios || 0;
        const umbralGanancia = costoPremios * 1.20; // Costo de premios + 20% de ganancia

        if (totalRecaudado < umbralGanancia) {
            const faltante = umbralGanancia - totalRecaudado;
            alert(
                `¡Aún no se puede realizar el sorteo!\n\n` +
                `El objetivo de recaudación (${formatCurrency(umbralGanancia)}) no se ha cumplido. ` +
                `Faltan ${formatCurrency(faltante)} para alcanzarlo.\n\n` +
                `Se recomienda extender la fecha de la rifa para vender más boletos.`
            );
            return;
        }

        const boletosDisponibles = Object.keys(rifaActiva.participantes);
        const premiosPrincipales = rifaActiva.premios.principal.filter(p => p); // Filtra premios vacíos
        const numeroDePremios = premiosPrincipales.length;

        if (boletosDisponibles.length === 0) {
            alert("No hay participantes en esta rifa. ¡Vende algunos boletos primero!");
            return;
        }

        if (boletosDisponibles.length < numeroDePremios) {
            alert(`No hay suficientes participantes (${boletosDisponibles.length}) para sortear los ${numeroDePremios} premios.`);
            return;
        }

        // Realizar el sorteo para cada premio
        const ganadores = [];
        for (let i = 0; i < numeroDePremios; i++) {
            // Seleccionar un ganador de los boletos aún disponibles
            const indiceGanador = Math.floor(Math.random() * boletosDisponibles.length);
            const numeroGanador = boletosDisponibles.splice(indiceGanador, 1)[0]; // Quitar el boleto para que no gane de nuevo
            const datosGanador = rifaActiva.participantes[numeroGanador];

            ganadores.push({
                lugar: i + 1,
                premio: premiosPrincipales[i],
                nombre: datosGanador.nombre,
                numero: numeroGanador
            });
        }

        // Mostrar el resultado
        let resultadoHTML = `<p>🎉 ¡Resultados del sorteo para la rifa "${rifaActiva.nombre}"! 🎉</p>`;
        ganadores.forEach(g => {
            resultadoHTML += `
                <div class="ganador-item">
                    <strong>${g.lugar}er Lugar (${g.premio}):</strong> ${g.nombre} con el boleto <strong>#${String(g.numero).padStart(2, '0')}</strong>
                </div>
            `;
        });

        ganadorDisplay.innerHTML = `
            ${resultadoHTML}
        `;
        ganadorDisplay.style.display = 'block';

        alert(`¡Sorteo realizado! Revisa los resultados en pantalla.`);

        // ¡Lanzar el confeti!
        confetti({
            particleCount: 150,
            spread: 180,
            origin: { y: 0.6 }
        });
    };

    /**
     * Inicializa la lógica para un conjunto de sub-pestañas.
     * @param {string} containerSelector - El selector del contenedor principal de las sub-pestañas.
     */
    const inicializarSubPestanas = (containerSelector) => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const subTabs = container.querySelectorAll('.sub-tab-link');
        subTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.sub-tab-link').forEach(item => item.classList.remove('active'));
                container.querySelectorAll('.sub-tab-content').forEach(content => content.classList.remove('active'));
                tab.classList.add('active');
                container.querySelector(`#${tab.dataset.subtab}`).classList.add('active');
            });
        });
    };

    // --- Eventos Globales ---
    // 1. Lógica para manejar el cambio de pestañas
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // 2. Lógica para cuando se selecciona una rifa desde la pestaña de gestión
    window.addEventListener('rifa-seleccionada', () => {
        tabVenta.click(); // Simula un clic para cambiar a la pestaña de venta
        popularSelectorDeRifas();
        cargarRifaActiva();
    });

    // Actualizar datos si el usuario vuelve a la pestaña,
    // para reflejar cambios hechos en otras pestañas.
    window.addEventListener('focus', () => {
        popularSelectorDeRifas();
    });

    // --- Evento para limpiar la vista si la rifa activa es eliminada ---
    window.addEventListener('rifa-eliminada', (e) => {
        const idEliminada = e.detail.id;
        popularSelectorDeRifas(); // Actualizar el selector
        if (rifaActiva && rifaActiva.id === idEliminada) {
            localStorage.removeItem('rifaActivaId');
            selectorRifa.value = "";
            cargarRifaActiva(); // Esto limpiará la vista
        }
    });

    // Evento para el campo de búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', actualizarVista);
    }

    // Asignar evento al botón de selección aleatoria
    if (btnSeleccionAleatoria) {
        btnSeleccionAleatoria.addEventListener('click', manejarSeleccionAleatoria);
    }

    // Asignar evento al selector de rifas
    selectorRifa.addEventListener('change', cargarRifaActiva);

    // --- Inicialización ---
    popularSelectorDeRifas();
    cargarRifaActiva();

    // Asignar evento al botón de sortear
    if (botonSortear) {
        botonSortear.addEventListener('click', realizarSorteo);
    }

    inicializarSubPestanas('#tab-gestion');
    inicializarSubPestanas('#tab-venta');
});