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
    // Lives next to the chart, not inside it: charts redraw when their width changes,
    // and a table inside would be wiped (closed) by that redraw.
    if (el.nextElementSibling && el.nextElementSibling.classList.contains('table-view')) return;
    const d = d3.select(el.parentNode).insert('details', () => el.nextSibling).attr('class', 'table-view');
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
      // 0 at the top: lower is better, so the best scores sit highest
      const y = d3.scaleLinear().domain([0, maxV]).nice().range([m.top, h - m.bottom]);
      gridAndYAxis(svg, y, w, m);
      bottomAxis(svg,
        d3.axisBottom(x).tickValues(narrow ? years.filter((_, i) => i % 2 === 0) : years).tickFormat(d3.format('d')),
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


function positionGrid(el, years, clubs, cats) {
  const shade = d3.scaleLinear()
    .domain([1, 3, 8, 18])
    .range(['#8f2a14', '#c4553a', '#f0bfa8', '#f9ece3'])
    .clamp(true);

  const mean = c => d3.mean(c.pos.filter(p => p != null));

  // Completely clear the container before rendering
  el.replaceChildren();

  const scroll = d3.select(el)
    .append('div')
    .attr('class', 'pos-grid-scroll');

  const table = scroll
    .append('table')
    .attr('class', 'pos-grid');

  // Table body
  const body = table.append('tbody');

  cats.forEach(cat => {
    const group = clubs
      .filter(c => c.cat === cat.key)
      .sort((a, b) => mean(a) - mean(b));

    if (!group.length) return;

    body.append('tr')
      .attr('class', 'grp')
      .append('th')
      .attr('colspan', years.length + 1)
      .text(cat.label);

    group.forEach(c => {
      const tr = body.append('tr');

      tr.append('th')
        .attr('scope', 'row')
        .attr('class', 'club')
        .text(c.club);

      years.forEach((yr, i) => {
        const p = c.pos[i];
        const td = tr.append('td');

        if (p == null) {
          td.attr('class', 'empty');
          return;
        }

        td.attr('class', p <= 3 ? 'podium' : null)
          .style('background', shade(p))
          .style('color', p <= 3 ? '#fffdf8' : '#2a2521')
          .text(p)
          .on('pointerenter pointermove', event =>
            showTip(
              `<strong>${esc(c.full)}</strong>${yr}: ${ord(p)} · ${c.pts[i]} pts`,
              event
            )
          )
          .on('pointerleave', hideTip);
      });
    });
  });

  // Single year-heading row at the bottom
  const foot = table.append('tfoot');
  const row = foot.append('tr');

  row.append('th')
    .attr('scope', 'row')
    .text('Year');

  years.forEach(yr => {
    row.append('th')
      .attr('scope', 'col')
      .text(yr);
  });
}





  return { palette, showTip, hideTip, responsive, makeSvg, gridAndYAxis, bottomAxis, lineChart, 
  esc, legend, tableView, medalBars, podiumLines, positionGrid };
})();
