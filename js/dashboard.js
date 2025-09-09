// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const RIFAS_STORAGE_KEY = 'listaDeRifas';
    let topRifasChartInstance = null;
    let boletosStatusChartInstance = null;

    const renderizarDashboard = () => {
        const rifas = JSON.parse(localStorage.getItem(RIFAS_STORAGE_KEY)) || [];
        const statsContainer = document.getElementById('dashboard-stats');
        const topRifasChartCanvas = document.getElementById('top-rifas-chart');
        const boletosStatusChartCanvas = document.getElementById('boletos-status-chart');

        if (!statsContainer || !topRifasChartCanvas || !boletosStatusChartCanvas) return;

        // Destruir gráficos existentes para evitar duplicados al re-renderizar
        if (topRifasChartInstance) topRifasChartInstance.destroy();
        if (boletosStatusChartInstance) boletosStatusChartInstance.destroy();

        // --- 1. Calcular Estadísticas Globales ---
        let ingresosTotales = 0;
        let boletosVendidosTotales = 0;
        const rifasActivasCount = rifas.filter(r => r.estado !== 'archivada').length;
        
        // Optimización: Reutilizar los cálculos si ya existen, o calcularlos si no.
        const rifasConStats = rifas.map(rifa => {
            // Si las estadísticas no están pre-calculadas, las calculamos aquí.
            // Esto asegura que el dashboard funcione incluso si 'rifas.js' no se ha ejecutado.
            const boletosVendidos = Object.keys(rifa.participantes || {}).length;
            const recaudacion = Object.values(rifa.participantes || {}).reduce((total, p) => total + p.monto, 0);

            ingresosTotales += recaudacion;
            boletosVendidosTotales += boletosVendidos;

            // Devolvemos un objeto limpio solo con lo que necesitamos.
            return { ...rifa, recaudacion, boletosVendidos };
        });

        // --- 2. Renderizar Tarjetas de Estadísticas ---
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h4>Ingresos Totales</h4>
                <p>${formatCurrency(ingresosTotales)}</p>
                <span class="stat-icon">💰</span>
            </div>
            <div class="stat-card">
                <h4>Boletos Vendidos</h4>
                <p>${boletosVendidosTotales}</p>
                <span class="stat-icon">🎟️</span>
            </div>
            <div class="stat-card">
                <h4>Rifas Activas</h4>
                <p>${rifasActivasCount}</p>
                <span class="stat-icon">🏆</span>
            </div>
        `;

        // --- 3. Preparar datos para los gráficos ---
        const topRifas = rifasConStats.sort((a, b) => b.recaudacion - a.recaudacion).slice(0, 5);
        const totalBoletosGlobal = rifas.reduce((total, r) => total + r.totalBoletos, 0);
        const totalBoletosVendidosGlobal = rifas.reduce((total, r) => total + (r.participantes ? Object.keys(r.participantes).length : 0), 0);
        const totalBoletosRestantesGlobal = totalBoletosGlobal - totalBoletosVendidosGlobal;

        // --- 4. Renderizar Gráfico de Barras (Top 5 Rifas) ---
        topRifasChartInstance = new Chart(topRifasChartCanvas, {
            type: 'bar',
            data: {
                labels: topRifas.map(r => r.nombre),
                datasets: [{
                    label: 'Recaudación',
                    data: topRifas.map(r => r.recaudacion),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // --- 5. Renderizar Gráfico de Dona (Estado de Boletos) ---
        boletosStatusChartInstance = new Chart(boletosStatusChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Boletos Vendidos', 'Boletos Restantes'],
                datasets: [{
                    label: 'Estado de Boletos',
                    data: [totalBoletosVendidosGlobal, totalBoletosRestantesGlobal],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.7)', // Verde para vendidos
                        'rgba(231, 76, 60, 0.7)'   // Rojo para restantes
                    ],
                    borderColor: [
                        'rgba(46, 204, 113, 1)',
                        'rgba(231, 76, 60, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });

    };

    // Renderizar el dashboard al cargar
    renderizarDashboard();

    // Volver a renderizar cuando cambien los datos
    window.addEventListener('participante-agregado', renderizarDashboard);
    window.addEventListener('rifa-eliminada', renderizarDashboard);
    window.addEventListener('rifa-creada', renderizarDashboard); // Necesitaremos este evento

    // Escuchar el cambio de pestaña para asegurar que el dashboard esté actualizado
    const dashboardTab = document.querySelector('[data-tab="tab-dashboard"]');
    if (dashboardTab) {
        dashboardTab.addEventListener('click', renderizarDashboard);
    }
});