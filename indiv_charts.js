console.log("indiv_charts loaded", typeof RTN, Object.isFrozen(RTN));
/* Run the Numbers — interactive individual charts; requires D3 v7 and charts.js. */
(function () {
  const MEDALS = {
    gold: {label:"Gold",color:"#c98500"},
    silver: {label:"Silver",color:"#A7A9AC"},
    bronze: {label:"Bronze",color:"#a0522d"}
  };

  function medalTable(el, data, options={}) {
    if (!el || !data) return;
    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 560, pad = narrow ? 12 : 16;
      const labelW = narrow ? Math.min(116,width*.36) : 132;
      const noteW = narrow ? 0 : 88;
      const left = pad + labelW, rowH = narrow ? 31 : 30, top = 30;
      const height = top + data.length*rowH + 10;
      const medalGap = narrow ? 29 : 34;
      const svg = d3.select(el).append("svg")
        .attr("viewBox",`0 0 ${width} ${height}`).attr("width","100%").attr("height","auto")
        .attr("role","img").attr("aria-label",options.aria || "Individual National Cross Country medal finishes");

      svg.append("g").selectAll("line").data(data).join("line")
        .attr("x1",left).attr("x2",width-pad-noteW)
        .attr("y1",(d,i)=>top+i*rowH+rowH/2).attr("y2",(d,i)=>top+i*rowH+rowH/2)
        .attr("stroke","#e7dfd2");

      svg.append("g").selectAll("text").data(data).join("text")
        .attr("x",left-9).attr("y",(d,i)=>top+i*rowH+rowH/2+3.5)
        .attr("text-anchor","end").attr("fill","#62594f")
        .attr("font-size",narrow?10.5:11.5).text(d=>d.name);

      const groups=svg.append("g").selectAll("g.athlete").data(data).join("g");
      groups.each(function(d,i) {
        const g=d3.select(this), y=top+i*rowH+rowH/2;
        d.medals.forEach((m,j)=>{
          const [type,year]=m, x=left+8+j*medalGap, color=MEDALS[type].color;
          const point=g.append("g").attr("class","medal-point").attr("tabindex",0)
            .attr("role","img").attr("aria-label",`${d.name}: ${MEDALS[type].label}, ${year}`);
          point.append("circle").attr("cx",x).attr("cy",y).attr("r",5.4)
            .attr("fill",color).attr("stroke","#655b50").attr("stroke-width",.75);
          point.append("text").attr("x",x+9).attr("y",y+3)
            .attr("font-size",narrow?8:9).attr("fill","#74695e")
            .text("’"+String(year).slice(-2));
          const tip=event=>RTN.showTip(`<strong>${d.name}</strong><br>${MEDALS[type].label} medal · ${year}`,event);
          point.on("pointerenter pointermove",tip).on("pointerleave",()=>RTN.hideTip())
            .on("focus",()=>{const r=point.node().getBoundingClientRect();tip({clientX:r.left+r.width/2,clientY:r.top});})
            .on("blur",()=>RTN.hideTip());
        });
      });

      if (!narrow) {
        const split=data.findIndex(d=>d.medals.length===1);
        const multi=split<0?data.length:split, single=data.length-multi, x=width-pad-noteW+2;
        [[ "Multiple podiums",0,multi ],[ "One podium",multi,single ]].forEach(([label,start,count])=>{
          if(!count)return;
          const y=top+(start+count/2)*rowH;
          svg.append("text").attr("x",x).attr("y",y-2).attr("font-size",9.5)
            .attr("font-weight",600).attr("fill","#62594f").text(label);
          svg.append("text").attr("x",x).attr("y",y+11).attr("font-size",9)
            .attr("fill","#74695e").text(`(${count})`);
        });
      }
    });
  }

RTN.individualMedalTable = medalTable;
RTN.individualMedalLegend = function(el) {
    if(!el)return;
    el.innerHTML="";
    const legend=d3.select(el).append("div").attr("class","legend");
    Object.values(MEDALS).forEach(m=>{
      const item=legend.append("span").attr("class","legend-item");
      item.append("i").style("background",m.color);
      item.append("span").text(m.label);
    });
  };
})();

/* Run the Numbers — winning-margin lollipop chart. Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const COLORS = { Men: "#23608f", Women: "#c2512f" };

  function fmt(s) {
    return s >= 60 ? Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") : s + "s";
  }

  function marginChart(el, data, options = {}) {
    if (!el || !data) return;
    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 560, pad = narrow ? 10 : 16;
      const labelW = narrow ? Math.min(116, width * 0.36) : 232;
      const noteW = narrow ? 44 : 150;
      const rowH = narrow ? 26 : 25, top = 8, axisH = 46;
      const left = pad + labelW, right = width - pad - noteW;
      const height = top + data.length * rowH + axisH;
      const maxV = d3.max(data, d => d.margin);
      const x = d3.scaleLinear().domain([0, maxV]).range([left, right]);
      const ticks = [0, 25, 50, 75, 100].filter(t => t <= maxV);
      const bottom = top + data.length * rowH;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "Winning margin over second place in every National Cross Country Championship, largest to smallest");

      // gridlines + axis labels
      const grid = svg.append("g");
      ticks.forEach(t => {
        grid.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top).attr("y2", bottom)
          .attr("stroke", "#e7dfd2");
        grid.append("text").attr("x", x(t)).attr("y", bottom + 16).attr("text-anchor", "middle")
          .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(t);
      });
      svg.append("text").attr("x", (left + right) / 2).attr("y", bottom + 36).attr("text-anchor", "middle")
        .attr("font-size", narrow ? 11 : 12).attr("fill", "#62594f").text("Margin of victory (seconds)");

      const rows = svg.append("g").selectAll("g.row").data(data).join("g").attr("class", "row");
      rows.each(function (d, i) {
        const g = d3.select(this), y = top + i * rowH + rowH / 2, color = COLORS[d.gender];
        const label = narrow
          ? `’${String(d.year).slice(-2)} ${d.winner.split(" ").pop()}`
          : `${d.year} ${d.gender}: ${d.winner}`;
        const note = narrow ? fmt(d.margin) : `${fmt(d.margin)} ahead of ${d.runnerUp}`;

        g.append("text").attr("x", left - 9).attr("y", y + 3.5).attr("text-anchor", "end")
          .attr("fill", "#62594f").attr("font-size", narrow ? 10.5 : 11.5).text(label);
        g.append("line").attr("x1", x(0)).attr("x2", x(d.margin)).attr("y1", y).attr("y2", y)
          .attr("stroke", color).attr("stroke-width", 2.2).attr("stroke-linecap", "round");
        g.append("circle").attr("cx", x(d.margin)).attr("cy", y).attr("r", 4.8).attr("fill", color);
        g.append("text").attr("x", x(d.margin) + 9).attr("y", y + 3.2)
          .attr("font-size", narrow ? 9 : 10).attr("fill", "#74695e").text(note);

        // full-row hit area for tooltips
        const hit = g.append("rect").attr("x", pad).attr("y", y - rowH / 2)
          .attr("width", width - pad * 2).attr("height", rowH)
          .attr("fill", "transparent").attr("tabindex", 0).attr("role", "img")
          .attr("aria-label", `${d.year} ${d.gender}: ${d.winner}, ${fmt(d.margin)} ahead of ${d.runnerUp}`);
        const tip = event => RTN.showTip(
          `<strong>${d.winner}</strong> · ${d.gender}, ${d.year}<br>${fmt(d.margin)} ahead of ${d.runnerUp}`, event);
        hit.on("pointerenter pointermove", tip).on("pointerleave", () => RTN.hideTip())
          .on("focus", () => { const r = hit.node().getBoundingClientRect(); tip({ clientX: r.left + r.width / 2, clientY: r.top }); })
          .on("blur", () => RTN.hideTip());
      });
    });
  }

  function marginLegend(el) {
    if (!el) return;
    el.innerHTML = "";
    const legend = d3.select(el).append("div").attr("class", "legend");
    Object.entries(COLORS).forEach(([label, color]) => {
      const item = legend.append("span").attr("class", "legend-item");
      item.append("i").style("background", color);
      item.append("span").text(label);
    });
  }

  RTN.marginChart = marginChart;
  RTN.marginLegend = marginLegend;
})();

/* Run the Numbers — "How deep is the field?" small-multiple line chart.
   Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const POS_COLORS = { 5: "#b5de2b", 10: "#1fa187", 20: "#31688e", 40: "#440154" };
  const ordinal = n => n + "th";

  function mmss(s) {
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function depthChart(el, data, options = {}) {
    if (!el || !data) return;
    const sexes = ["Men", "Women"];
    const positions = data.positions;
    const years = Object.keys(data.Men).map(Number);
    const yMax = 8, yTicks = [0, 2, 4, 6];

    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 560;
      const padR = narrow ? 12 : 16, axisW = narrow ? 40 : 48;
      const stripH = 22, xAxisH = 22, gap = narrow ? 0 : 22;
      const panelH = narrow ? 170 : 250;
      const panelW = narrow ? width - axisW - padR : (width - axisW - padR - gap) / 2;
      const rows = narrow ? 2 : 1;
      const rowBlock = stripH + panelH + xAxisH + (narrow ? 14 : 0);
      const height = rows * rowBlock + 6;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "Time behind the winner for the 5th, 10th, 20th and 40th place finishers, men and women, 2016 to 2025");

      const y = d3.scaleLinear().domain([0, yMax]).range([panelH, 0]);

      sexes.forEach((sex, si) => {
        const ox = narrow ? axisW : axisW + si * (panelW + gap);
        const oy = narrow ? si * rowBlock : 0;
        const g = svg.append("g").attr("transform", `translate(${ox},${oy + stripH})`);
        const x = d3.scaleLinear().domain([2016, 2025]).range([10, panelW - 10]);

        // panel background strip title
        svg.append("text").attr("x", ox + panelW / 2).attr("y", oy + 14).attr("text-anchor", "middle")
          .attr("font-weight", 600).attr("font-size", narrow ? 12 : 13).attr("fill", "#2d2823").text(sex);

        // horizontal gridlines
        yTicks.forEach(t => {
          g.append("line").attr("x1", 0).attr("x2", panelW).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "#e7dfd2");
        });
        // y-axis labels: always on narrow, only on first panel when wide
        if (narrow || si === 0) {
          yTicks.forEach(t => {
            g.append("text").attr("x", -8).attr("y", y(t) + 3.5).attr("text-anchor", "end")
              .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(t);
          });
        }
        // x-axis labels (no race in 2020)
        years.forEach(yr => {
          g.append("text").attr("x", x(yr)).attr("y", panelH + 16).attr("text-anchor", "middle")
            .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(String(yr).slice(-2));
        });

        // lines + points
        positions.forEach((p, pi) => {
          const color = POS_COLORS[p];
          const pts = years.map(yr => ({ yr, s: data[sex][yr][pi] }));
          g.append("path").datum(pts)
            .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
            .attr("stroke-linejoin", "round")
            .attr("d", d3.line().x(d => x(d.yr)).y(d => y(d.s / 60)));
          pts.forEach(d => {
            g.append("circle").attr("cx", x(d.yr)).attr("cy", y(d.s / 60)).attr("r", 3.4).attr("fill", color);
            const hit = g.append("circle").attr("cx", x(d.yr)).attr("cy", y(d.s / 60)).attr("r", 10)
              .attr("fill", "transparent").attr("tabindex", 0).attr("role", "img")
              .attr("aria-label", `${sex} ${d.yr}: ${ordinal(p)} place, ${mmss(d.s)} behind the winner`);
            const tip = event => RTN.showTip(
              `<strong>${sex} · ${d.yr}</strong><br>${ordinal(p)} place: ${mmss(d.s)} behind the winner`, event);
            hit.on("pointerenter pointermove", tip).on("pointerleave", () => RTN.hideTip())
              .on("focus", () => { const r = hit.node().getBoundingClientRect(); tip({ clientX: r.left + r.width / 2, clientY: r.top }); })
              .on("blur", () => RTN.hideTip());
          });
        });
      });

      // y-axis title
      svg.append("text").attr("transform", `translate(12,${stripH + panelH / 2}) rotate(-90)`)
        .attr("text-anchor", "middle").attr("font-size", narrow ? 11 : 12).attr("fill", "#62594f")
        .text("Minutes behind the winner");
    });
  }

  function depthLegend(el) {
    if (!el) return;
    el.innerHTML = "";
    const legend = d3.select(el).append("div").attr("class", "legend");
    legend.append("span").attr("class", "legend-item").style("font-weight", 500).text("Finishing position");
    Object.entries(POS_COLORS).forEach(([p, color]) => {
      const item = legend.append("span").attr("class", "legend-item");
      item.append("i").style("background", color);
      item.append("span").text(ordinal(p));
    });
  }

  RTN.depthChart = depthChart;
  RTN.depthLegend = depthLegend;
})();

/* Run the Numbers — "How reliably do the best athletes deliver?" range-and-dot chart.
   Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const COLORS = { Men: "#23608f", Women: "#c2512f" };

  function prep(list) {
    return list.map(a => {
      const p = a.f.map(d => d[1]);
      return {
        name: a.name, f: a.f, n: p.length,
        mean: d3.mean(p), median: d3.median(p), best: d3.min(p), worst: d3.max(p)
      };
    }).sort((a, b) => a.mean - b.mean || a.median - b.median);
  }

  function reliableChart(el, data, options = {}) {
    if (!el || !data) return;
    const sexes = ["Men", "Women"];
    const stats = {};
    sexes.forEach(s => stats[s] = prep(data[s]));
    const maxN = Math.max(...sexes.map(s => stats[s].length));

    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 640, pad = narrow ? 10 : 16, gap = narrow ? 0 : 20;
      const labelW = narrow ? Math.min(108, width * 0.3) : 122;
      const panelW = narrow ? width - pad * 2 : (width - pad * 2 - gap) / 2;
      const rowH = narrow ? 24 : 25, stripH = 24, axisH = 22, blockGap = 14, titleH = 30;
      const blockH = stripH + maxN * rowH + axisH;
      const height = (narrow ? 2 * blockH + blockGap : blockH) + titleH;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "Every championship finish for athletes with four or more appearances, with mean, best and worst");

      sexes.forEach((sex, si) => {
        const rows = stats[sex], color = COLORS[sex];
        const ox = pad + (narrow ? 0 : si * (panelW + gap));
        const oy = narrow ? si * (blockH + blockGap) : 0;
        const x0 = ox + labelW + 6, x1 = ox + panelW - 8;
        const dMax = Math.ceil(d3.max(rows, d => d.worst) / 10) * 10;
        const x = d3.scaleLinear().domain([1, dMax]).range([x0, x1]);
        const ticks = [1].concat(d3.range(10, dMax + 1, 10));
        const top = oy + stripH, bottom = top + rows.length * rowH;

        svg.append("text").attr("x", (x0 + x1) / 2).attr("y", oy + 15).attr("text-anchor", "middle")
          .attr("font-weight", 600).attr("font-size", narrow ? 12 : 13).attr("fill", "#2d2823").text(sex);

        ticks.forEach(t => {
          svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top).attr("y2", bottom)
            .attr("stroke", "#e7dfd2");
          svg.append("text").attr("x", x(t)).attr("y", bottom + 15).attr("text-anchor", "middle")
            .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(t);
        });

        rows.forEach((d, i) => {
          const y = top + i * rowH + rowH / 2;
          const g = svg.append("g");
          g.append("text").attr("x", ox + labelW).attr("y", y + 3.5).attr("text-anchor", "end")
            .attr("font-size", narrow ? 10.5 : 11.5).attr("fill", "#62594f").text(d.name);
          g.append("rect").attr("x", x(d.best) - 3).attr("y", y - 4.5)
            .attr("width", Math.max(0, x(d.worst) - x(d.best)) + 6).attr("height", 9).attr("rx", 4.5)
            .attr("fill", "#d9d5ce");
          d.f.forEach(([yr, pos]) => {
            g.append("circle").attr("cx", x(pos)).attr("cy", y).attr("r", 3.4)
              .attr("fill", color).attr("opacity", 0.6);
          });
          g.append("path")
            .attr("transform", `translate(${x(d.mean)},${y})`)
            .attr("d", d3.symbol().type(d3.symbolDiamond).size(78)())
            .attr("fill", "#1c1a17");

          const finishes = d.f.map(([yr, pos]) => `’${String(yr).slice(-2)}: ${pos}`).join(" · ");
          const html = `<strong>${d.name}</strong> · ${d.n} championships<br>` +
            `Mean ${d.mean.toFixed(1)} · median ${d.median}<br>Best ${d.best} · worst ${d.worst}<br>` +
            `<span style="opacity:.8">${finishes}</span>`;
          const hit = g.append("rect").attr("x", ox).attr("y", y - rowH / 2)
            .attr("width", panelW).attr("height", rowH).attr("fill", "transparent")
            .attr("tabindex", 0).attr("role", "img")
            .attr("aria-label", `${d.name}: mean finish ${d.mean.toFixed(1)}, best ${d.best}, worst ${d.worst}, over ${d.n} championships`);
          const tip = event => RTN.showTip(html, event);
          hit.on("pointerenter pointermove", tip).on("pointerleave", () => RTN.hideTip())
            .on("focus", () => { const r = hit.node().getBoundingClientRect(); tip({ clientX: r.left + r.width / 2, clientY: r.top }); })
            .on("blur", () => RTN.hideTip());
        });
      });

      svg.append("text").attr("x", width / 2).attr("y", height - 8).attr("text-anchor", "middle")
        .attr("font-size", narrow ? 11 : 12).attr("fill", "#62594f").text("Finishing position");
    });
  }

  RTN.reliableChart = reliableChart;
})();

/* Run the Numbers — "The all-rounders" career timeline chart.
   Each champion gets a strip on a shared year axis: a ring for every XC title, a coloured dot for every other
   national title. A dot sitting inside a ring is a same-year double.
   Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const EVENTS = [
    ["1500m", "#2f6f73"],
    ["5000m", "#d29a2e"],
    ["Marathon", "#6b5b95"]
  ];
  const INK = "#2d2823";
  const GROUPS = [["same", "Same year"], ["different", "Different year"], ["xc", "XC only"]];

  function allroundersChart(el, data, options = {}) {
    if (!el || !data) return;
    const sexes = ["Men", "Women"];

    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 560, pad = narrow ? 10 : 16;
      const labelW = narrow ? Math.min(112, width * 0.33) : 140;
      const rowH = narrow ? 28 : 30, stripH = 26, hdrH = 24, axisH = 24, blockGap = 16;
      const x0 = pad + labelW + 10, x1 = width - pad - 10;
      const x = d3.scaleLinear().domain([2007, 2026]).range([x0, x1]);
      const ticks = [2010, 2015, 2020, 2025];

      // lay out each panel: strip title, then group headers and rows
      const panels = sexes.map(sex => {
        const items = [];
        GROUPS.forEach(([key, label]) => {
          const rows = data[sex].filter(d => d.group === key);
          if (!rows.length) return;
          items.push({ type: "hdr", label });
          rows.forEach(d => items.push({ type: "row", d }));
        });
        const h = stripH + items.reduce((s, it) => s + (it.type === "hdr" ? hdrH : rowH), 0) + axisH;
        return { sex, items, h };
      });
      const height = panels.reduce((s, p) => s + p.h, 0) + blockGap * (panels.length - 1) + 6;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "Timeline of every National XC champion's national 1500m, 5000m and marathon titles, 2008 to 2025");

      let oy = 0;
      panels.forEach(({ sex, items, h }) => {
        const bodyTop = oy + stripH, bodyBottom = oy + h - axisH;

        svg.append("text").attr("x", pad).attr("y", oy + 16).attr("font-weight", 700)
          .attr("font-size", narrow ? 12.5 : 14).attr("fill", INK).text(sex);

        ticks.forEach(t => {
          svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", bodyTop).attr("y2", bodyBottom)
            .attr("stroke", "#e7dfd2");
          svg.append("text").attr("x", x(t)).attr("y", bodyBottom + 15).attr("text-anchor", "middle")
            .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(t);
        });

        let y = bodyTop;
        items.forEach(it => {
          if (it.type === "hdr") {
            svg.append("text").attr("x", pad).attr("y", y + 16).attr("font-size", 10.5)
              .attr("font-weight", 600).attr("letter-spacing", ".04em").attr("fill", "#8a7d6e")
              .text(it.label.toUpperCase());
            svg.append("line").attr("x1", pad).attr("x2", width - pad).attr("y1", y + hdrH - 3).attr("y2", y + hdrH - 3)
              .attr("stroke", "#e7dfd2");
            y += hdrH;
            return;
          }
          const d = it.d, cy = y + rowH / 2;
          const g = svg.append("g");

          g.append("text").attr("x", pad + labelW).attr("y", cy + 3.5).attr("text-anchor", "end")
            .attr("font-size", narrow ? 10.5 : 11.5).attr("fill", "#62594f").text(d.name);
          g.append("line").attr("x1", x0).attr("x2", x1).attr("y1", cy).attr("y2", cy).attr("stroke", "#efe8dc");

          // XC title rings (drawn first so other-title dots sit inside them)
          d.xc.forEach(yr => {
            g.append("circle").attr("cx", x(yr)).attr("cy", cy).attr("r", 8.2)
              .attr("fill", "#fff").attr("stroke", INK).attr("stroke-width", 2);
            g.append("text").attr("x", x(yr) + 12).attr("y", cy + 3).attr("font-size", 9)
              .attr("fill", INK).attr("font-weight", 600).text("’" + String(yr).slice(-2));
          });
          // other national titles
          EVENTS.forEach(([ev, color]) => {
            (d.titles[ev] || []).forEach(yr => {
              g.append("circle").attr("cx", x(yr)).attr("cy", cy).attr("r", 4.6).attr("fill", color);
            });
          });

          const lines = [`<strong>${d.name}</strong>`, `XC: ${d.xc.join(", ")}`]
            .concat(EVENTS.filter(([ev]) => (d.titles[ev] || []).length).map(([ev]) => `${ev}: ${d.titles[ev].join(", ")}`));
          if (Object.keys(d.titles).length === 0) lines.push("No other national titles in this analysis");
          const html = lines.join("<br>");
          const ariaTitles = EVENTS.filter(([ev]) => (d.titles[ev] || []).length)
            .map(([ev]) => `${ev} ${d.titles[ev].join(", ")}`).join("; ") || "no other national titles";

          const hit = g.append("rect").attr("x", pad).attr("y", y).attr("width", width - pad * 2).attr("height", rowH)
            .attr("fill", "transparent").attr("tabindex", 0).attr("role", "img")
            .attr("aria-label", `${d.name}: XC ${d.xc.join(", ")}; ${ariaTitles}`);
          const tip = event => RTN.showTip(html, event);
          hit.on("pointerenter pointermove", tip).on("pointerleave", () => RTN.hideTip())
            .on("focus", () => { const r = hit.node().getBoundingClientRect(); tip({ clientX: r.left + r.width / 2, clientY: r.top }); })
            .on("blur", () => RTN.hideTip());
          y += rowH;
        });
        oy += h + blockGap;
      });
    });
  }

  function allroundersLegend(el) {
    if (!el) return;
    el.innerHTML = "";
    const legend = d3.select(el).append("div").attr("class", "legend");
    const xc = legend.append("span").attr("class", "legend-item");
    xc.append("i").style("background", "#fff").style("box-shadow", `inset 0 0 0 2px ${INK}`);
    xc.append("span").text("National XC title");
    EVENTS.forEach(([ev, color]) => {
      const item = legend.append("span").attr("class", "legend-item");
      item.append("i").style("background", color);
      item.append("span").text(ev + " title");
    });
  }

  RTN.allroundersChart = allroundersChart;
  RTN.allroundersLegend = allroundersLegend;
})();

/* Run the Numbers — "Do U23 stars become senior stars?" scatter.
   Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const COLORS = { Men: "#23608f", Women: "#c2512f" };
  const INK = "#2d2823";
  const pct = v => "top " + Math.round(v * 100) + "%";

  // The "biggest improvers": bottom half of the U23 field, top 20% as seniors.
  const isImprover = d => d[1] >= 0.5 && d[3] <= 0.2;
  // Label offsets [dx, dy] from the point, so neighbouring labels don't collide.
  const OFFSETS = {
    "Tony McCambridge": [-16, -22],
    "Eoghan McElhinney": [-20, 24],
    "Nadine Donegan": [-18, -24],
    "Edel Monaghan": [-20, 26]
  };

  function u23Chart(el, data, options = {}) {
    if (!el || !data) return;
    const sexes = ["Men", "Women"];
    const r = d3.scaleSqrt().domain([2, 9]).range([3, 8.5]);

    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 600, pad = narrow ? 10 : 16, gap = 22;
      const axisW = narrow ? 40 : 54, stripH = 24, tickH = 18, titleH = 22, blockGap = 10;
      const panelW = narrow ? width - axisW - pad : (width - axisW - pad - gap) / 2;
      const panelH = Math.round(Math.min(narrow ? 300 : 340, panelW * (narrow ? 0.9 : 0.85)));
      const blockH = stripH + panelH + tickH + titleH;
      const height = (narrow ? 2 * blockH + blockGap : blockH) + 4;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "Scatter of each athlete's best U23 finish against their best senior finish, men and women");

      sexes.forEach((sex, si) => {
        const ox = narrow ? axisW : axisW + si * (panelW + gap);
        const oy = narrow ? si * (blockH + blockGap) : 0;
        const top = oy + stripH, bottom = top + panelH;
        const x = d3.scaleLinear().domain([1.05, -0.05]).range([ox, ox + panelW]);
        const y = d3.scaleLinear().domain([-0.05, 1.05]).range([top, bottom]);
        const ticks = [0, 0.25, 0.5, 0.75, 1];
        const tickLabel = t => Math.round(t * 100) + "%";

        svg.append("text").attr("x", ox + panelW / 2).attr("y", oy + 15).attr("text-anchor", "middle")
          .attr("font-weight", 600).attr("font-size", narrow ? 12 : 13).attr("fill", INK).text(sex);

        ticks.forEach(t => {
          svg.append("line").attr("x1", ox).attr("x2", ox + panelW).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", "#e7dfd2");
          svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top).attr("y2", bottom).attr("stroke", "#e7dfd2");
          svg.append("text").attr("x", x(t)).attr("y", bottom + 14).attr("text-anchor", "middle")
            .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(tickLabel(t));
          if (narrow || si === 0) {
            svg.append("text").attr("x", ox - 7).attr("y", y(t) + 3.5).attr("text-anchor", "end")
              .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(tickLabel(t));
          }
        });

        // equal-performance diagonal
        svg.append("line").attr("x1", x(1.05)).attr("y1", y(1.05)).attr("x2", x(-0.05)).attr("y2", y(-0.05))
          .attr("stroke", "#6b6258").attr("stroke-width", 1.2).attr("stroke-dasharray", "5 4");

        // corner labels: above the diagonal = better as a senior
        svg.append("text").attr("x", ox + 8).attr("y", top + 14).attr("font-size", narrow ? 9.5 : 10.5)
          .attr("font-weight", 600).attr("fill", "#8a7d6e").text("Better senior career");
        svg.append("text").attr("x", ox + panelW - 8).attr("y", bottom - 8).attr("text-anchor", "end")
          .attr("font-size", narrow ? 9.5 : 10.5).attr("font-weight", 600).attr("fill", "#8a7d6e").text("Better U23 career");

        // axis titles
        svg.append("text").attr("x", ox + panelW / 2).attr("y", bottom + tickH + 14).attr("text-anchor", "middle")
          .attr("font-size", narrow ? 10.5 : 11.5).attr("fill", "#62594f").text("Best U23 finish (top x% of the field)");
        if (narrow || si === 0) {
          svg.append("text").attr("transform", `translate(${narrow ? 11 : 14},${top + panelH / 2}) rotate(-90)`)
            .attr("text-anchor", "middle").attr("font-size", narrow ? 10.5 : 11.5).attr("fill", "#62594f")
            .text(narrow ? "Best senior finish (top x%)" : "Best later senior finish (top x% of the field)");
        }

        // points, biggest first so small ones stay visible
        const rows = data[sex].slice().sort((a, b) => (b[4] + b[5]) - (a[4] + a[5]));
        const plot = svg.append("g");
        rows.forEach(d => {
          const [name, u, uPos, s, nU, nS] = d;
          const c = plot.append("circle").attr("cx", x(u)).attr("cy", y(s)).attr("r", r(nU + nS))
            .attr("fill", COLORS[sex]).attr("fill-opacity", 0.55)
            .attr("stroke", COLORS[sex]).attr("stroke-width", 1)
            .attr("tabindex", 0).attr("role", "img")
            .attr("aria-label", `${name}: best U23 finish ${pct(u)}, best senior finish ${pct(s)}, ${nU + nS} appearances`);
          const html = `<strong>${name}</strong><br>Best U23: ${pct(u)} (position ${uPos})<br>` +
            `Best senior: ${pct(s)}<br>${nU} U23 + ${nS} senior race${nS === 1 ? "" : "s"}`;
          const tip = event => RTN.showTip(html, event);
          c.on("pointerenter pointermove", tip).on("pointerleave", () => RTN.hideTip())
            .on("focus", () => { const b = c.node().getBoundingClientRect(); tip({ clientX: b.left + b.width / 2, clientY: b.top }); })
            .on("blur", () => RTN.hideTip());
        });

        // call out the biggest improvers
        rows.filter(isImprover).forEach(d => {
          const [name, u, , s, nU, nS] = d, [dx, dy] = OFFSETS[name] || [-18, -22];
          const px = x(u), py = y(s), tx = px + dx, ty = py + dy;
          svg.append("line").attr("x1", px).attr("y1", py).attr("x2", tx).attr("y2", ty + (dy < 0 ? 3 : -9))
            .attr("stroke", INK).attr("stroke-width", 0.8);
          svg.append("text").attr("x", tx).attr("y", ty).attr("text-anchor", "end")
            .attr("font-size", narrow ? 9.5 : 10.5).attr("font-weight", 600).attr("fill", INK)
            .style("paint-order", "stroke").style("stroke", "var(--bg, #fbf8f3)").style("stroke-width", "3px")
            .text(name);
        });
      });
    });
  }

  function u23Legend(el) {
    if (!el) return;
    el.innerHTML = "";
    const legend = d3.select(el).append("div").attr("class", "legend");
    legend.append("span").attr("class", "legend-item").style("font-weight", 500).text("Total appearances");
    const r = d3.scaleSqrt().domain([2, 9]).range([3, 8.5]);
    [2, 4, 6, 8].forEach(n => {
      const item = legend.append("span").attr("class", "legend-item");
      const d = Math.round(r(n) * 2);
      item.append("i").style("background", "#9a8f82").style("opacity", 0.6)
        .style("width", d + "px").style("height", d + "px").style("border-radius", "50%").style("display", "inline-block");
      item.append("span").text(n);
    });
  }

  RTN.u23Chart = u23Chart;
  RTN.u23Legend = u23Legend;
})();

/* Run the Numbers — "Biggest improvers" arrow chart.
   Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const COLORS = { Men: "#23608f", Women: "#c2512f" };
  const GREY = "#8c857b", INK = "#2d2823";

  function improversChart(el, data, options = {}) {
    if (!el || !data) return;
    const sexes = ["Men", "Women"];

    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 560, pad = narrow ? 10 : 16;
      const labelW = narrow ? Math.min(106, width * 0.3) : 132;
      const leftLab = narrow ? 44 : 64, rightLab = narrow ? 46 : 68;
      const rowH = narrow ? 26 : 28, stripH = 26, tickH = 20, blockGap = 14, titleH = 28;
      const x0 = pad + labelW + leftLab, x1 = width - pad - rightLab;
      const x = d3.scaleLinear().domain([155, 0]).range([x0, x1]); // better finishes to the right
      const ticks = [150, 100, 50, 0];

      const blocks = sexes.map(s => ({ sex: s, h: stripH + data[s].length * rowH + tickH }));
      const height = blocks.reduce((s, b) => s + b.h, 0) + blockGap * (blocks.length - 1) + titleH;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "For each athlete, their first and best finishing positions at the National Cross Country Championships");

      const lab = (p, yr) => narrow ? `#${p} ’${String(yr).slice(-2)}` : `#${p} (${yr})`;

      let oy = 0;
      blocks.forEach(({ sex, h }) => {
        const color = COLORS[sex], rows = data[sex];
        const top = oy + stripH, bottom = top + rows.length * rowH;

        svg.append("text").attr("x", pad).attr("y", oy + 16).attr("font-weight", 700)
          .attr("font-size", narrow ? 12.5 : 14).attr("fill", INK).text(sex);

        ticks.forEach(t => {
          svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", top).attr("y2", bottom).attr("stroke", "#e7dfd2");
          svg.append("text").attr("x", x(t)).attr("y", bottom + 15).attr("text-anchor", "middle")
            .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(t);
        });

        rows.forEach(([name, p0, y0, p1, y1], i) => {
          const cy = top + i * rowH + rowH / 2, g = svg.append("g");
          g.append("text").attr("x", pad).attr("y", cy + 3.5).attr("font-size", narrow ? 10.5 : 11.5)
            .attr("fill", "#62594f").text(name);
          g.append("line").attr("x1", x(p0)).attr("x2", x(p1) - 5).attr("y1", cy).attr("y2", cy)
            .attr("stroke", color).attr("stroke-width", 2.4);
          g.append("path").attr("d", `M${x(p1)},${cy} l-8,-4.5 l0,9 z`).attr("fill", color);
          g.append("circle").attr("cx", x(p0)).attr("cy", cy).attr("r", 4).attr("fill", GREY);
          g.append("text").attr("x", x(p0) - 9).attr("y", cy + 3).attr("text-anchor", "end")
            .attr("font-size", narrow ? 9 : 10).attr("fill", "#74695e").text(lab(p0, y0));
          g.append("text").attr("x", x(p1) + 9).attr("y", cy + 3.2)
            .attr("font-size", narrow ? 9.5 : 10.5).attr("font-weight", 700).attr("fill", INK).text(lab(p1, y1));

          const html = `<strong>${name}</strong><br>First: #${p0} (${y0})<br>Best: #${p1} (${y1})<br>` +
            `${p0 - p1} places higher`;
          const hit = g.append("rect").attr("x", pad).attr("y", cy - rowH / 2).attr("width", width - pad * 2)
            .attr("height", rowH).attr("fill", "transparent").attr("tabindex", 0).attr("role", "img")
            .attr("aria-label", `${name}: first championship ${p0}th in ${y0}, best ${p1}th in ${y1}`);
          const tip = event => RTN.showTip(html, event);
          hit.on("pointerenter pointermove", tip).on("pointerleave", () => RTN.hideTip())
            .on("focus", () => { const r = hit.node().getBoundingClientRect(); tip({ clientX: r.left + r.width / 2, clientY: r.top }); })
            .on("blur", () => RTN.hideTip());
        });
        oy += h + blockGap;
      });

      svg.append("text").attr("x", (x0 + x1) / 2).attr("y", height - 6).attr("text-anchor", "middle")
        .attr("font-size", narrow ? 11 : 12).attr("fill", "#62594f").text("Finishing position (better to the right)");
    });
  }

  function improversLegend(el) {
    if (!el) return;
    el.innerHTML = "";
    const legend = d3.select(el).append("div").attr("class", "legend");
    [["First championship", GREY], ["Best championship (men)", COLORS.Men], ["Best championship (women)", COLORS.Women]]
      .forEach(([label, color]) => {
        const item = legend.append("span").attr("class", "legend-item");
        item.append("i").style("background", color);
        item.append("span").text(label);
      });
  }

  RTN.improversChart = improversChart;
  RTN.improversLegend = improversLegend;
})();

/* Run the Numbers — "The ever-presents" finishing-position heatmap.
   Requires D3 v7 and charts.js (RTN.responsive, showTip, hideTip). */
(function () {
  const INK = "#2d2823";
  const BUCKETS = [
    { key: "podium", label: "Podium", max: 3,        fill: "#d3ad35", text: "#3a2f05" },
    { key: "top10",  label: "4–10",   max: 10,       fill: "#1a6f6a", text: "#ffffff" },
    { key: "top20",  label: "11–20",  max: 20,       fill: "#4fa196", text: "#ffffff" },
    { key: "top40",  label: "21–40",  max: 40,       fill: "#a8d3cb", text: INK },
    { key: "rest",   label: "41+",    max: Infinity, fill: "#e6e3de", text: INK }
  ];
  const bucket = p => BUCKETS.find(b => p <= b.max);

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function everPresentChart(el, data, options = {}) {
    if (!el || !data) return;
    const years = data.years, nCols = years.length, sexes = ["Men", "Women"];

    RTN.responsive(el, width => {
      el.innerHTML = "";
      const narrow = width < 520, side = width >= 840, pad = narrow ? 10 : 16, gap = 28;
      const labelW = narrow ? Math.min(104, width * 0.29) : 128;
      const rowH = narrow ? 23 : 26, stripH = 26, axisH = 22, blockGap = 14, yearGap = 8;
      const panelW = side ? (width - pad * 2 - gap) / 2 : width - pad * 2;
      const cw = (panelW - labelW - yearGap) / nCols;

      const panels = [];
      let yCursor = 0;
      sexes.forEach((sex, si) => {
        const h = stripH + data[sex].length * rowH + axisH;
        panels.push({ sex, ox: pad + (side ? si * (panelW + gap) : 0), oy: side ? 0 : yCursor, h });
        yCursor += h + blockGap;
      });
      const height = (side ? Math.max(...panels.map(p => p.h)) : yCursor - blockGap) + 4;

      const svg = d3.select(el).append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "auto")
        .attr("role", "img")
        .attr("aria-label", options.aria || "Heatmap of finishing positions at each National Cross Country Championship for the athletes with the most appearances");

      panels.forEach(({ sex, ox, oy }) => {
        const rows = data[sex], top = oy + stripH;
        const cx = i => ox + labelW + i * cw + (i >= 4 ? yearGap : 0);

        svg.append("text").attr("x", ox + labelW + (panelW - labelW) / 2).attr("y", oy + 16).attr("text-anchor", "middle")
          .attr("font-weight", 700).attr("font-size", narrow ? 12.5 : 14).attr("fill", INK).text(sex);

        years.forEach((yr, i) => {
          svg.append("text").attr("x", cx(i) + cw / 2).attr("y", top + rows.length * rowH + 15).attr("text-anchor", "middle")
            .attr("font-size", narrow ? 10 : 11).attr("fill", "#74695e").text(String(yr).slice(-2));
        });

        rows.forEach(([name, finishes], r) => {
          const y = top + r * rowH, count = finishes.filter(v => v != null).length;
          const label = svg.append("text").attr("x", ox + labelW - 8).attr("y", y + rowH / 2 + 3.5).attr("text-anchor", "end")
            .attr("font-size", narrow ? 10.5 : 11.5).attr("fill", "#62594f").text(name);

          finishes.forEach((pos, i) => {
            if (pos == null) return;
            const b = bucket(pos), g = svg.append("g");
            const rect = g.append("rect").attr("x", cx(i) + 1).attr("y", y + 1).attr("width", cw - 2).attr("height", rowH - 2)
              .attr("rx", 2).attr("fill", b.fill).attr("tabindex", 0).attr("role", "img")
              .attr("aria-label", `${name}, ${years[i]}: ${ordinal(pos)}`);
            if (cw >= 20) {
              g.append("text").attr("x", cx(i) + cw / 2).attr("y", y + rowH / 2 + 3.5).attr("text-anchor", "middle")
                .attr("font-size", narrow ? 9 : 10).attr("fill", b.text).attr("pointer-events", "none").text(pos);
            }
            const html = `<strong>${name}</strong><br>${years[i]}: ${ordinal(pos)}${pos <= 3 ? " (podium)" : ""}<br>` +
              `${count} of ${nCols} championships`;
            const tip = event => { label.attr("font-weight", 700).attr("fill", INK); RTN.showTip(html, event); };
            const off = () => { label.attr("font-weight", null).attr("fill", "#62594f"); RTN.hideTip(); };
            rect.on("pointerenter pointermove", tip).on("pointerleave", off)
              .on("focus", () => { const bb = rect.node().getBoundingClientRect(); tip({ clientX: bb.left + bb.width / 2, clientY: bb.top }); })
              .on("blur", off);
          });
        });
      });
    });
  }

  function everPresentLegend(el) {
    if (!el) return;
    el.innerHTML = "";
    const legend = d3.select(el).append("div").attr("class", "legend");
    legend.append("span").attr("class", "legend-item").style("font-weight", 500).text("Finish");
    BUCKETS.forEach(b => {
      const item = legend.append("span").attr("class", "legend-item");
      item.append("i").style("background", b.fill).style("border-radius", "2px");
      item.append("span").text(b.label);
    });
  }

  RTN.everPresentChart = everPresentChart;
  RTN.everPresentLegend = everPresentLegend;
})();
