// js/venta.js

/**
 * Muestra un modal de venta para un boleto específico.
 * @param {number} numero - El número del boleto a comprar.
 * @param {number} precio - El precio del boleto.
 * @returns {Promise<object|null>} - Una promesa que se resuelve con los datos del comprador o null si se cancela.
 */
function mostrarModalVenta(numeros, montoTotal) {
    // Crear y mostrar el modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const textoBoletos = Array.isArray(numeros) ? `Boletos: ${numeros.map(n => `#${String(n).padStart(2, '0')}`).join(', ')}` : `Boleto #${String(numeros).padStart(2, '0')}`;

    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h2>Confirmar Compra</h2>
            <p>${textoBoletos}</p>
            <p class="modal-precio">Monto Total: <strong>${formatCurrency(montoTotal)}</strong></p>
            <form id="form-venta">
                <div class="form-group">
                    <label for="nombre">Nombre Completo:</label>
                    <input type="text" id="nombre" name="nombre" required>
                </div>
                <div class="form-group">
                    <label for="telefono">Teléfono:</label>
                    <input type="tel" id="telefono" name="telefono" required>
                </div>
                <div class="form-group">
                    <label for="estado-pago">Estado del Pago:</label>
                    <select id="estado-pago" name="estadoPago">
                        <option value="pagado" selected>Pagado</option>
                        <option value="pendiente">Pendiente</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-comprar">Confirmar Compra</button>
                    <button type="button" class="btn-cancelar">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Devolver una promesa para manejar la entrada del usuario de forma asíncrona
    return new Promise((resolve) => {
        const form = modal.querySelector('#form-venta');
        const btnClose = modal.querySelector('.modal-close');
        const btnCancel = modal.querySelector('.btn-cancelar');

        const cerrarModal = () => {
            document.body.removeChild(modal);
            resolve(null); // Resuelve con null si se cierra o cancela
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const datosComprador = {
                nombre: form.nombre.value.trim(),
                telefono: form.telefono.value.trim(),
                estadoPago: form.estadoPago.value
            };
            document.body.removeChild(modal);
            resolve(datosComprador); // Resuelve con los datos del comprador
        });

        btnClose.addEventListener('click', cerrarModal);
        btnCancel.addEventListener('click', cerrarModal);
    });
}

/**
 * Genera y muestra una factura en la pantalla.
 * @param {object} datosFactura - Los datos para la factura.
 */
function mostrarFactura(datosFactura) {
    const { numeros, nombre, telefono, monto, fecha, nombreRifa, fechaSorteo, premios } = datosFactura;
    const config = getConfig(); // Obtener la configuración de la empresa
    const facturaContainer = document.getElementById('factura-container');

    if (!facturaContainer) {
        console.error('Error: El elemento con id "factura-container" no se encontró en el DOM.');
        alert('Se ha producido un error al intentar mostrar la factura. Por favor, revisa la consola.');
        return;
    }

    facturaContainer.innerHTML = `
        <div class="boleto-digital">
            <div class="boleto-header">
                <h3>${config.nombreEmpresa || 'Rifa'}</h3>
                <h2>${nombreRifa}</h2>
            </div>
            <div class="boleto-body">
                <div class="boleto-info">
                    <p><strong>Comprador:</strong> ${nombre}</p>
                    <p><strong>Fecha de Compra:</strong> ${fecha}</p>
                    <p><strong>Fecha del Sorteo:</strong> ${new Date(fechaSorteo).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</p>
                </div>
                <h4>Números Adquiridos</h4>
                <div class="numeros-comprados">
                    ${numeros.map(num => `<span>${String(num).padStart(2, '0')}</span>`).join('')}
                </div>
                <div class="boleto-premios">
                    <h4>Premios</h4>
                    <p><strong>1er Lugar:</strong> ${premios?.principal?.[0] || 'No definido'}</p>
                    ${premios?.principal?.[1] ? `<p><strong>2do Lugar:</strong> ${premios.principal[1]}</p>` : ''}
                    ${premios?.principal?.[2] ? `<p><strong>3er Lugar:</strong> ${premios.principal[2]}</p>` : ''}
                    ${premios?.extra ? `<p><strong>Premio Especial:</strong> ${premios.extra}</p>` : ''}
                </div>
            </div>
            <div class="boleto-footer">
                <div class="total-pagado">
                    <span>Total Pagado</span>
                    <strong>${formatCurrency(monto)}</strong>
                </div>
                ${config.reglas ? `
                    <div class="boleto-reglas">${config.reglas.replace(/\n/g, '<br>')}</div>
                ` : ''}
            </div>
            <div class="boleto-actions">
                <button class="btn-imprimir-factura">Imprimir Recibo</button>
                <button class="btn-descargar-png">Descargar PNG</button>
                <a href="#" id="btn-enviar-whatsapp" class="btn-whatsapp" style="margin-left: 10px;" target="_blank">Enviar por WhatsApp</a>
            </div>
        </div>
    `;
    facturaContainer.style.display = 'block';

    // Añadir lógica al botón de imprimir
    facturaContainer.querySelector('.btn-imprimir-factura').addEventListener('click', () => {
        const contenidoFactura = facturaContainer.querySelector('.boleto-digital').innerHTML;
        const ventanaImpresion = window.open('', '_blank');
        ventanaImpresion.document.write(`
            <html>
                <head>
                    <title>Recibo de Rifa</title>
                    <style>
                        body { font-family: 'Poppins', sans-serif; text-align: center; }
                        .boleto-digital { max-width: 350px; margin: auto; border: 2px dashed #ccc; padding: 15px; }
                        .boleto-actions { display: none; } /* Ocultar botones en la impresión */
                    </style>
                </head>
                <body>${contenidoFactura}</body>
            </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.print();
    });

    // Añadir lógica al botón de descargar PNG
    facturaContainer.querySelector('.btn-descargar-png').addEventListener('click', () => {
        const boletoElement = facturaContainer.querySelector('.boleto-digital');
        const actionsElement = boletoElement.querySelector('.boleto-actions');

        // Ocultar los botones temporalmente para que no salgan en la imagen
        actionsElement.style.display = 'none';

        // Opciones para html2canvas para mejorar la compatibilidad
        const options = {
            scale: 2,
            useCORS: true // Permite cargar imágenes de otros orígenes si las hubiera
        };

        html2canvas(boletoElement, options).then(canvas => {
            const link = document.createElement('a');
            link.download = `boleto-rifa-${nombreRifa}-${nombre}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            // Volver a mostrar los botones después de generar la imagen
            actionsElement.style.display = 'block';
        }).catch((error) => {
            console.error('Error al generar la imagen PNG:', error);
            alert('Hubo un problema al generar la imagen del recibo. Por favor, revisa la consola para más detalles.');
            // Asegurarse de que los botones se muestren de nuevo incluso si hay un error
            actionsElement.style.display = 'block';
        });;
    });

    // Añadir lógica al botón de WhatsApp
    const btnWhatsapp = facturaContainer.querySelector('#btn-enviar-whatsapp');
    const boletosTexto = numeros.map(n => `#${String(n).padStart(2, '0')}`).join(', ');
    const mensaje = `¡Hola ${nombre}! Gracias por tu compra en la rifa "${nombreRifa}".\n\nHas adquirido los boletos: *${boletosTexto}*.\n\n¡Mucha suerte!`;
    const telefonoLimpio = formatearTelefonoParaWhatsApp(telefono);

    btnWhatsapp.href = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;

}