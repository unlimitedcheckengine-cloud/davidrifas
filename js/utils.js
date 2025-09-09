// js/utils.js

/**
 * Obtiene la configuración actual de la aplicación desde localStorage.
 * @returns {object} La configuración guardada o un objeto por defecto.
 */
function getConfig() {
    const config = JSON.parse(localStorage.getItem('appConfig'));
    return config || { moneda: 'DOP' }; // Valor por defecto si no hay config
}

/**
 * Formatea un número como una cadena de moneda según la configuración.
 * @param {number} monto - El número a formatear.
 * @returns {string} El monto formateado como moneda.
 */
function formatCurrency(monto) {
    const config = getConfig();
    const options = {
        style: 'currency',
        currency: config.moneda,
    };
    return new Intl.NumberFormat('es-ES', options).format(monto);
}

/**
 * Formatea un número de teléfono para usarlo con la API de WhatsApp.
 * Añade el código de país por defecto si el número no parece tener uno.
 * @param {string} telefono - El número de teléfono a formatear.
 * @returns {string} El número de teléfono limpio y con código de país.
 */
function formatearTelefonoParaWhatsApp(telefono) {
    const config = getConfig();
    const codigoPaisDefecto = config.codigoPais || '1'; // Usar '1' si no hay nada configurado

    // 1. Limpiar el número de todo excepto dígitos
    let telefonoLimpio = (telefono || '').replace(/\D/g, '');

    // 2. Si el número es corto (ej. 10 dígitos para RD/MX) y no empieza con el código, se lo añadimos.
    // Esta es una heurística simple. Asume que si no empieza con el código, no lo tiene.
    if (telefonoLimpio.length > 7 && !telefonoLimpio.startsWith(codigoPaisDefecto)) {
        telefonoLimpio = codigoPaisDefecto + telefonoLimpio;
    }

    return telefonoLimpio;
}