// js/config.js

document.addEventListener('DOMContentLoaded', () => {
    const formConfig = document.getElementById('form-config');
    const CONFIG_STORAGE_KEY = 'appConfig';

    /**
     * Guarda la configuración en localStorage.
     */
    const guardarConfiguracion = () => {
        const formData = new FormData(formConfig);
        const config = {
            nombreEmpresa: formData.get('nombreEmpresa'),
            idEmpresa: formData.get('idEmpresa'),
            telefonoEmpresa: formData.get('telefonoEmpresa'),
            moneda: formData.get('moneda'),
            codigoPais: formData.get('codigoPais'),
            reglas: formData.get('reglas'),
        };
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        alert('¡Configuración guardada con éxito!');
    };

    /**
     * Carga la configuración desde localStorage y la muestra en el formulario.
     */
    const cargarConfiguracion = () => {
        const configGuardada = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY));

        if (configGuardada) {
            formConfig.nombreEmpresa.value = configGuardada.nombreEmpresa || '';
            formConfig.idEmpresa.value = configGuardada.idEmpresa || '';
            formConfig.telefonoEmpresa.value = configGuardada.telefonoEmpresa || '';
            formConfig.moneda.value = configGuardada.moneda || 'DOP';
            formConfig.codigoPais.value = configGuardada.codigoPais || '1'; // '1' para República Dominicana/USA como default
            formConfig.reglas.value = configGuardada.reglas || '';
        }
    };

    // Asignar evento al formulario
    if (formConfig) {
        formConfig.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarConfiguracion();
        });
    }

    // Cargar la configuración al iniciar
    cargarConfiguracion();
});