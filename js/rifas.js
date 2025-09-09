// js/rifas.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores ---
    const formCrearRifa = document.getElementById('form-crear-rifa');
    const listaRifas = document.getElementById('lista-rifas');
    const metodoEspecialSelect = document.getElementById('metodo-especial');
    const cantidadEspecialesContainer = document.getElementById('cantidad-especiales-container');

    // --- Eventos UI ---
    metodoEspecialSelect.addEventListener('change', () => {
        // Muestra el campo de cantidad solo si se elige "Aleatorio"
        cantidadEspecialesContainer.style.display = metodoEspecialSelect.value === 'aleatorio' ? 'block' : 'none';
    });
    
    // Claves para localStorage
    const RIFAS_STORAGE_KEY = 'listaDeRifas';

    // Cargar rifas desde localStorage
    let rifas = JSON.parse(localStorage.getItem(RIFAS_STORAGE_KEY)) || [];

    /**
     * Guarda el array de rifas en localStorage.
     */
    const guardarRifas = () => {
        localStorage.setItem(RIFAS_STORAGE_KEY, JSON.stringify(rifas));
    };

    /**
     * Muestra las rifas en la lista.
     */
    const renderizarRifas = () => {
        listaRifas.innerHTML = '';
        if (rifas.length === 0) {
            listaRifas.innerHTML = '<p>No hay rifas creadas. ¡Crea una nueva para empezar!</p>';
            return;
        }

        const rifasActivas = rifas.filter(r => r.estado !== 'archivada');
        if (rifasActivas.length === 0) {
            listaRifas.innerHTML = '<p>No hay rifas activas. ¡Crea una nueva o revisa el archivo!</p>';
            return;
        }

        rifasActivas.forEach((rifa, index) => {
            // Centralizar el cálculo de estadísticas
            rifa.boletosVendidos = Object.keys(rifa.participantes || {}).length;
            rifa.recaudado = Object.values(rifa.participantes || {}).reduce((total, p) => total + p.monto, 0);
            rifa.ganancia = rifa.recaudado - rifa.costoPremios;
            const progreso = (rifa.boletosVendidos / rifa.totalBoletos) * 100;

            const rifaCard = document.createElement('div');
            rifaCard.className = 'rifa-card';
            rifaCard.dataset.id = rifa.id; // Usamos el ID para identificar la rifa

            let cardHTML = `
                <h3>${rifa.nombre}</h3>
                <div class="premios-lista">
                    <p><strong>1er Premio:</strong> ${rifa.premios?.principal?.[0] || 'No definido'}</p>
                    ${rifa.premios?.principal?.[1] ? `<p><strong>2do Premio:</strong> ${rifa.premios.principal[1]}</p>` : ''}
                    ${rifa.premios?.principal?.[2] ? `<p><strong>3er Premio:</strong> ${rifa.premios.principal[2]}</p>` : ''}
                    ${rifa.premios?.extra ? `<p><strong>Premio Extra:</strong> ${rifa.premios.extra}</p>` : ''}
                </div>
                <p><strong>Fecha Sorteo:</strong> ${new Date(rifa.fechaSorteo).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</p>
                <div class="rifa-finanzas">
                    <span>Inversión: ${formatCurrency(rifa.costoPremios)}</span>
                    <span>Recaudado: ${formatCurrency(rifa.recaudado)}</span>
                    <span class="ganancia ${rifa.ganancia >= 0 ? 'positiva' : 'negativa'}">Ganancia: ${formatCurrency(rifa.ganancia)}</span>
                </div>
                <div class="rifa-stats">
                    <p><strong>Progreso:</strong> ${rifa.boletosVendidos} / ${rifa.totalBoletos}</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progreso.toFixed(2)}%;"></div>
                    </div>
                </div>
                <div class="rifa-card-actions">
                    <button class="btn-ver-rifa">Vender</button>
                    <button class="btn-editar-rifa">Editar</button>
                    <button class="btn-archivar-rifa">Archivar</button>
                </div>
            `;
            rifaCard.innerHTML = cardHTML;

            rifaCard.querySelector('.btn-ver-rifa').addEventListener('click', () => {
                // Guardar el ID de la rifa seleccionada y cambiar de pestaña
                localStorage.setItem('rifaActivaId', rifa.id);
                window.dispatchEvent(new CustomEvent('rifa-seleccionada'));
            });

            rifaCard.querySelector('.btn-editar-rifa').addEventListener('click', () => {
                mostrarModalEdicionRifa(rifa);
            });

            rifaCard.querySelector('.btn-archivar-rifa').addEventListener('click', () => {
                if (confirm(`¿Estás seguro de que quieres archivar la rifa "${rifa.nombre}"? No aparecerá en la lista de ventas.`)) {
                    const rifaIndex = rifas.findIndex(r => r.id === rifa.id);
                    if (rifaIndex > -1) {
                        rifas[rifaIndex].estado = 'archivada';
                    }
                    guardarRifas();
                    renderizarRifas(); // Volver a dibujar las rifas
                    // Notificar a otros scripts que una rifa fue eliminada
                    window.dispatchEvent(new CustomEvent('rifa-eliminada', { detail: { id: rifa.id } }));
                }
            });

            listaRifas.appendChild(rifaCard);
        });
    };

    /**
     * Muestra un modal para editar los detalles de una rifa existente.
     * @param {object} rifa - El objeto de la rifa a editar.
     */
    const mostrarModalEdicionRifa = (rifa) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <h2>Editar Rifa: ${rifa.nombre}</h2>
                <form id="form-editar-rifa">
                    <div class="form-group">
                        <label for="nombre-rifa-editar">Nombre de la Rifa:</label>
                        <input type="text" id="nombre-rifa-editar" value="${rifa.nombre}" required>
                    </div>
                    <div class="form-group">
                        <label>Premios Principales:</label>
                        <input type="text" id="premio-1-editar" value="${rifa.premios.principal[0] || ''}" placeholder="1er Lugar" required>
                        <input type="text" id="premio-2-editar" value="${rifa.premios.principal[1] || ''}" placeholder="2do Lugar (opcional)" style="margin-top: 5px;">
                        <input type="text" id="premio-3-editar" value="${rifa.premios.principal[2] || ''}" placeholder="3er Lugar (opcional)" style="margin-top: 5px;">
                    </div>
                     <div class="form-group">
                        <label for="costo-premios-editar">Costo Total de los Premios:</label>
                        <input type="number" step="0.01" id="costo-premios-editar" value="${rifa.costoPremios}" required>
                    </div>
                    <div class="form-group">
                        <label for="fecha-rifa-editar">Fecha del Sorteo:</label>
                        <input type="date" id="fecha-rifa-editar" value="${rifa.fechaSorteo}" required>
                    </div>
                    <p class="ayuda-texto">Nota: La cantidad de boletos y precios no se pueden editar una vez que la rifa ha comenzado.</p>
                    <div class="form-actions">
                        <button type="submit" class="btn-comprar">Guardar Cambios</button>
                        <button type="button" class="btn-cancelar">Cancelar</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        const cerrarModal = () => document.body.removeChild(modal);

        modal.querySelector('#form-editar-rifa').addEventListener('submit', (e) => {
            e.preventDefault();

            const rifaIndex = rifas.findIndex(r => r.id === rifa.id);
            if (rifaIndex > -1) {
                // Actualizar los datos de la rifa
                rifas[rifaIndex].nombre = document.getElementById('nombre-rifa-editar').value;
                rifas[rifaIndex].premios.principal = [
                    document.getElementById('premio-1-editar').value,
                    document.getElementById('premio-2-editar').value,
                    document.getElementById('premio-3-editar').value
                ].filter(p => p);
                rifas[rifaIndex].costoPremios = parseFloat(document.getElementById('costo-premios-editar').value) || 0;
                rifas[rifaIndex].fechaSorteo = document.getElementById('fecha-rifa-editar').value;

                guardarRifas();
                renderizarRifas();
                
                // Notificar a otros componentes para que se actualicen si es necesario
                window.dispatchEvent(new CustomEvent('rifa-creada')); // Reutilizamos este evento para actualizar dashboard
                window.dispatchEvent(new CustomEvent('rifa-seleccionada')); // Para actualizar la vista de venta si es la activa

                alert('¡Rifa actualizada con éxito!');
            } else {
                alert('Error: No se pudo encontrar la rifa para actualizar.');
            }

            cerrarModal();
        });

        modal.querySelector('.modal-close').addEventListener('click', cerrarModal);
        modal.querySelector('.btn-cancelar').addEventListener('click', cerrarModal);
    };

    /**
     * Maneja el envío del formulario para crear una nueva rifa.
     */
    formCrearRifa.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formCrearRifa);
        const totalBoletos = parseInt(formData.get('cantidad-boletos'), 10);
        const metodoEspecial = formData.get('metodo-especial');
        let numerosEspeciales = [];

        if (metodoEspecial === 'aleatorio') {
            const cantidadEspeciales = parseInt(formData.get('cantidad-especiales'), 10);
            if (cantidadEspeciales > totalBoletos) {
                alert('La cantidad de números especiales no puede ser mayor que la cantidad total de boletos.');
                return;
            }
            // Generar números aleatorios únicos
            const disponibles = Array.from({ length: totalBoletos }, (_, i) => i);
            for (let i = 0; i < cantidadEspeciales; i++) {
                const randomIndex = Math.floor(Math.random() * disponibles.length);
                numerosEspeciales.push(disponibles.splice(randomIndex, 1)[0]);
            }
        } else { // 'repetidos'
            for (let i = 0; i < totalBoletos; i++) {
                const texto = String(i).padStart(2, '0');
                if (texto[0] === texto[1]) numerosEspeciales.push(i);
            }
        }

        const nuevaRifa = {
            id: `rifa-${Date.now()}`, // ID único para cada rifa
            estado: 'activa', // Nuevo campo de estado
            nombre: formData.get('nombre-rifa'),
            premios: {
                principal: [
                    formData.get('premio-1'),
                    formData.get('premio-2'),
                    formData.get('premio-3')
                ].filter(p => p), // Filtra los premios vacíos
                extra: formData.get('premio-extra') || null
            },
            costoPremios: parseFloat(formData.get('costo-premios')) || 0,
            fechaSorteo: formData.get('fecha-rifa'),
            totalBoletos: totalBoletos,
            precioBoleto: parseFloat(formData.get('precio-boleto')),
            precioEspecial: parseFloat(formData.get('precio-especial')),
            numerosEspeciales: numerosEspeciales,
            participantes: {} // Objeto para los participantes de esta rifa
        };

        rifas.push(nuevaRifa);
        guardarRifas();
        renderizarRifas();
        formCrearRifa.reset();
        window.dispatchEvent(new CustomEvent('rifa-creada')); // Notificar al dashboard
        alert('¡Rifa creada con éxito!');
    });

    // Renderizar las rifas al cargar la página
    renderizarRifas();

    // Escuchar evento para re-renderizar cuando se vende un boleto
    window.addEventListener('participante-agregado', () => renderizarRifas());
});