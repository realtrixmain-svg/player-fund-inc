/* Player Fund Inc - chart instances for strategies.html, data sourced from the RAIF investor deck */
document.addEventListener('DOMContentLoaded', () => {
  const aumCanvas = document.getElementById('chart-aum-allocation');
  if (aumCanvas) {
    new BarChart(aumCanvas, {
      data: [
        { label: 'Blue Chip Growth & Income', value: 24, range: 2 },
        { label: 'LDI (Investment Grade)', value: 18, range: 2 },
        { label: 'Dedicated Portfolio', value: 22, range: 2 },
        { label: 'Secondaries & Primaries', value: 16, range: 2 },
        { label: 'Private Credit', value: 20, range: 2 }
      ],
      maxValue: 30
    });
  }

  const weightsCanvas = document.getElementById('chart-optimal-weights');
  if (weightsCanvas) {
    new DonutChart(weightsCanvas, {
      centerLabel: 'Optimal Portfolio Weights',
      legendEl: document.getElementById('chart-optimal-weights-legend'),
      data: [
        { label: 'Growth compartment — listed blue chip equities', value: 35 },
        { label: 'Alternatives (Debt) — private credit fixed income', value: 20 },
        { label: 'Income compartment — AAA–BB fixed income & yield equities', value: 15 },
        { label: 'Alternatives (Private Equity) — hedge fund', value: 10 },
        { label: 'Listed private equity/debt (real estate)', value: 20 }
      ]
    });
  }

  const liquidityCanvas = document.getElementById('chart-liquidity');
  if (liquidityCanvas) {
    const seriesKeys = ['cash', 'public-eq', 'hf-liquid', 'hf-illiquid', 'private-eq'];
    const seg = (cashV, pubV, hfLV, hfIV, peV) => ([
      { key: 'cash', label: 'Fixed Income & Cash', value: cashV },
      { key: 'public-eq', label: 'Public Equity', value: pubV },
      { key: 'hf-liquid', label: 'Hedge Funds (Liquid)', value: hfLV },
      { key: 'hf-illiquid', label: 'Hedge Funds (Illiquid)', value: hfIV },
      { key: 'private-eq', label: 'Private Equity', value: peV }
    ]);
    new StackedBarChart(liquidityCanvas, {
      seriesKeys,
      legendEl: document.getElementById('chart-liquidity-legend'),
      data: [
        { label: 'Year 0 (Pre-Crisis)', segments: seg(10, 45, 10, 10, 25) },
        { label: 'Year 1 (Post-Drawdown)', segments: seg(16, 30, 13, 13, 28) },
        { label: 'Year 1 (After Rebalancing)', segments: seg(10, 31, 10, 10, 39) },
        { label: 'Year 2 (After Rebalancing)', segments: seg(10, 17, 10, 10, 53) },
        { label: 'Year 3 (After Rebalancing)', segments: seg(10, 1, 10, 10, 69) }
      ]
    });
  }

  const correlationCanvas = document.getElementById('chart-correlation');
  if (correlationCanvas) {
    new CorrelationMatrix(correlationCanvas, {
      classes: ['Equities', 'Fixed Income', 'Alternatives (Hedge Funds)', 'Private Equity'],
      stats: [
        { ret: 9.4, risk: 15 },
        { ret: 4, risk: 8 },
        { ret: 7, risk: 15 },
        { ret: 15.8, risk: 30 }
      ],
      matrix: [
        [1],
        [0.25, 1],
        [0.25, 0.25, 1],
        [0.75, 0, 0.25, 1]
      ]
    });
  }

  const regionalCanvas = document.getElementById('chart-regional-gdp');
  if (regionalCanvas) {
    new BubbleChart(regionalCanvas, {
      data: [
        { label: 'North America', sub: 'S&P 500 Index', value: 22.2 },
        { label: 'Europe', sub: 'FTSE 100 & Eurostoxx 50', value: 19.1 },
        { label: 'South America', sub: 'S&P Latin America 40 Index', value: 3.99 },
        { label: 'South East Asia', sub: 'S&P Southeast Asia 40 Index', value: 2.76 },
        { label: 'Oceania', sub: 'S&P ASX 200 Index', value: 1.665 },
        { label: 'Russia', sub: 'MOEX Russia Index', value: 1.578 },
        { label: 'South Africa', sub: 'FTSE/JSE Top 40 Index', value: 0.3494 }
      ]
    });
  }
});
