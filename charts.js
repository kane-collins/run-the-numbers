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

  return { palette, showTip, hideTip, responsive, makeSvg, gridAndYAxis, bottomAxis, barChart, lineChart, scatter };
})();
