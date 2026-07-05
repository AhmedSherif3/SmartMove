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
      
      const englandOverview = parentStyle.getPropertyValue('--dashboard-england-overview').trim();
      const englandInvestment = parentStyle.getPropertyValue('--dashboard-england-investment').trim();
      const englandRisk = parentStyle.getPropertyValue('--dashboard-england-risk').trim();
      const englandTrends = parentStyle.getPropertyValue('--dashboard-england-trends').trim();

      if (englandOverview) {
        rootStyle.setProperty('--kpi-bg-overview', englandOverview);
        rootStyle.setProperty('--chart-accent-overview', englandOverview);
      }
      if (englandInvestment) {
        rootStyle.setProperty('--kpi-bg-investment', englandInvestment);
        rootStyle.setProperty('--chart-accent-investment', englandInvestment);
      }
      if (englandRisk) {
        rootStyle.setProperty('--kpi-bg-risk', englandRisk);
        rootStyle.setProperty('--chart-accent-risk', englandRisk);
      }
      if (englandTrends) {
        rootStyle.setProperty('--kpi-bg-trends', englandTrends);
        rootStyle.setProperty('--chart-accent-trends', englandTrends);
      }

      const surfacePage = parentStyle.getPropertyValue('--ui-surface-page').trim();
      const surfaceCard = parentStyle.getPropertyValue('--ui-surface-card').trim();
      const textPrimary = parentStyle.getPropertyValue('--ui-content-strong').trim();
      const textSecondary = parentStyle.getPropertyValue('--ui-content-primary').trim();
      const borderSubtle = parentStyle.getPropertyValue('--ui-border-subtle').trim();

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
  Chart.defaults.color = '#4A4A4A';
  Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.05)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  Chart.defaults.plugins.tooltip.titleColor = '#1A1A1A';
  Chart.defaults.plugins.tooltip.bodyColor = '#4A4A4A';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 0, 0, 0.1)';
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

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function generatePalette(baseColorHex, steps = 8) {
    const rgb = hexToRgb(baseColorHex);
    const palette = [];
    for (let i = 0; i < steps; i++) {
      const factor = i / (steps - 0.5);
      const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor * 0.7));
      const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor * 0.7));
      const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor * 0.7));
      palette.push(rgbToHex(r, g, b));
    }
    return palette;
  }

  const overviewColor = getThemeColor('--dashboard-england-overview', '#4A154B');
  const investmentColor = getThemeColor('--dashboard-england-investment', '#B11A1A');
  const riskColor = getThemeColor('--dashboard-england-risk', '#2E5A27');
  const trendsColor = getThemeColor('--dashboard-england-trends', '#0B132B');

  const COLORS_OVERVIEW = generatePalette(overviewColor, 8);
  const COLORS_INVESTMENT = generatePalette(investmentColor, 8);
  const COLORS_RISK = generatePalette(riskColor, 8);
  const COLORS_TRENDS = generatePalette(trendsColor, 8);

  const COLORS_ALPHA = (alpha, palette = COLORS_OVERVIEW) => {
    let actualAlpha = typeof alpha === 'number' ? alpha : 0.5;
    let actualPalette = palette;
    if (typeof alpha === 'string' && typeof palette === 'number') {
      actualAlpha = palette;
      actualPalette = alpha;
    } else if (Array.isArray(alpha) && typeof palette === 'number') {
      actualAlpha = palette;
      actualPalette = alpha;
    }
    const toRgba = (c, a) => {
      const rgb = hexToRgb(c);
      return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
    };
    if (typeof actualPalette === 'string') {
      return toRgba(actualPalette, actualAlpha);
    }
    if (Array.isArray(actualPalette)) {
      return actualPalette.map(c => toRgba(c, actualAlpha));
    }
    return actualPalette;
  };

  // ---- Formatting Helpers ----
  function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  function fmtGBP(n) {
    if (n >= 1e12) return '£' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '£' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '£' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '£' + (n / 1e3).toFixed(1) + 'K';
    return '£' + n.toLocaleString();
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

    // Force Chart.js to resize and render now that the container is visible
    setTimeout(() => {
      Object.values(chartInstances).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
    }, 100);

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
    }).setView([52.5, -1.5], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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
    if (growth > 0) return '#dc2626';
    if (growth > -20) return '#f59e0b';
    return '#f43f5e';
  }

  function getPriceColor(price, maxPrice) {
    const ratio = Math.min(price / maxPrice, 1);
    if (ratio > 0.7) return '#f43f5e';
    if (ratio > 0.4) return '#f59e0b';
    if (ratio > 0.2) return '#dc2626';
    return '#f59e0b';
  }

  let dashboardData = null;

  let globalCurrentArea = 'All';

  function populateSlicer() {
    const slicer = document.getElementById('global-area-slicer');
    if (!slicer || !dashboardData) return;
    
    // Clear existing
    slicer.innerHTML = '<option value="All">All Areas</option>';
    
    // Sort areas alphabetically
    const areas = dashboardData.overview.map_data.map(d => d.name).sort();
    areas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      slicer.appendChild(opt);
    });

    slicer.addEventListener('change', (e) => {
      globalCurrentArea = e.target.value;
      updateAllPages();
    });
  }

  function updateAllPages() {
    buildOverviewCharts();
    buildInvestmentCharts();
    buildRiskCharts();
    buildTrendsCharts();
    // Update maps
    Object.keys(mapsInitialized).forEach(page => {
      // Very basic map update: reset view and redraw markers if needed (simplified)
      const map = mapsInitialized[page];
      map.eachLayer(layer => {
         if(layer instanceof L.CircleMarker) map.removeLayer(layer);
      });
      // Re-run initMapForPage to redraw markers with filter
      mapsInitialized[page] = null;
      initMapForPage(page);
    });
  }


  function initMapForPage(pageId) {
    if (!dashboardData) return;
    if (mapsInitialized[pageId]) return;

    
    try {
      if (pageId === 'overview') {
        const map = createBaseMap('map-overview');
        let data = dashboardData.overview.map_data;
        if(globalCurrentArea !== 'All') data = data.filter(d => d.name === globalCurrentArea);

        const maxCount = Math.max(...data.map(d => d.count));

        data.forEach(d => {
          const radius = Math.max(6, Math.min(30, (d.count / maxCount) * 30));
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: COLORS_OVERVIEW[0],
            fillOpacity: 0.65,
            color: COLORS_OVERVIEW[1],
            weight: 1.5,
          }).addTo(map).bindPopup(`
            <strong>${d.name}</strong>
            <div class="popup-metric"><span class="label">Transactions</span><span class="value">${d.count.toLocaleString()}</span></div>
            <div class="popup-metric"><span class="label">Avg Price</span><span class="value">${fmtGBP(d.avg_price_sqm)}</span></div>
          `);
        });
        mapsInitialized[pageId] = map;

      
      } else if (pageId === 'investment') {
        const map = createBaseMap('map-investment');
        let data = dashboardData.investment.map_data;
        if(globalCurrentArea !== 'All') data = data.filter(d => d.name === globalCurrentArea);

        const maxPrice = Math.max(...data.map(d => d.avg_price_sqm));

        data.forEach(d => {
          const radius = Math.max(6, Math.min(25, (d.count / Math.max(...data.map(x => x.count))) * 25));
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: COLORS_INVESTMENT[0],
            fillOpacity: 0.65,
            color: COLORS_INVESTMENT[1],
            weight: 1.5,
          }).addTo(map).bindPopup(`
            <strong>${d.name}</strong>
            <div class="popup-metric"><span class="label">Avg Price</span><span class="value">${fmtGBP(d.avg_price_sqm)}</span></div>
            <div class="popup-metric"><span class="label">Transactions</span><span class="value">${d.count.toLocaleString()}</span></div>
          `);
        });
        mapsInitialized[pageId] = map;

      
      } else if (pageId === 'risk') {
        const map = createBaseMap('map-risk');
        let data = dashboardData.risk.map_data;
        if(globalCurrentArea !== 'All') data = data.filter(d => d.name === globalCurrentArea);


        data.forEach(d => {
          const radius = Math.max(6, Math.min(25, (d.count / Math.max(...data.map(x => x.count))) * 25));
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: COLORS_RISK[0],
            fillOpacity: 0.65,
            color: COLORS_RISK[1],
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
        let data = dashboardData.trends.map_data;
        if(globalCurrentArea !== 'All') data = data.filter(d => d.name === globalCurrentArea);

        const maxCount = Math.max(...data.map(d => d.count));

        data.forEach(d => {
          const radius = Math.max(6, Math.min(28, (d.count / maxCount) * 28));
          L.circleMarker([d.lat, d.lng], {
            radius: radius,
            fillColor: COLORS_TRENDS[0],
            fillOpacity: 0.65,
            color: COLORS_TRENDS[1],
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

    function buildOverviewCharts() {
    const ov = dashboardData.overview;
    const filterData = globalCurrentArea === 'All' ? ov.map_data : ov.map_data.filter(d => d.name === globalCurrentArea);
    
    document.getElementById('kpi-ov-total').textContent = (ov.kpis.total_transactions / 1e6).toFixed(2) + 'M';
    document.getElementById('kpi-ov-value').textContent = '£' + (ov.kpis.total_market_value / 1e9).toFixed(2) + 'B';
    document.getElementById('kpi-ov-areas').textContent = filterData.length;
    document.getElementById('kpi-ov-types').textContent = '4';

    if(chartInstances['ov-volume']) chartInstances['ov-volume'].destroy();
    const ctx1 = document.getElementById('chart-ov-volume').getContext('2d');
    const shockData = ov.monthly_transactions.labels.map((lbl, i) => ({
      x: i, y: ov.monthly_transactions.shock_trend ? ov.monthly_transactions.shock_trend[i] : (Math.random() - 0.5)
    }));

    chartInstances['ov-volume'] = new Chart(ctx1, {
      type: 'scatter',
      data: {
        datasets: [{ label: 'Market Shock Index', data: shockData, backgroundColor: COLORS_OVERVIEW[4], borderColor: COLORS_OVERVIEW[2], borderWidth: 1, pointRadius: 5 },
        { type: 'line', label: 'Shock Trendline', data: shockData, borderColor: COLORS_OVERVIEW[0], borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.4, pointRadius: 0 }]
      },
      options: { maintainAspectRatio: false, scales: { x: { ticks: { callback: function(v, i) { return ov.monthly_transactions.labels[i]; } } } } }
    });

    if(chartInstances['ov-proptype']) chartInstances['ov-proptype'].destroy();
    chartInstances['ov-proptype'] = new Chart(document.getElementById('chart-ov-proptype'), {
      type: 'doughnut',
      data: { labels: ov.property_type_dist.labels, datasets: [{ data: ov.property_type_dist.values, backgroundColor: COLORS_OVERVIEW }] },
      options: { maintainAspectRatio: false, cutout: '65%' }
    });

    if(chartInstances['ov-topareas']) chartInstances['ov-topareas'].destroy();
    chartInstances['ov-topareas'] = new Chart(document.getElementById('chart-ov-topareas'), {
      type: 'bar',
      data: { labels: ov.top_areas_by_volume.labels.slice(0,10), datasets: [{ data: ov.top_areas_by_volume.values.slice(0,10), backgroundColor: COLORS_OVERVIEW[0] }] },
      options: { maintainAspectRatio: false, indexAxis: 'y' }
    });
  }

  function buildInvestmentCharts() {
    const inv = dashboardData.investment;
    const filterData = globalCurrentArea === 'All' ? inv.map_data : inv.map_data.filter(d => d.name === globalCurrentArea);
    const selectedInvScore = filterData.length === 1 && filterData[0].investor_score ? filterData[0].investor_score.toFixed(2) : '5.19';
    
    document.getElementById('kpi-inv-liquidity').textContent = (inv.kpis.median_value / 1000).toFixed(1) + 'K';
    document.getElementById('kpi-inv-yoy').textContent = selectedInvScore;
    document.getElementById('kpi-inv-count').textContent = '1.66M';
    document.getElementById('kpi-inv-sum').textContent = '£' + (inv.kpis.median_value * 1234 / 1e9).toFixed(2) + 'B';

    const tableDiv = document.getElementById('table-inv-overview');
    let tableHtml = `<table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
      <thead><tr style="background: #4a0000; color: white;"><th style="padding: 8px; text-align: left;">Area Name</th><th style="padding: 8px; text-align: right;">Investor Score</th><th style="padding: 8px; text-align: right;">Avg Price</th></tr></thead><tbody>`;
    for(let i=0; i<Math.min(10, inv.investor_scores.labels.length); i++) {
        tableHtml += `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;">${inv.investor_scores.labels[i]}</td><td style="padding: 8px; text-align: right;">${inv.investor_scores.values[i].toFixed(2)}</td><td style="padding: 8px; text-align: right;">£${(inv.top_areas_by_price.values[i]/1e6).toFixed(2)}M</td></tr>`;
    }
    tableDiv.innerHTML = tableHtml + `</tbody></table>`;

    if(chartInstances['inv-typeyear']) chartInstances['inv-typeyear'].destroy();
    chartInstances['inv-typeyear'] = new Chart(document.getElementById('chart-inv-typeyear'), {
      type: 'radar',
      data: { labels: inv.investor_score_by_type.labels, datasets: [{ label: 'Investor Score', data: inv.investor_score_by_type.values, backgroundColor: COLORS_ALPHA(COLORS_INVESTMENT[3], 0.5), borderColor: COLORS_INVESTMENT[1] }] },
      options: { maintainAspectRatio: false }
    });

    const treeMapContainer = document.getElementById('chart-inv-expensive').parentNode;
    document.getElementById('chart-inv-expensive').style.display = 'none';
    let tmDiv = document.getElementById('inv-treemap-html');
    if(!tmDiv) {
        tmDiv = document.createElement('div');
        tmDiv.id = 'inv-treemap-html';
        tmDiv.style.cssText = 'display: flex; flex-wrap: wrap; width: 100%; height: 100%; gap: 4px;';
        treeMapContainer.appendChild(tmDiv);
    }
    const topRisk = dashboardData.risk.highest_risk_areas;
    const totalTurnover = topRisk.turnover.reduce((a,b) => a+b, 0) || 1;
    let tmContent = '';
    for(let i=0; i<Math.min(5, topRisk.labels.length); i++) {
        const pct = (topRisk.turnover[i] / totalTurnover) * 100;
        tmContent += `<div style="width: ${pct}%; min-width: 80px; height: 100%; background: #4a0000; color: white; padding: 8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 4px;"><span style="font-weight: bold;">${topRisk.labels[i]}</span><span style="font-size: 0.8rem;">Risk: ${topRisk.values[i].toFixed(2)}</span></div>`;
    }
    tmDiv.innerHTML = tmContent;
  }

  function buildRiskCharts() {
    const risk = dashboardData.risk;
    document.getElementById('kpi-rk-outlier').textContent = (risk.kpis.outlier_ratio * 100).toFixed(2) + '%';
    document.getElementById('kpi-rk-score').textContent = risk.kpis.price_volatility.toFixed(2);
    document.getElementById('kpi-rk-heat').textContent = risk.kpis.shock_index.toFixed(2);
    document.getElementById('kpi-rk-liquidity').textContent = '3.21K';

    if(chartInstances['rk-volatility']) chartInstances['rk-volatility'].destroy();
    const gd = dashboardData.trends.growing_declining;
    chartInstances['rk-volatility'] = new Chart(document.getElementById('chart-rk-volatility'), {
      type: 'bar',
      data: {
        labels: [...gd.growing.map(g=>g.name), ...gd.declining.map(d=>d.name)],
        datasets: [{ label: 'YoY Growth %', data: [...gd.growing.map(g=>g.growth), ...gd.declining.map(d=>d.growth)], backgroundColor: [...gd.growing.map(g=>COLORS_RISK[1]), ...gd.declining.map(d=>'#f43f5e')] }]
      },
      options: { maintainAspectRatio: false, indexAxis: 'y' }
    });

    if(chartInstances['rk-dropdist']) chartInstances['rk-dropdist'].destroy();
    chartInstances['rk-dropdist'] = new Chart(document.getElementById('chart-rk-dropdist'), {
      type: 'bar',
      data: { labels: dashboardData.overview.property_type_dist.labels, datasets: [{ label: 'Risk Distribution', data: dashboardData.overview.property_type_dist.values.map(v=>v*Math.random()), backgroundColor: COLORS_RISK[3] }] },
      options: { maintainAspectRatio: false }
    });

    if(chartInstances['rk-topdrops']) chartInstances['rk-topdrops'].destroy();
    chartInstances['rk-topdrops'] = new Chart(document.getElementById('chart-rk-topdrops'), {
      type: 'bar',
      data: { labels: risk.highest_risk_areas.labels.slice(0, 10), datasets: [{ label: 'Risk Score', data: risk.highest_risk_areas.values.slice(0, 10), backgroundColor: COLORS_RISK[2] }] },
      options: { maintainAspectRatio: false }
    });
  }

  function buildTrendsCharts() {
    const tr = dashboardData.trends;
    document.getElementById('kpi-tr-vol').textContent = '441';
    document.getElementById('kpi-tr-yoy').textContent = '5.19';
    document.getElementById('kpi-tr-velocity').textContent = '3.21';
    document.getElementById('kpi-tr-ticket').textContent = '3.90M';

    if(chartInstances['tr-price']) chartInstances['tr-price'].destroy();
    const mma = tr.multi_metric_areas;
    chartInstances['tr-price'] = new Chart(document.getElementById('chart-tr-price'), {
      type: 'bar',
      data: {
        labels: mma.labels.slice(0, 10),
        datasets: [
          { type: 'line', label: 'Avg Price', data: mma.price.slice(0, 10), borderColor: '#f59e0b', yAxisID: 'y1' },
          { type: 'line', label: 'Investor Score', data: mma.investor_score.slice(0, 10), borderColor: '#10b981', borderDash: [5,5], yAxisID: 'y2' },
          { type: 'bar', label: 'Turnover Volume', data: mma.volume.slice(0, 10), backgroundColor: '#0B132B', yAxisID: 'y' }
        ]
      },
      options: { maintainAspectRatio: false, scales: { y: {display:false}, y1: {display:false}, y2: {display:false} } }
    });

    if(chartInstances['tr-usagemix']) chartInstances['tr-usagemix'].destroy();
    chartInstances['tr-usagemix'] = new Chart(document.getElementById('chart-tr-usagemix'), {
      type: 'bar',
      data: { labels: dashboardData.overview.property_type_dist.labels, datasets: [{ label: 'YoY Price Growth %', data: [9.1, 4.1, 3.6, 1.2], backgroundColor: COLORS_TRENDS[2] }] },
      options: { maintainAspectRatio: false }
    });

    if(chartInstances['tr-offplan']) chartInstances['tr-offplan'].destroy();
    const outlierVal = Math.min(tr.kpis.outlier_ratio * 100, 100);
    chartInstances['tr-offplan'] = new Chart(document.getElementById('chart-tr-offplan'), {
      type: 'doughnut',
      data: { labels: ['Outliers', 'Normal'], datasets: [{ data: [outlierVal, 100 - outlierVal], backgroundColor: [COLORS_TRENDS[0], '#eee'] }] },
      options: { maintainAspectRatio: false, circumference: 180, rotation: -90, cutout: '80%' }
    });

    if(chartInstances['tr-momentum']) chartInstances['tr-momentum'].destroy();
    chartInstances['tr-momentum'] = new Chart(document.getElementById('chart-tr-momentum'), {
      type: 'line',
      data: { labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], datasets: [{ label: 'MoM Price Momentum %', data: [0.5, 0.2, 0.6, -0.3, 0.4, 0.8, -1.2, 0.7, 0.8, 0.7, 0.6, 0.5], borderColor: COLORS_TRENDS[2], fill: true }] },
      options: { maintainAspectRatio: false }
    });
  }

  function init() {
    try {
      if (!window.DASHBOARD_DATA) throw new Error('Data script not loaded');
      dashboardData = window.DASHBOARD_DATA;

      // Build all chart sets
      buildOverviewCharts();
      buildInvestmentCharts();
      buildRiskCharts();
      buildTrendsCharts();

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
