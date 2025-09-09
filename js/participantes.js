// js/participantes.js

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-global-participante');
    const tablaCuerpo = document.getElementById('cuerpo-tabla-participantes');
    const RIFAS_STORAGE_KEY = 'listaDeRifas';

    const renderizarTablaParticipantes = () => {
        if (!tablaCuerpo) return;

        const rifas = JSON.parse(localStorage.getItem(RIFAS_STORAGE_KEY)) || [];
        const filtro = searchInput.value.toLowerCase();
        const participantesAgrupados = {};

        // 1. Recopilar y agrupar participantes por rifa y por nombre/teléfono
        rifas.forEach(rifa => {
            Object.entries(rifa.participantes).forEach(([numero, datos]) => {
                // Crear una clave única para cada participante dentro de una rifa
                const clave = `${rifa.id}-${datos.nombre.toLowerCase()}-${datos.telefono}`;

                if (!participantesAgrupados[clave]) {
                    participantesAgrupados[clave] = {
                        rifaId: rifa.id, // Guardar el ID de la rifa para la regeneración
                        nombreRifa: rifa.nombre,
                        nombre: datos.nombre,
                        telefono: datos.telefono,
                        boletos: [],
                        montoTotal: 0,
                        estados: {} // Para rastrear estados
                    };
                }

                participantesAgrupados[clave].boletos.push(parseInt(numero, 10));
                participantesAgrupados[clave].estados[numero] = datos.estadoPago || 'pagado';
                participantesAgrupados[clave].montoTotal += datos.monto;
            });
        });

        // 2. Convertir el objeto a un array y filtrar
        const listaParticipantes = Object.values(participantesAgrupados);
        const participantesFiltrados = listaParticipantes.filter(p => {
            return (
                p.nombreRifa.toLowerCase().includes(filtro) ||
                p.nombre.toLowerCase().includes(filtro) ||
                p.telefono.includes(filtro) ||
                p.boletos.some(b => String(b).padStart(2, '0').includes(filtro))
            );
        });

        // 3. Renderizar
        tablaCuerpo.innerHTML = '';
        if (participantesFiltrados.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5">No se encontraron participantes.</td></tr>`;
            return;
        }

        participantesFiltrados.forEach(p => {
            // Ordenar los boletos numéricamente
            p.boletos.sort((a, b) => a - b);
            const fila = document.createElement('tr');
            const telefonoLimpio = formatearTelefonoParaWhatsApp(p.telefono);
            const mensaje = `¡Hola ${p.nombre}! Te contacto sobre tu participación en la rifa "${p.nombreRifa}".`;
            const whatsappLink = esDispositivoMovil()
                ? `whatsapp://send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`
                : `https://web.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`;
            
            const boletosStr = p.boletos.map(b => {
                const estado = p.estados[b] || 'pagado';
                return `<span class="boleto-tag estado-${estado}">#${String(b).padStart(2, '0')}</span>`;
            }).join(' ');
            fila.innerHTML = `
                <td>${p.nombreRifa}</td>
                <td>${p.nombre}</td>
                <td>
                    ${p.telefono}
                    <div class="participant-actions-table">
                        <a href="${whatsappLink}" class="btn-whatsapp" target="_blank">WhatsApp</a>
                        <button class="btn-recibo-regenerar-global" data-rifa-id="${p.rifaId}" data-nombre="${p.nombre}" data-telefono="${p.telefono}">Recibo</button>
                        <button class="btn-png-regenerar-global" data-rifa-id="${p.rifaId}" data-nombre="${p.nombre}" data-telefono="${p.telefono}">PNG</button>
                    </div>
                </td>
                <td class="boletos-col">${boletosStr}</td>
                <td class="monto-col">${formatCurrency(p.montoTotal)}</td>
            `;
            tablaCuerpo.appendChild(fila);
        });

        // Añadir eventos a los nuevos botones en la tabla global
        tablaCuerpo.querySelectorAll('.btn-recibo-regenerar-global, .btn-png-regenerar-global').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rifaId = e.currentTarget.dataset.rifaId;
                const nombre = e.currentTarget.dataset.nombre;
                const telefono = e.currentTarget.dataset.telefono;
                const esPng = e.currentTarget.classList.contains('btn-png-regenerar-global');

                const rifa = rifas.find(r => r.id === rifaId);
                if (rifa) {
                    const boletosParticipante = Object.keys(rifa.participantes)
                        .filter(num => rifa.participantes[num].nombre === nombre && rifa.participantes[num].telefono === telefono)
                        .map(num => parseInt(num, 10));
                    
                    const montoTotal = boletosParticipante.reduce((total, num) => total + rifa.participantes[num].monto, 0);
                    const fechaVenta = rifa.participantes[boletosParticipante[0]]?.fecha || new Date().toLocaleString('es-ES');

                    // Cambiar a la pestaña de venta para mostrar la factura
                    document.querySelector('[data-tab="tab-venta"]').click();
                    // Seleccionar la rifa correcta
                    const selectorRifa = document.getElementById('selector-rifa-activa');
                    if (selectorRifa) selectorRifa.value = rifaId;
                    // Disparar el evento para cargar la rifa y luego mostrar la factura
                    window.dispatchEvent(new CustomEvent('regenerar-factura-global', { detail: { rifa, nombre, telefono, esPng, boletos: boletosParticipante, monto: montoTotal, fecha: fechaVenta } }));
                }
            });
        });
    };

    /**
     * Detecta si el usuario está en un dispositivo móvil.
     * @returns {boolean}
     */
    const esDispositivoMovil = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Eventos
    searchInput.addEventListener('input', renderizarTablaParticipantes);

    // Escuchar eventos globales para saber cuándo actualizar la tabla
    window.addEventListener('participante-agregado', renderizarTablaParticipantes);
    window.addEventListener('rifa-eliminada', renderizarTablaParticipantes);

    // Carga inicial
    renderizarTablaParticipantes();

    // Escuchar evento para regenerar factura desde la tabla global
    window.addEventListener('regenerar-factura-global', (e) => {
        const { rifa, nombre, telefono, esPng, boletos, monto, fecha } = e.detail;
        const datosFactura = {
            numeros: boletos.sort((a, b) => a - b),
            nombre,
            telefono,
            monto,
            nombreRifa: rifa.nombre,
            fechaSorteo: rifa.fechaSorteo,
            premios: rifa.premios,
            fecha
        };
        mostrarFactura(datosFactura);
        if (esPng) {
            document.querySelector('#factura-container .btn-descargar-png').click();
        }
    });
});