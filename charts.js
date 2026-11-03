/* Run the Numbers — small shared chart helpers built on D3 (v7).
   Gives you clean, hoverable charts: bar, line (with crosshair), scatter. */
const RTN = (() => {
  const palette = ['#c2512f', '#2f6f73', '#d29a2e', '#6b5b95'];
  let tip = null;

  function ensureTip() {
    if (!tip) tip = d3.select('body').append('div').attr('class', 'tooltip');
    return tip;
  }

  function showTip(html, event) {
    const t = ensureTip();
    t.html(html).classed('visible', true);
    const pad = 16, w = t.node().offsetWidth, h = t.node().offsetHeight;
    let x = event.clientX + pad, y = event.clientY + pad;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = event.clientY - h - pad;
    t.style('left', Math.max(8, x) + 'px').style('top', Math.max(8, y) + 'px');
  }

  function hideTip() { ensureTip().classed('visible', false); }

  // Re-draws a chart whenever its container width changes.
  function responsive(el, draw) {
    let last = 0, timer;
    const render = () => {
      const w = Math.floor(el.clientWidth);
      if (!w || w === last) return;
      last = w;
      draw(w);
    };
    render();
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(render, 80); }).observe(el);
  }

  function makeSvg(el, w, h, aria) {
    return d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h)
      .attr('role', 'img').attr('aria-label', aria || 'Chart');
  }

  function gridAndYAxis(svg, y, w, m, fmt, tickValues) {
    const axis = () => (tickValues ? d3.axisLeft(y).tickValues(tickValues) : d3.axisLeft(y).ticks(5));
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.left},0)`)
      .call(axis().tickSize(-(w - m.left - m.right)).tickFormat(''))
      .call(g => g.select('.domain').remove());
    svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`)
      .call(axis().tickSize(0).tickPadding(10).tickFormat(fmt || null))
      .call(g => g.select('.domain').remove());
  }

  function bottomAxis(svg, axis, h, m) {
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.bottom})`)
      .call(axis.tickSize(0).tickPadding(10))
      .call(g => g.select('.domain').attr('stroke', '#d8cebf'));
  }

  /* ---------- Bar chart: data = [{label, value}] ---------- */
  function barChart(el, data, o = {}) {
    responsive(el, w => {
      el.innerHTML = '';
      const h = o.height || 340, m = { top: 12, right: 8, bottom: 32, left: 44 };
      const svg = makeSvg(el, w, h, o.aria || 'Bar chart');
      const x = d3.scaleBand().domain(data.map(d => d.label)).range([m.left, w - m.right]).padding(0.22);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice().range([h - m.bottom, m.top]);
      const intTicks = o.integer ? d3.range(0, Math.floor(y.domain()[1]) + 1) : null;
      gridAndYAxis(svg, y, w, m, null, intTicks);
      bottomAxis(svg, d3.axisBottom(x), h, m);

      const bars = svg.append('g').selectAll('rect').data(data).join('rect')
        .attr('x', d => x(d.label)).attr('width', x.bandwidth())
        .attr('y', d => y(d.value)).attr('height', d => y(0) - y(d.value))
        .attr('rx', 3).attr('fill', o.color || palette[0]).style('transition', 'opacity .15s');

      // Full-height invisible hit areas make hovering easy.
      svg.append('g').selectAll('rect').data(data).join('rect')
        .attr('x', d => x(d.label) - x.step() * 0.11).attr('width', x.step())
        .attr('y', m.top).attr('height', h - m.top - m.bottom).attr('fill', 'transparent')
        .on('pointerenter pointermove', (event, d) => {
          bars.attr('opacity', b => (b === d ? 1 : 0.35));
          showTip(`<strong>${d.label}</strong>${d.value} ${o.unit || ''}${d.note ? '<br>' + d.note : ''}`, event);
        })
        .on('pointerleave', () => { bars.attr('opacity', 1); hideTip(); });
    });
  }

  /* ---------- Line chart with crosshair tooltip ----------
     labels = ['Jan', ...], series = [{name, color?, values: [...]}] */
  function lineChart(el, labels, series, o = {}) {
    series.forEach((s, i) => { s.color = s.color || palette[i % palette.length]; });
    responsive(el, w => {
      el.innerHTML = '';
      const legend = d3.select(el).append('div').attr('class', 'legend');
      series.forEach(s => legend.append('span').html(`<i style="background:${s.color}"></i>${s.name}`));

      const h = o.height || 340, m = { top: 12, right: 16, bottom: 32, left: 44 };
      const svg = makeSvg(el, w, h, o.aria || 'Line chart');
      const x = d3.scalePoint().domain(labels).range([m.left + 8, w - m.right - 8]);
      const all = series.flatMap(s => s.values);
      const y = d3.scaleLinear().domain([o.yMin ?? 0, d3.max(all)]).nice().range([h - m.bottom, m.top]);
      gridAndYAxis(svg, y, w, m);
      bottomAxis(svg, d3.axisBottom(x), h, m);

      const line = d3.line().x((d, i) => x(labels[i])).y(d => y(d)).curve(d3.curveMonotoneX);
      series.forEach(s => {
        svg.append('path').attr('d', line(s.values)).attr('fill', 'none')
          .attr('stroke', s.color).attr('stroke-width', 2.75).attr('stroke-linecap', 'round');
      });

      const vline = svg.append('line').attr('y1', m.top).attr('y2', h - m.bottom)
        .attr('stroke', '#2a2521').attr('stroke-opacity', 0.25).style('display', 'none');
      const dots = svg.append('g').selectAll('circle').data(series).join('circle')
        .attr('r', 5).attr('fill', s => s.color).attr('stroke', '#fffdf8').attr('stroke-width', 2)
        .style('display', 'none');

      svg.append('rect').attr('x', m.left).attr('y', m.top)
        .attr('width', w - m.left - m.right).attr('height', h - m.top - m.bottom)
        .attr('fill', 'transparent')
        .on('pointermove', event => {
          const [px] = d3.pointer(event);
          const i = d3.minIndex(labels, l => Math.abs(x(l) - px));
          const cx = x(labels[i]);
          vline.attr('x1', cx).attr('x2', cx).style('display', null);
          dots.attr('cx', cx).attr('cy', s => y(s.values[i])).style('display', null);
          const rows = series.map(s =>
            `<div class="row"><span><i style="background:${s.color}"></i>${s.name}</span><span>${s.values[i]} ${o.unit || ''}</span></div>`
          ).join('');
          showTip(`<strong>${labels[i]}</strong>${rows}`, event);
        })
        .on('pointerleave', () => { vline.style('display', 'none'); dots.style('display', 'none'); hideTip(); });
    });
  }

  /* ---------- Scatter: data = [{label, x, y}] ---------- */
  function scatter(el, data, o = {}) {
    responsive(el, w => {
      el.innerHTML = '';
      const h = o.height || 360, m = { top: 14, right: 24, bottom: 50, left: 54 };
      const svg = makeSvg(el, w, h, o.aria || 'Scatter plot');
      const x = d3.scaleLinear().domain(d3.extent(data, d => d.x)).nice().range([m.left + 6, w - m.right]);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.y)]).nice().range([h - m.bottom, m.top]);
      gridAndYAxis(svg, y, w, m);
      bottomAxis(svg, d3.axisBottom(x).ticks(6), h, m);

      svg.append('text').attr('class', 'axis-title').attr('x', (m.left + w - m.right) / 2)
        .attr('y', h - 8).attr('text-anchor', 'middle').text(o.xLabel || '');
      svg.append('text').attr('class', 'axis-title').attr('transform', 'rotate(-90)')
        .attr('x', -(m.top + h - m.bottom) / 2).attr('y', 14).attr('text-anchor', 'middle').text(o.yLabel || '');

      svg.append('g').selectAll('text').data(data).join('text')
        .attr('x', d => x(d.x) + 11).attr('y', d => y(d.y) + 4)
        .attr('fill', '#74695e').attr('font-size', 11).text(d => d.label);

      const dots = svg.append('g').selectAll('circle').data(data).join('circle')
        .attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 6.5)
        .attr('fill', o.color || palette[1]).attr('fill-opacity', 0.85)
        .attr('stroke', '#fffdf8').attr('stroke-width', 2).style('transition', 'r .12s');

      dots.on('pointerenter pointermove', function (event, d) {
        d3.select(this).attr('r', 10);
        showTip(`<strong>${d.label}</strong>${o.xLabel}: ${d.x}<br>${o.yLabel}: ${d.y}`, event);
      }).on('pointerleave', function () { d3.select(this).attr('r', 6.5); hideTip(); });
    });
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ord = n => { const v = n % 100, s = ['th', 'st', 'nd', 'rd']; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  // A key made of coloured dots. Pass onHover to make the items interactive.
  function legend(el, items, o = {}) {
    const d = d3.select(el).append('div').attr('class', 'legend').style('padding', o.padding || '0 0 12px');
    items.forEach(it => {
      const sp = d.append('span').attr('class', 'legend-item');
      sp.append('i').style('background', it.color);
      sp.append('span').text(it.label);
      if (o.onHover) {
        sp.attr('tabindex', 0)
          .on('pointerenter focus', () => o.onHover(it))
          .on('pointerleave blur', () => o.onHover(null));
      }
    });
    return d;
  }

  // Plain table twin of a chart, for anyone who can't or won't hover.
  function tableView(el, headers, rows) {
    const d = d3.select(el).append('details').attr('class', 'table-view');
    d.append('summary').text('View as table');
    const t = d.append('div').attr('class', 'table-scroll').append('table');
    t.append('thead').append('tr').selectAll('th').data(headers).join('th').attr('scope', 'col').text(h => h);
    const body = t.append('tbody');
    rows.forEach(r => {
      const tr = body.append('tr');
      r.forEach((cell, i) => tr.append(i === 0 ? 'th' : 'td').attr('scope', i === 0 ? 'row' : null).text(cell));
    });
  }

  /* ---------- Medal table: stacked horizontal bars ----------
     items = [{club, full, gold, silver, bronze, years: {gold: [], silver: [], bronze: []}}] */
  function medalBars(el, items, o = {}) {
    const keys = ['gold', 'silver', 'bronze'];
    const names = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
    const totalOf = d => d.gold + d.silver + d.bronze;
    responsive(el, w => {
      el.innerHTML = '';
      const rowH = 28, barH = 16;
      const m = { top: 6, right: 30, bottom: 28, left: w < 440 ? 90 : 100 };
      const h = m.top + rowH * items.length + m.bottom;
      const svg = makeSvg(el, w, h, o.aria || 'Medal table');
      const maxT = d3.max(items, totalOf);
      const x = d3.scaleLinear().domain([0, maxT]).range([m.left, w - m.right]);
      const ticks = d3.range(0, maxT + 1);

      svg.append('g').attr('class', 'grid').selectAll('line').data(ticks).join('line')
        .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', m.top).attr('y2', h - m.bottom);
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.bottom})`)
        .call(d3.axisBottom(x).tickValues(ticks).tickFormat(d3.format('d')).tickSize(0).tickPadding(8))
        .call(g => g.select('.domain').remove());

      const rows = svg.append('g').selectAll('g').data(items).join('g')
        .attr('transform', (d, i) => `translate(0,${m.top + i * rowH})`)
        .style('transition', 'opacity .15s');

      rows.append('text').attr('x', m.left - 10).attr('y', rowH / 2 + 4).attr('text-anchor', 'end')
        .attr('font-size', 12.5).attr('fill', '#2a2521').text(d => d.club);

      rows.each(function (d) {
        let acc = 0;
        const g = d3.select(this);
        keys.forEach(k => {
          if (!d[k]) return;
          const x0 = x(acc), x1 = x(acc + d[k]);
          g.append('rect').attr('x', x0).attr('y', (rowH - barH) / 2)
            .attr('width', Math.max(0, x1 - x0 - 2)).attr('height', barH).attr('rx', 3)
            .attr('fill', o.colors[k]);
          acc += d[k];
        });
        g.append('text').attr('x', x(acc) + 6).attr('y', rowH / 2 + 4).attr('font-size', 12)
          .attr('font-weight', 600).attr('fill', '#74695e').text(acc);
      });

      rows.append('rect').attr('x', 0).attr('width', w).attr('height', rowH).attr('fill', 'transparent')
        .on('pointerenter pointermove', (event, d) => {
          rows.attr('opacity', r => (r === d ? 1 : 0.35));
          const lines = keys.filter(k => d[k] > 0).map(k =>
            `<div class="row"><span><i style="background:${o.colors[k]}"></i>${names[k]}</span><span>${d[k]} · ${d.years[k].join(', ')}</span></div>`
          ).join('');
          showTip(`<strong>${esc(d.full)}</strong>${lines}`, event);
        })
        .on('pointerleave', () => { rows.attr('opacity', 1); hideTip(); });

      tableView(el, ['Club', 'Gold', 'Silver', 'Bronze', 'Total'],
        items.map(d => [d.full, d.gold, d.silver, d.bronze, totalOf(d)]));
    });
  }

  /* ---------- Points for gold / silver / bronze, by year ----------
     series = [{name, color, values: [{pts, club} | null, ...]}] aligned with years (a year with no race is null in every series) */
  function podiumLines(el, years, series, o = {}) {
    responsive(el, w => {
      el.innerHTML = '';
      const h = o.height || 320, m = { top: 14, right: 12, bottom: 30, left: 40 };
      const narrow = w < 420;
      const svg = makeSvg(el, w, h, o.aria || 'Line chart of team points by year');
      const x = d3.scalePoint().domain(years).range([m.left + 10, w - m.right - 10]);
      const maxV = d3.max(series, s => d3.max(s.values, v => (v ? v.pts : 0)));
      const y = d3.scaleLinear().domain([0, maxV]).nice().range([h - m.bottom, m.top]);
      gridAndYAxis(svg, y, w, m);
      bottomAxis(svg,
        d3.axisBottom(x).tickValues(narrow ? years.filter((_, i) => i % 3 === 0) : years).tickFormat(d3.format('d')),
        h, m);

      years.forEach((yr, i) => {
        if (series.every(s => !s.values[i])) {
          svg.append('text').attr('transform', `translate(${x(yr) + 4},${(m.top + h - m.bottom) / 2}) rotate(-90)`)
            .attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', '#74695e').text('no race');
        }
      });

      const line = d3.line().defined(v => v).x((v, i) => x(years[i])).y(v => y(v.pts));
      series.forEach(s => svg.append('path').attr('d', line(s.values)).attr('fill', 'none')
        .attr('stroke', s.color).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round'));

      const pts = series.flatMap(s => s.values.map((v, i) => (v ? { s, v, i } : null)).filter(Boolean));
      const dots = svg.append('g').selectAll('circle').data(pts).join('circle')
        .attr('cx', d => x(years[d.i])).attr('cy', d => y(d.v.pts)).attr('r', 4)
        .attr('fill', d => d.s.color).attr('stroke', '#fffdf8').attr('stroke-width', 2);

      const vline = svg.append('line').attr('y1', m.top).attr('y2', h - m.bottom)
        .attr('stroke', '#2a2521').attr('stroke-opacity', 0.25).style('display', 'none');
      const move = event => {
        const [px] = d3.pointer(event);
        const i = d3.minIndex(years, yr => Math.abs(x(yr) - px));
        vline.attr('x1', x(years[i])).attr('x2', x(years[i])).style('display', null);
        dots.attr('r', d => (d.i === i ? 6 : 4));
        const rows = series.map(s => {
          const v = s.values[i];
          return v ? `<div class="row"><span><i style="background:${s.color}"></i>${s.name}</span><span>${v.pts} · ${esc(v.club)}</span></div>` : '';
        }).join('');
        showTip(`<strong>${years[i]}</strong>${rows || 'No race held'}`, event);
      };
      svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', w - m.left - m.right)
        .attr('height', h - m.top - m.bottom).attr('fill', 'transparent')
        .on('pointerdown pointermove', move)
        .on('pointerleave', () => { vline.style('display', 'none'); dots.attr('r', 4); hideTip(); });

      tableView(el, ['Year', ...series.map(s => s.name)], years.map((yr, i) => [
        yr, ...series.map(s => (s.values[i] ? `${s.values[i].pts} · ${s.values[i].club}` : 'no race'))
      ]));
    });
  }

  /* ---------- Finishing position by club and year (1 = top) ----------
     clubs = [{club, full, cat, pos: [...], pts: [...]}] aligned with years; cats = [{key, label, color}] */
  function positionLines(el, years, clubs, cats, o = {}) {
    const catBy = Object.fromEntries(cats.map(c => [c.key, c]));
    const ordered = clubs.slice().sort((a, b) => (a.cat === 'other' ? 0 : 1) - (b.cat === 'other' ? 0 : 1));
    responsive(el, w => {
      el.innerHTML = '';
      let hoverClub = null, hoverCat = null, lines, dots;
      const dim = c => (hoverClub ? c !== hoverClub : hoverCat ? c.cat !== hoverCat : false);
      const paint = () => {
        lines.attr('stroke-opacity', c => (dim(c) ? 0.08 : (c.cat === 'other' && !hoverClub && !hoverCat ? 0.6 : 0.95)))
          .attr('stroke-width', c => (c === hoverClub ? 3.5 : 2));
        dots.attr('opacity', d => (dim(d.c) ? 0.08 : 1));
      };
      legend(el, cats.map(c => ({ key: c.key, label: c.label, color: c.color })), {
        onHover: it => { hoverCat = it ? it.key : null; hoverClub = null; paint(); }
      });

      const maxPos = d3.max(clubs, c => d3.max(c.pos.filter(p => p != null)));
      const h = o.height || (w < 480 ? 400 : 440);
      const m = { top: 12, right: 14, bottom: 30, left: 36 };
      const svg = makeSvg(el, w, h, o.aria || 'Finishing positions by club');
      const x = d3.scalePoint().domain(years).range([m.left + 10, w - m.right - 10]);
      const y = d3.scaleLinear().domain([0.5, maxPos + 0.5]).range([m.top, h - m.bottom]);

      svg.append('rect').attr('x', m.left).attr('width', w - m.left - m.right)
        .attr('y', y(0.5)).attr('height', y(3.5) - y(0.5)).attr('fill', '#d9a000').attr('fill-opacity', 0.1);
      // 2020 has no data, so the label sits in that gap where nothing can cover it
      svg.append('text').attr('x', x(2020)).attr('y', y(0.5) + 13).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('fill', '#74695e').text('Podium');
      gridAndYAxis(svg, y, w, m, null, [1, 5, 10, 15, 20].filter(t => t <= maxPos));
      bottomAxis(svg,
        d3.axisBottom(x).tickValues(w < 480 ? years.filter((_, i) => i % 3 === 0) : years).tickFormat(d3.format('d')),
        h, m);

      const line = d3.line().defined(p => p != null).x((p, i) => x(years[i])).y(p => y(p));
      lines = svg.append('g').selectAll('path').data(ordered).join('path')
        .attr('d', c => line(c.pos)).attr('fill', 'none').attr('stroke', c => catBy[c.cat].color)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      const pdata = ordered.flatMap(c => c.pos.map((p, i) => (p == null ? null : { c, i, p })).filter(Boolean));
      dots = svg.append('g').selectAll('circle').data(pdata).join('circle')
        .attr('cx', d => x(years[d.i])).attr('cy', d => y(d.p)).attr('r', 4)
        .attr('fill', d => catBy[d.c.cat].color).attr('stroke', '#fffdf8').attr('stroke-width', 2);
      paint();

      // Hit layer: wide invisible strokes and 20px dots, so nobody has to land on a 2px line.
      const info = (c, i) => `<strong>${esc(c.full)}</strong>${esc(catBy[c.cat].label)}<br>${years[i]}: ${ord(c.pos[i])} · ${c.pts[i]} pts`;
      const enter = (event, c, i) => { hoverClub = c; hoverCat = null; paint(); showTip(info(c, i), event); };
      const leave = () => { hoverClub = null; paint(); hideTip(); };
      svg.append('g').selectAll('path').data(ordered).join('path')
        .attr('d', c => line(c.pos)).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14)
        .on('pointerenter pointermove', (event, c) => {
          const [px] = d3.pointer(event);
          let best = -1, bd = Infinity;
          c.pos.forEach((p, i) => { const dx = Math.abs(x(years[i]) - px); if (p != null && dx < bd) { bd = dx; best = i; } });
          enter(event, c, best);
        })
        .on('pointerleave', leave);
      svg.append('g').selectAll('circle').data(pdata).join('circle')
        .attr('cx', d => x(years[d.i])).attr('cy', d => y(d.p)).attr('r', 10).attr('fill', 'transparent')
        .on('pointerenter pointermove', (event, d) => enter(event, d.c, d.i))
        .on('pointerleave', leave);

      tableView(el, ['Club', 'Group', ...years],
        clubs.map(c => [c.full, catBy[c.cat].label, ...c.pos.map(p => (p == null ? '–' : p))]));
    });
  }

  return { palette, showTip, hideTip, responsive, makeSvg, gridAndYAxis, bottomAxis, barChart, lineChart, scatter,
           esc, legend, tableView, medalBars, podiumLines, positionLines };
})();
