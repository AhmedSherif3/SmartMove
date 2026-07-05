/* ============================================================
   SmartMove Egypt Real Estate Dashboard — Application Logic
   ============================================================ */

(() => {
  'use strict';

  // Inject parent CSS variables into this document's root to avoid variables override
  try {
    if (window.parent && window.parent.document) {
      const parentStyle = window.parent.getComputedStyle(window.parent.document.documentElement);
      const rootStyle = document.documentElement.style;
      
      const surfacePage = parentStyle.getPropertyValue('--ui-surface-page').trim();
      const surfaceCard = parentStyle.getPropertyValue('--ui-surface-card').trim();
      const textPrimary = parentStyle.getPropertyValue('--ui-content-strong').trim();
      const textSecondary = parentStyle.getPropertyValue('--ui-content-primary').trim();
      const borderSubtle = parentStyle.getPropertyValue('--ui-border-subtle').trim();

      const egyptOverview = parentStyle.getPropertyValue('--dashboard-egypt-color3').trim();
      const egyptInvestment = parentStyle.getPropertyValue('--dashboard-egypt-color5').trim();
      const egyptRisk = parentStyle.getPropertyValue('--dashboard-egypt-color7').trim();
      const egyptTrends = parentStyle.getPropertyValue('--dashboard-egypt-color1').trim();

      if (egyptOverview) {
        rootStyle.setProperty('--kpi-bg-overview', egyptOverview);
        rootStyle.setProperty('--chart-accent-overview', egyptOverview);
      }
      if (egyptInvestment) {
        rootStyle.setProperty('--kpi-bg-investment', egyptInvestment);
        rootStyle.setProperty('--chart-accent-investment', egyptInvestment);
      }
      if (egyptRisk) {
        rootStyle.setProperty('--kpi-bg-risk', egyptRisk);
        rootStyle.setProperty('--chart-accent-risk', egyptRisk);
      }
      if (egyptTrends) {
        rootStyle.setProperty('--kpi-bg-trends', egyptTrends);
        rootStyle.setProperty('--chart-accent-trends', egyptTrends);
      }

      if (surfacePage) rootStyle.setProperty('--bg-primary', surfacePage);
      if (surfaceCard) {
        rootStyle.setProperty('--bg-secondary', surfaceCard);
        rootStyle.setProperty('--bg-card', surfaceCard);
        rootStyle.setProperty('--glass-bg', surfaceCard);
      }
      if (textPrimary) rootStyle.setProperty('--text-primary', textPrimary);
      if (textSecondary) rootStyle.setProperty('--text-secondary', textSecondary);
      if (borderSubtle) rootStyle.setProperty('--glass-border', borderSubtle);
    }
  } catch (e) {}

  // ---- Chart.js Global Defaults ----
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.92)';
  Chart.defaults.plugins.tooltip.titleColor = '#f1f5f9';
  Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(148, 163, 184, 0.15)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxPadding = 4;
  Chart.defaults.animation = { duration: 800, easing: 'easeOutQuart' };

  // ---- Dynamic Color Palettes from CSS Variables ----
  function getThemeColor(varName, fallback) {
    try {
      if (window.parent && window.parent.document) {
        const val = window.parent.getComputedStyle(window.parent.document.documentElement).getPropertyValue(varName).trim();
        if (val) return val;
      }
    } catch (e) {}
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (val) return val;
    } catch (e) {}
    return fallback;
  }

  function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  const COLORS = [
    getThemeColor('--dashboard-egypt-color1', '#6366f1'),
    getThemeColor('--dashboard-egypt-color2', '#8b5cf6'),
    getThemeColor('--dashboard-egypt-color3', '#ec4899'),
    getThemeColor('--dashboard-egypt-color4', '#14b8a6'),
    getThemeColor('--dashboard-egypt-color5', '#f59e0b'),
    getThemeColor('--dashboard-egypt-color6', '#0ea5e9'),
    getThemeColor('--dashboard-egypt-color7', '#f43f5e'),
    getThemeColor('--dashboard-egypt-color8', '#10b981'),
    getThemeColor('--dashboard-egypt-color9', '#f97316'),
    getThemeColor('--dashboard-egypt-color10', '#a78bfa')
  ];

  const COLORS_ALPHA = (alpha) => COLORS.map(c => {
    const rgb = hexToRgb(c);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  });

  // ---- Formatting Helpers ----
  function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  function fmtEGP(n) {
    if (n >= 1e12) return 'EGP ' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return 'EGP ' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return 'EGP ' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return 'EGP ' + (n / 1e3).toFixed(1) + 'K';
    return 'EGP ' + n.toLocaleString();
  }

  function fmtPct(n) {
    const sign = n >= 0 ? '+' : '';
    return sign + n.toFixed(1) + '%';
  }

  // ---- KPI Counter Animation ----
  function animateValue(el, target, prefix = '', suffix = '', duration = 1200) {
    const start = 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      if (typeof target === 'number' && target >= 1000) {
        el.textContent = prefix + fmtNum(Math.round(current)) + suffix;
      } else if (typeof target === 'number') {
        el.textContent = prefix + current.toFixed(1) + suffix;
      }

      if (progress < 1) requestAnimationFrame(update);
      else {
        // Final exact value
        if (typeof target === 'number' && target >= 1000) {
          el.textContent = prefix + fmtNum(target) + suffix;
        } else if (typeof target === 'number') {
          el.textContent = prefix + target.toFixed(1) + suffix;
        }
      }
    }
    requestAnimationFrame(update);
  }

  // ---- Gradient Helper for Chart.js ----
  function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  // ---- Navigation ----
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page-section');
  const mapsInitialized = {};

  function switchPage(pageId) {
    navItems.forEach(n => n.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));

    const navEl = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    const pageEl = document.getElementById('page-' + pageId);

    if (navEl) navEl.classList.add('active');
    if (pageEl) {
      pageEl.classList.add('active');
      // Re-trigger animation
      pageEl.style.animation = 'none';
      pageEl.offsetHeight; // reflow
      pageEl.style.animation = '';
    }

    // Initialize maps lazily
    if (!mapsInitialized[pageId]) {
      setTimeout(() => initMapForPage(pageId), 100);
    } else {
      // Invalidate size for already-created maps
      const mapObj = mapsInitialized[pageId];
      if (mapObj && mapObj.invalidateSize) {
        setTimeout(() => mapObj.invalidateSize(), 100);
      }
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
    });
  });

  // ---- Chart Instance Store (to avoid duplicate creation) ----
  const chartInstances = {};

  // ---- MAP INITIALIZATION ----
  function createBaseMap(containerId) {
    const map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([27.5, 30.8], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap · CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    return map;
  }

  function getRiskColor(score) {
    if (score < 20) return '#10b981';
    if (score < 40) return '#f59e0b';
    if (score < 60) return '#f97316';
    return '#f43f5e';
  }

  function getGrowthColor(growth) {
    if (growth > 20) return '#10b981';
    if (growth > 0) return '#6366f1';
    if (growth > -20) return '#f59e0b';
    return '#f43f5e';
  }

  function getPriceColor(price, maxPrice) {
    const ratio = Math.min(price / maxPrice, 1);
    if (ratio > 0.7) return '#f43f5e';
    if (ratio > 0.4) return '#f59e0b';
    if (ratio > 0.2) return '#6366f1';
    return '#14b8a6';
  }

  let dashboardData = null;

  function initMapForPage(pageId) {
    if (!dashboardData) return;
    if (mapsInitialized[pageId]) return;

    try {
      if (pageId === 'overview') {
        const map = createBaseMap('map-overview');
        const data = dashboardData.overview.map_data;
        const maxCount = Math.max(...data.map(d => d.count));

        data.forEach(d => {
          const radius = Math.max(6, Math.min(30, (d.count / maxCount) * 30));
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: '#6366f1',
            fillOpacity: 0.55,
            color: '#818cf8',
            weight: 1.5,
          }).addTo(map).bindPopup(`
            <strong>${d.name}</strong>
            <div class="popup-metric"><span class="label">Transactions</span><span class="value">${d.count.toLocaleString()}</span></div>
            <div class="popup-metric"><span class="label">Avg Price/sqm</span><span class="value">${fmtEGP(d.avg_price_sqm)}</span></div>
          `);
        });
        mapsInitialized[pageId] = map;

      } else if (pageId === 'investment') {
        const map = createBaseMap('map-investment');
        const data = dashboardData.investment.map_data;
        const maxPrice = Math.max(...data.map(d => d.avg_price_sqm));

        data.forEach(d => {
          const radius = Math.max(6, Math.min(25, (d.count / Math.max(...data.map(x => x.count))) * 25));
          const color = getPriceColor(d.avg_price_sqm, maxPrice);
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: color,
            fillOpacity: 0.6,
            color: color,
            weight: 1.5,
          }).addTo(map).bindPopup(`
            <strong>${d.name}</strong>
            <div class="popup-metric"><span class="label">Avg Price/sqm</span><span class="value">${fmtEGP(d.avg_price_sqm)}</span></div>
            <div class="popup-metric"><span class="label">Transactions</span><span class="value">${d.count.toLocaleString()}</span></div>
          `);
        });
        mapsInitialized[pageId] = map;

      } else if (pageId === 'risk') {
        const map = createBaseMap('map-risk');
        const data = dashboardData.risk.map_data;

        data.forEach(d => {
          const radius = Math.max(6, Math.min(25, (d.count / Math.max(...data.map(x => x.count))) * 25));
          const color = getRiskColor(d.risk_score);
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: color,
            fillOpacity: 0.6,
            color: color,
            weight: 1.5,
          }).addTo(map).bindPopup(`
            <strong>${d.name}</strong>
            <div class="popup-metric"><span class="label">Risk Score</span><span class="value">${d.risk_score}</span></div>
            <div class="popup-metric"><span class="label">Volatility</span><span class="value">${d.volatility}%</span></div>
            <div class="popup-metric"><span class="label">Unregistered</span><span class="value">${d.unreg_pct}%</span></div>
          `);
        });
        mapsInitialized[pageId] = map;

      } else if (pageId === 'trends') {
        const map = createBaseMap('map-trends');
        const data = dashboardData.trends.map_data;
        const maxCount = Math.max(...data.map(d => d.count));

        data.forEach(d => {
          const radius = Math.max(6, Math.min(28, (d.count / maxCount) * 28));
          const color = getGrowthColor(d.yoy_growth);
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: color,
            fillOpacity: 0.55,
            color: color,
            weight: 1.5,
          }).addTo(map).bindPopup(`
            <strong>${d.name}</strong>
            <div class="popup-metric"><span class="label">YoY Growth</span><span class="value">${fmtPct(d.yoy_growth)}</span></div>
            <div class="popup-metric"><span class="label">Volume</span><span class="value">${d.count.toLocaleString()}</span></div>
          `);
        });
        mapsInitialized[pageId] = map;
      }
    } catch (e) {
      console.error('Map init error for', pageId, e);
    }
  }

  // ---- CHART BUILDERS ----

  function buildOverviewCharts(data) {
    const ov = data.overview;

    // KPIs
    animateValue(document.getElementById('kpi-ov-total'), ov.kpis.total_transactions);
    animateValue(document.getElementById('kpi-ov-value'), ov.kpis.total_market_value, 'EGP ');
    animateValue(document.getElementById('kpi-ov-ppsqm'), ov.kpis.avg_price_per_sqm, 'EGP ');
    animateValue(document.getElementById('kpi-ov-size'), ov.kpis.avg_property_size, '', ' sqm');

    // 1. Transaction Volume Over Time (Area Chart)
    const ctx1 = document.getElementById('chart-ov-volume').getContext('2d');
    const gradient1 = createGradient(ctx1, 'rgba(99,102,241,0.35)', 'rgba(99,102,241,0.02)');
    chartInstances['ov-volume'] = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ov.monthly_transactions.labels,
        datasets: [{
          label: 'Transactions',
          data: ov.monthly_transactions.values,
          borderColor: '#6366f1',
          backgroundColor: gradient1,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#6366f1',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
          y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    // 2. Property Type Distribution (Doughnut)
    chartInstances['ov-proptype'] = new Chart(document.getElementById('chart-ov-proptype'), {
      type: 'doughnut',
      data: {
        labels: ov.property_type_dist.labels,
        datasets: [{
          data: ov.property_type_dist.values,
          backgroundColor: COLORS,
          borderColor: 'rgba(15,23,42,0.8)',
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } },
        },
      },
    });

    // 3. Top 10 Areas (Horizontal Bar)
    chartInstances['ov-topareas'] = new Chart(document.getElementById('chart-ov-topareas'), {
      type: 'bar',
      data: {
        labels: ov.top_areas_by_volume.labels,
        datasets: [{
          label: 'Transactions',
          data: ov.top_areas_by_volume.values,
          backgroundColor: COLORS_ALPHA(0.7),
          borderColor: COLORS,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });

    // 4. Sale vs Lease (Pie)
    chartInstances['ov-salelease'] = new Chart(document.getElementById('chart-ov-salelease'), {
      type: 'pie',
      data: {
        labels: ov.sale_vs_lease.labels,
        datasets: [{
          data: ov.sale_vs_lease.values,
          backgroundColor: ['#6366f1', '#14b8a6'],
          borderColor: 'rgba(15,23,42,0.8)',
          borderWidth: 2,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 13 }, padding: 20 } },
        },
      },
    });
  }

  function buildInvestmentCharts(data) {
    const inv = data.investment;

    // KPIs
    animateValue(document.getElementById('kpi-inv-median'), inv.kpis.median_value, 'EGP ');
    document.getElementById('kpi-inv-toparea').textContent = inv.kpis.highest_value_area;
    document.getElementById('kpi-inv-toparea-sub').innerHTML =
      `<span>${fmtEGP(inv.kpis.highest_value_area_ppsqm)}/sqm</span>`;
    animateValue(document.getElementById('kpi-inv-yoy'), inv.kpis.yoy_price_growth, '', '%');
    animateValue(document.getElementById('kpi-inv-offplan'), inv.kpis.offplan_share, '', '%');

    // 1. Yearly Avg Price/sqm (Line)
    const ctx1 = document.getElementById('chart-inv-ppsqm').getContext('2d');
    const gradient1 = createGradient(ctx1, 'rgba(20,184,166,0.3)', 'rgba(20,184,166,0.02)');
    chartInstances['inv-ppsqm'] = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: inv.yearly_avg_ppsqm.labels,
        datasets: [{
          label: 'Avg Price/sqm (EGP)',
          data: inv.yearly_avg_ppsqm.values,
          borderColor: '#14b8a6',
          backgroundColor: gradient1,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 6,
          pointBackgroundColor: '#14b8a6',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 3,
          pointHoverRadius: 9,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => fmtEGP(ctx.parsed.y) + '/sqm' } },
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
      },
    });

    // 2. Top 10 Most Expensive Areas (Horizontal Bar)
    chartInstances['inv-expensive'] = new Chart(document.getElementById('chart-inv-expensive'), {
      type: 'bar',
      data: {
        labels: inv.top_areas_by_price.labels,
        datasets: [{
          label: 'Avg Price/sqm',
          data: inv.top_areas_by_price.values,
          backgroundColor: COLORS_ALPHA(0.65),
          borderColor: COLORS,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => fmtEGP(ctx.parsed.x) + '/sqm' } },
        },
        scales: {
          x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });

    // 3. Transactions by Type & Year (Stacked Bar)
    const topTypes = Object.entries(inv.value_by_type_year.data)
      .sort((a, b) => b[1].reduce((s, v) => s + v, 0) - a[1].reduce((s, v) => s + v, 0))
      .slice(0, 8);

    chartInstances['inv-typeyear'] = new Chart(document.getElementById('chart-inv-typeyear'), {
      type: 'bar',
      data: {
        labels: inv.value_by_type_year.years,
        datasets: topTypes.map(([type, vals], i) => ({
          label: type,
          data: vals,
          backgroundColor: COLORS_ALPHA(0.7)[i],
          borderColor: COLORS[i],
          borderWidth: 1,
          borderRadius: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 10 } } },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
      },
    });

    // 4. Transaction Channel Mix (Radar)
    chartInstances['inv-channel'] = new Chart(document.getElementById('chart-inv-channel'), {
      type: 'radar',
      data: {
        labels: inv.transaction_channel.labels,
        datasets: [{
          label: 'Transaction Count',
          data: inv.transaction_channel.values,
          backgroundColor: 'rgba(139,92,246,0.2)',
          borderColor: '#8b5cf6',
          borderWidth: 2,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            angleLines: { color: 'rgba(148,163,184,0.1)' },
            grid: { color: 'rgba(148,163,184,0.08)' },
            pointLabels: { color: '#94a3b8', font: { size: 11 } },
            ticks: { display: false },
          },
        },
      },
    });
  }

  function buildRiskCharts(data) {
    const risk = data.risk;

    // KPIs
    animateValue(document.getElementById('kpi-risk-vol'), risk.kpis.price_volatility * 100, '', '%');
    animateValue(document.getElementById('kpi-risk-unreg'), risk.kpis.unregistered_pct, '', '%');
    document.getElementById('kpi-risk-lowliq').textContent = risk.kpis.low_liquidity_areas;
    document.getElementById('kpi-risk-maxdeal').textContent = fmtEGP(risk.kpis.max_transaction.worth);
    document.getElementById('kpi-risk-maxdeal-sub').innerHTML =
      `${risk.kpis.max_transaction.area} · ${risk.kpis.max_transaction.type}`;

    // 1. Price Volatility by Area (Bar)
    chartInstances['risk-vol'] = new Chart(document.getElementById('chart-risk-vol'), {
      type: 'bar',
      data: {
        labels: risk.volatility_by_area.labels,
        datasets: [{
          label: 'Volatility (%)',
          data: risk.volatility_by_area.values,
          backgroundColor: risk.volatility_by_area.values.map(v =>
            v > 150 ? 'rgba(244,63,94,0.7)' :
            v > 100 ? 'rgba(249,115,22,0.7)' :
            v > 50 ? 'rgba(245,158,11,0.7)' :
            'rgba(20,184,166,0.7)'
          ),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(1) + '% CoV' } },
        },
        scales: {
          x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });

    // 2. Registration Type (Doughnut)
    chartInstances['risk-regtype'] = new Chart(document.getElementById('chart-risk-regtype'), {
      type: 'doughnut',
      data: {
        labels: risk.reg_type_dist.labels,
        datasets: [{
          data: risk.reg_type_dist.values,
          backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#f43f5e'],
          borderColor: 'rgba(15,23,42,0.8)',
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } },
        },
      },
    });

    // 3. Quarterly Volume by Year (Multi-Line)
    const qYears = risk.quarterly_by_year.years;
    chartInstances['risk-quarterly'] = new Chart(document.getElementById('chart-risk-quarterly'), {
      type: 'line',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: qYears.map((year, i) => ({
          label: year,
          data: risk.quarterly_by_year.data[year],
          borderColor: COLORS[i],
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: COLORS[i],
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    // 4. Price Distribution (Histogram-style Bar)
    chartInstances['risk-pricedist'] = new Chart(document.getElementById('chart-risk-pricedist'), {
      type: 'bar',
      data: {
        labels: risk.price_distribution.labels,
        datasets: [{
          label: 'Transactions',
          data: risk.price_distribution.values,
          backgroundColor: [
            'rgba(20,184,166,0.7)', 'rgba(99,102,241,0.7)',
            'rgba(139,92,246,0.7)', 'rgba(245,158,11,0.7)',
            'rgba(249,115,22,0.7)', 'rgba(236,72,153,0.7)',
            'rgba(244,63,94,0.7)',
          ],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.y.toLocaleString() + ' transactions' } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
      },
    });
  }

  function buildTrendsCharts(data) {
    const tr = data.trends;

    // KPIs
    document.getElementById('kpi-tr-hottest').textContent = tr.kpis.hottest_area;
    document.getElementById('kpi-tr-hottest-sub').innerHTML =
      `<span class="trend-up">${fmtPct(tr.kpis.hottest_area_growth)} YoY</span>`;
    document.getElementById('kpi-tr-fasttype').textContent = tr.kpis.fastest_growing_type;
    document.getElementById('kpi-tr-fasttype-sub').innerHTML =
      `<span class="trend-up">${fmtPct(tr.kpis.fastest_growing_type_pct)} YoY</span>`;
    animateValue(document.getElementById('kpi-tr-supply'), tr.kpis.new_supply_pct, '', '%');

    const momEl = document.getElementById('kpi-tr-momentum');
    const momVal = tr.kpis.market_momentum;
    animateValue(momEl, Math.abs(momVal), momVal >= 0 ? '+' : '-', '%');

    // 1. Monthly Transaction Trend (Line with gradient fill)
    const ctx1 = document.getElementById('chart-tr-monthly').getContext('2d');
    const gradient1 = createGradient(ctx1, 'rgba(236,72,153,0.3)', 'rgba(236,72,153,0.02)');
    chartInstances['tr-monthly'] = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: tr.monthly_trend.labels,
        datasets: [{
          label: 'Transactions',
          data: tr.monthly_trend.counts,
          borderColor: '#ec4899',
          backgroundColor: gradient1,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#ec4899',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
          y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    // 2. Property Type Trend (Stacked Area)
    chartInstances['tr-typetrend'] = new Chart(document.getElementById('chart-tr-typetrend'), {
      type: 'line',
      data: {
        labels: tr.prop_type_monthly.labels,
        datasets: tr.prop_type_monthly.types.map((type, i) => ({
          label: type,
          data: tr.prop_type_monthly.data[type],
          borderColor: COLORS[i],
          backgroundColor: COLORS_ALPHA(0.15)[i],
          fill: true,
          tension: 0.4,
          borderWidth: 1.5,
          pointRadius: 0,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 10 } } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
          y: { stacked: true, grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => fmtNum(v) } },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    // 3. Growing vs Declining (Diverging Bar)
    const growing = tr.growing_declining.growing;
    const declining = tr.growing_declining.declining;
    const allItems = [
      ...growing.map(g => ({ name: g.name, value: g.growth, color: 'rgba(16,185,129,0.7)' })),
      ...declining.map(d => ({ name: d.name, value: d.growth, color: 'rgba(244,63,94,0.7)' })),
    ].sort((a, b) => b.value - a.value);

    chartInstances['tr-growdecline'] = new Chart(document.getElementById('chart-tr-growdecline'), {
      type: 'bar',
      data: {
        labels: allItems.map(i => i.name),
        datasets: [{
          label: 'YoY Growth (%)',
          data: allItems.map(i => i.value),
          backgroundColor: allItems.map(i => i.color),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => fmtPct(ctx.parsed.x) } },
        },
        scales: {
          x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { callback: v => v + '%' } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    });

    // 4. Usage Mix Over Time (100% Stacked Bar)
    const usageLabels = tr.usage_quarterly.labels;
    const usages = tr.usage_quarterly.usages;
    const usageColors = ['#6366f1', '#14b8a6', '#f59e0b'];

    // Calculate totals per quarter for percentage
    const totals = usageLabels.map((_, qi) =>
      usages.reduce((sum, u) => sum + (tr.usage_quarterly.data[u][qi] || 0), 0)
    );

    chartInstances['tr-usagemix'] = new Chart(document.getElementById('chart-tr-usagemix'), {
      type: 'bar',
      data: {
        labels: usageLabels,
        datasets: usages.map((usage, i) => ({
          label: usage,
          data: tr.usage_quarterly.data[usage].map((v, qi) =>
            totals[qi] > 0 ? (v / totals[qi]) * 100 : 0
          ),
          backgroundColor: usageColors[i] ? usageColors[i].replace(')', ',0.7)').replace('rgb', 'rgba') : COLORS_ALPHA(0.7)[i],
          borderColor: usageColors[i] || COLORS[i],
          borderWidth: 1,
          borderRadius: 1,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + '%' } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 10 } } },
          y: {
            stacked: true,
            max: 100,
            grid: { color: 'rgba(148,163,184,0.06)' },
            ticks: { callback: v => v + '%' },
          },
        },
      },
    });
  }

  // ---- INITIALIZE ----
  async function init() {
    try {
      const res = await fetch('data/dashboard_data.json');
      if (!res.ok) throw new Error('Failed to load data: ' + res.status);
      dashboardData = await res.json();

      // Build all chart sets
      buildOverviewCharts(dashboardData);
      buildInvestmentCharts(dashboardData);
      buildRiskCharts(dashboardData);
      buildTrendsCharts(dashboardData);

      // Initialize Lucide icons
      lucide.createIcons();

      // IFRAME INTEGRATION
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('hideSidebar') === 'true') {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.style.marginLeft = '0';
      }

      // Check hash for page routing
      const hash = window.location.hash.replace('#page-', '');
      const validPages = ['overview', 'investment', 'risk', 'trends'];
      const startPage = validPages.includes(hash) ? hash : 'overview';
      switchPage(startPage);
      setTimeout(() => initMapForPage(startPage), 200);

      // Hide loading overlay
      document.getElementById('loadingOverlay').classList.add('hidden');

    } catch (err) {
      console.error('Dashboard init error:', err);
      document.querySelector('.loading-text').textContent =
        'Error loading data. Please check the console.';
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
