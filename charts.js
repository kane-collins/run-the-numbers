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
    t.style('left', Math.max(10, x) + 'px').style('top', Math.max(10, y) + 'px');
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
  function medalBars(el, items, o = {}) {
    const keys = ['gold', 'silver', 'bronze'];
    const names = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
    // Default colours match the individual medal table; anything passed in o.colors overrides them.
    const colors = Object.assign({ gold: '#d6a21e', silver: '#a9adb3', bronze: '#b0673b' }, o.colors || {});
    const totalOf = d => d.gold + d.silver + d.bronze;
    const yearsOf = (d, k) => ((d.years && d.years[k]) || []).slice().sort((a, b) => a - b);

    responsive(el, w => {
      el.innerHTML = '';
      const narrow = w < 440;
      const maxT = d3.max(items, totalOf) || 1;
      const nameW = narrow ? 96 : 118, totalW = 34, padR = 8, top = 22, bottom = 6;
      let R = narrow ? 7 : 8.2;                             // coin radius

      // Years sit beside each coin when the longest row fits; otherwise they drop underneath so no medal loses its year.
      const avail = w - nameW - totalW - padR - 8;
      const slotInline = narrow ? 38 : 48;
      const inline = maxT * slotInline <= avail;
      let slot = slotInline, yearFont = narrow ? 9 : 10, showYears = true;
      if (!inline) {
        slot = Math.min(narrow ? 24 : 28, avail / maxT);
        if (slot < 2 * R + 2) R = Math.max(4, slot / 2 - 1);
        if (slot < 20) yearFont = 8;
        showYears = slot >= 15;                             // below this the labels would collide; the tooltip still has them
      }
      const below = !inline && showYears;
      const rowH = (narrow ? 32 : 36) + (below ? 10 : 0);
      const cy = below ? rowH / 2 - 5 : rowH / 2;           // centre line of the coins

      const W = Math.min(w, nameW + maxT * slot + 8 + totalW + padR);
      const h = top + rowH * items.length + bottom;
      const svg = makeSvg(el, W, h, o.aria || 'Medal table');
      d3.select(el).select('svg').style('width', W + 'px').style('max-width', '100%')
        .style('height', 'auto').style('display', 'block').style('margin', '0 auto');

      const x0 = nameW + 4 + R;                             // centre of the first coin
      const totalX = W - padR;

      svg.append('text').attr('x', totalX).attr('y', 12).attr('text-anchor', 'end')
        .attr('font-size', 9.5).attr('font-weight', 600).attr('letter-spacing', '.04em').attr('fill', '#8a7d6e').text('TOTAL');

      const rows = svg.append('g').selectAll('g').data(items).join('g')
        .attr('transform', (d, i) => `translate(0,${top + i * rowH})`);

      // hover highlight, drawn first so it sits behind everything in the row
      const bgs = rows.append('rect').attr('x', 0).attr('y', 1).attr('width', W).attr('height', rowH - 2)
        .attr('rx', 6).attr('fill', '#f1e9dc').attr('opacity', 0);

      rows.append('line').attr('x1', nameW).attr('x2', totalX - 22).attr('y1', cy).attr('y2', cy)
        .attr('stroke', '#e7dfd2');

      const nameEls = rows.append('text').attr('x', nameW - 10).attr('y', cy + 4).attr('text-anchor', 'end')
        .attr('font-size', narrow ? 11.5 : 12.5).attr('fill', '#2a2521').text(d => d.club);

      rows.each(function (d) {
        const g = d3.select(this);
        let n = 0;
        keys.forEach(k => {
          const yrs = yearsOf(d, k);
          for (let j = 0; j < d[k]; j++) {
            const cx = x0 + n * slot;
            g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R).attr('fill', colors[k]);
            if (showYears && yrs[j] != null) {
              const t = g.append('text').attr('font-size', yearFont).attr('fill', '#62594f')
                .attr('pointer-events', 'none').text('’' + String(yrs[j]).slice(-2));
              if (below) t.attr('x', cx).attr('y', cy + R + 10).attr('text-anchor', 'middle');
              else t.attr('x', cx + R + 3).attr('y', cy + 3.5);
            }
            n++;
          }
        });
        g.append('text').attr('x', totalX).attr('y', cy + 4.5).attr('text-anchor', 'end')
          .attr('font-size', 13).attr('font-weight', 700).attr('fill', '#2a2521').text(n);
      });

      // full-row hit area: highlight the row and show the club's whole medal history
      rows.each(function (d, i) {
        const g = d3.select(this);
        const lines = keys.filter(k => d[k] > 0).map(k =>
          `<div class="row"><span><i style="background:${colors[k]}"></i>${names[k]}</span><span>${d[k]} · ${yearsOf(d, k).join(', ')}</span></div>`
        ).join('');
        const html = `<strong>${esc(d.full)}</strong>${lines}`;
        const summary = keys.filter(k => d[k] > 0).map(k => `${d[k]} ${names[k].toLowerCase()}`).join(', ');
        const hit = g.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', rowH)
          .attr('fill', 'transparent').attr('tabindex', 0).attr('role', 'img')
          .attr('aria-label', `${d.full}: ${summary}`);
        const bgEl = d3.select(bgs.nodes()[i]), nameEl = d3.select(nameEls.nodes()[i]);
        const tip = event => { bgEl.attr('opacity', 1); nameEl.attr('font-weight', 700); showTip(html, event); };
        const off = () => { bgEl.attr('opacity', 0); nameEl.attr('font-weight', null); hideTip(); };
        hit.on('pointerenter pointermove', tip).on('pointerleave', off)
          .on('focus', () => { const r = hit.node().getBoundingClientRect(); tip({ clientX: r.left + r.width / 2, clientY: r.top }); })
          .on('blur', off);
      });
    });
  }

 /* ---------- Points for gold / silver / bronze, by year ----------
     series = [{name, color, values: [{pts, club} | null, ...]}] aligned with years (a year with no race is null in every series)
     Options (all optional):
       height    chart height in px (default 320)
       yMax      fix the top of the points axis, e.g. the same number for the men's and women's charts
       band      false to hide the shaded gold-to-bronze "medal zone"
       averages  false to hide the dashed average-gold and average-bronze lines
       notes     [{year, series: 0, text: 'Lowest winning score: 22', dx: 0, dy: -12, anchor: 'middle'}] labels pinned to a point */
  function podiumLines(el, years, series, o = {}) {
    const ns = 'podium' + Math.random().toString(36).slice(2, 8);
    let clear = () => {};
    // On touch screens a tap shows the tooltip; tapping anywhere outside the chart closes it.
    d3.select(document).on('pointerdown.' + ns, event => { if (!el.contains(event.target)) clear(); });

    responsive(el, w => {
      el.innerHTML = '';
      const narrow = w < 420;
      const h = o.height || 320, m = { top: 16, right: narrow ? 40 : 46, bottom: 30, left: 50 };
      const svg = makeSvg(el, w, h, o.aria || 'Line chart of team points by year');
      const x = d3.scalePoint().domain(years).range([m.left + 10, w - m.right - 10]);
      const maxV = o.yMax || d3.max(series, s => d3.max(s.values, v => (v ? v.pts : 0)));
      // 0 at the top: lower is better, so the best scores sit highest
      const y = d3.scaleLinear().domain([0, maxV]).nice().range([m.top, h - m.bottom]);
      gridAndYAxis(svg, y, w, m);
      bottomAxis(svg,
        d3.axisBottom(x).tickValues(narrow ? years.filter((_, i) => i % 2 === 0) : years).tickFormat(d3.format('d')),
        h, m);

      svg.append('text').attr('transform', `translate(11,${(m.top + h - m.bottom) / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', narrow ? 10.5 : 11.5).attr('fill', '#62594f')
        .text(narrow ? 'Points (lower is better)' : 'Team points (lower is better)');

      const first = series[0], last = series[series.length - 1];

      // shaded "medal zone" between the gold and bronze lines, broken where there was no race
      if (o.band !== false && series.length > 1) {
        const segs = [];
        let cur = [];
        years.forEach((yr, i) => {
          if (first.values[i] && last.values[i]) cur.push(i);
          else { if (cur.length > 1) segs.push(cur); cur = []; }
        });
        if (cur.length > 1) segs.push(cur);
        segs.forEach(idx => svg.append('path').datum(idx)
          .attr('d', d3.area().x(i => x(years[i])).y0(i => y(first.values[i].pts)).y1(i => y(last.values[i].pts)))
          .attr('fill', first.color).attr('fill-opacity', 0.1));
      }

      years.forEach((yr, i) => {
        if (series.every(s => !s.values[i])) {
          svg.append('text').attr('transform', `translate(${x(yr) + 4},${(m.top + h - m.bottom) / 2}) rotate(-90)`)
            .attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', '#74695e').text('no race');
        }
      });

      // dashed averages for the winning and bronze-medal scores (the figures the article quotes)
      if (o.averages !== false && series.length > 1) {
        [first, last].forEach(s => {
          const vals = s.values.filter(Boolean).map(v => v.pts);
          if (!vals.length) return;
          const avg = d3.mean(vals), ay = y(avg);
          svg.append('line').attr('x1', m.left).attr('x2', w - m.right).attr('y1', ay).attr('y2', ay)
            .attr('stroke', s.color).attr('stroke-width', 1.2).attr('stroke-dasharray', '4 3').attr('opacity', 0.85);
          svg.append('text').attr('x', m.left + 4).attr('y', ay - 4)
            .attr('font-size', narrow ? 9.5 : 10.5).attr('font-weight', 600).attr('fill', '#62594f')
            .style('paint-order', 'stroke').style('stroke', '#fffdf8').style('stroke-width', '3px')
            .text(`${narrow ? 'Avg ' : 'Average '}${String(s.name).toLowerCase()}: ${Math.round(avg)}`);
        });
      }

      const line = d3.line().defined(v => v).x((v, i) => x(years[i])).y(v => y(v.pts));
      series.forEach(s => svg.append('path').attr('d', line(s.values)).attr('fill', 'none')
        .attr('stroke', s.color).attr('stroke-width', 2.4).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round'));

      const pts = series.flatMap(s => s.values.map((v, i) => (v ? { s, v, i } : null)).filter(Boolean));
      const dots = svg.append('g').selectAll('circle').data(pts).join('circle')
        .attr('cx', d => x(years[d.i])).attr('cy', d => y(d.v.pts)).attr('r', 4)
        .attr('fill', d => d.s.color).attr('stroke', '#fffdf8').attr('stroke-width', 2);

      // direct labels at the end of each line, nudged apart where they would collide
      const ends = series.map(s => {
        const i = s.values.map(Boolean).lastIndexOf(true);
        return i < 0 ? null : { s, px: x(years[i]), yy: y(s.values[i].pts) };
      }).filter(Boolean).sort((a, b) => b.yy - a.yy);
      for (let k = 1; k < ends.length; k++) ends[k].yy = Math.min(ends[k].yy, ends[k - 1].yy - 12);
      ends.forEach(e => svg.append('text').attr('x', e.px + 9).attr('y', e.yy + 3.5)
        .attr('font-size', narrow ? 9.5 : 10.5).attr('font-weight', 600).attr('fill', '#62594f').text(e.s.name));

      // optional labels for particular points, e.g. the lowest winning score
      (o.notes || []).forEach(n => {
        const s = series[n.series || 0], i = years.indexOf(n.year), v = s && s.values[i];
        if (!v) return;
        svg.append('text').attr('x', x(n.year) + (n.dx || 0)).attr('y', y(v.pts) + (n.dy == null ? -12 : n.dy))
          .attr('text-anchor', n.anchor || 'middle').attr('font-size', narrow ? 9.5 : 10.5).attr('font-weight', 700)
          .attr('fill', '#2a2521').style('paint-order', 'stroke').style('stroke', '#fffdf8').style('stroke-width', '3px')
          .text(n.text);
      });

      const vline = svg.append('line').attr('y1', m.top).attr('y2', h - m.bottom)
        .attr('stroke', '#2a2521').attr('stroke-opacity', 0.25).style('display', 'none');
      clear = () => { vline.style('display', 'none'); dots.attr('r', 4); hideTip(); };
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
        .on('pointerleave', event => { if (event.pointerType === 'mouse') clear(); });

    });
  }


function positionGrid(el, years, clubs, cats) {
  d3.select(document).on('pointerdown.posgrid', e => {
    if (!e.target.closest('.pos-grid td')) hideTip();
  });
  const shade = d3.scaleLinear()
    .domain([1, 3, 8, 18])
    .range(['#8f2a14', '#c4553a', '#f0bfa8', '#f9ece3'])
    .clamp(true);

  const mean = c => d3.mean(c.pos.filter(p => p != null));

  // Completely clear the container before rendering
  el.replaceChildren();

  const scroll = d3.select(el).append('div').attr('class', 'pos-grid-scroll');
  const table = scroll.append('table').attr('class', 'pos-grid');
    const cols = table.append('colgroup');
  cols.append('col').attr('class', 'col-club');
  years.forEach(() => cols.append('col'));
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

                    .on('pointerleave', event => { if (event.pointerType === 'mouse') hideTip(); })
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
    const th = row.append('th').attr('scope', 'col');
    th.append('span').attr('class', 'y-full').text(yr);
    th.append('span').attr('class', 'y-short').text('’' + String(yr).slice(-2));
  });
}



  return { palette, showTip, hideTip, responsive, makeSvg, gridAndYAxis, bottomAxis, lineChart, 
  esc, legend, tableView, medalBars, podiumLines, positionGrid };
})();
