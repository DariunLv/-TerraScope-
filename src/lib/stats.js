/* Estadística de tendencias (ESM). */


  function lgamma(x) {
    var g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
    var s = 1.000000000190015;
    for (var i = 0; i < 6; i++) { y += 1; s += g[i] / y; }
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x) {
    var FP = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FP) d = FP; d = 1 / d; var h = d;
    for (var m = 1; m <= 300; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FP) d = FP; c = 1 + aa / c; if (Math.abs(c) < FP) c = FP; d = 1 / d;
      var del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  /* p bilateral de la t de Student */
  function pT(t, df) { return ibeta(df / (df + t * t), df / 2, 0.5); }
  function tCrit(df) { var lo = 0, hi = 80; for (var i = 0; i < 70; i++) { var m = (lo + hi) / 2; if (pT(m, df) > 0.05) lo = m; else hi = m; } return (lo + hi) / 2; }
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  function pZ(z) { return erfc(Math.abs(z) / Math.SQRT2); }

  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function median(sorted) { var n = sorted.length; if (!n) return NaN; return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2; }

  function mannKendall(y) {
    var n = y.length, S = 0, i, j;
    for (i = 0; i < n - 1; i++) for (j = i + 1; j < n; j++) { var d = y[j] - y[i]; if (d > 0) S++; else if (d < 0) S--; }
    var cnt = {}; for (i = 0; i < n; i++) cnt[y[i]] = (cnt[y[i]] || 0) + 1;
    var tie = 0; for (var k in cnt) { var t = cnt[k]; if (t > 1) tie += t * (t - 1) * (2 * t + 5); }
    var vs = (n * (n - 1) * (2 * n + 5) - tie) / 18;
    var z = S > 0 ? (S - 1) / Math.sqrt(vs) : S < 0 ? (S + 1) / Math.sqrt(vs) : 0;
    return { n: n, S: S, varS: vs, Z: z, p: pZ(z), tau: S / (0.5 * n * (n - 1)) };
  }

  /* Pendiente de Sen (por unidad de x) con IC 95 % (Gilbert) */
  function senSlope(x, y, varS) {
    var n = y.length, sl = [], i, j;
    for (i = 0; i < n - 1; i++) for (j = i + 1; j < n; j++) { var dx = x[j] - x[i]; if (dx !== 0) sl.push((y[j] - y[i]) / dx); }
    var a = Float64Array.from(sl).sort(), N = a.length;
    var slope = median(a);
    var res = new Float64Array(n); for (i = 0; i < n; i++) res[i] = y[i] - slope * x[i];
    var intercept = median(res.sort());
    var C = 1.959964 * Math.sqrt(varS), m1 = (N - C) / 2, m2 = (N + C) / 2;
    var lo = a[Math.min(N - 1, Math.max(0, Math.round(m1) - 1))], hi = a[Math.min(N - 1, Math.max(0, Math.round(m2 + 1) - 1))];
    return { slope: slope, intercept: intercept, ci: [lo, hi] };
  }

  function ols(x, y) {
    var n = x.length, xb = mean(x), yb = mean(y), sxx = 0, sxy = 0, i;
    for (i = 0; i < n; i++) { sxx += (x[i] - xb) * (x[i] - xb); sxy += (x[i] - xb) * (y[i] - yb); }
    var slope = sxy / sxx, icpt = yb - slope * xb, sse = 0;
    for (i = 0; i < n; i++) { var e = y[i] - (icpt + slope * x[i]); sse += e * e; }
    var df = n - 2, se = Math.sqrt(sse / df / sxx), t = slope / se, p = se === 0 ? (slope === 0 ? 1 : 0) : pT(t, df), tc = tCrit(df);
    return { n: n, slope: slope, intercept: icpt, se: se, t: t, df: df, p: p, ci: [slope - tc * se, slope + tc * se] };
  }

  function lag1(y) {
    var m = mean(y), num = 0, den = 0, i;
    for (i = 0; i < y.length; i++) { den += (y[i] - m) * (y[i] - m); if (i < y.length - 1) num += (y[i] - m) * (y[i + 1] - m); }
    return den === 0 ? 0 : num / den;
  }

  /* Mann-Kendall con prewhitening sin tendencia (Yue et al., 2002) */
  function tfpw(x, y) {
    var n = y.length, mk0 = mannKendall(y), s = senSlope(x, y, mk0.varS), b = s.slope, i;
    var d = new Array(n); for (i = 0; i < n; i++) d[i] = y[i] - b * x[i];
    var r1 = lag1(d), thr = 1.959964 / Math.sqrt(n);
    if (Math.abs(r1) <= thr) return { applied: false, r1: r1, p: mk0.p, Z: mk0.Z, S: mk0.S };
    var y2 = []; for (i = 1; i < n; i++) y2.push(d[i] - r1 * d[i - 1] + b * x[i]);
    var m2 = mannKendall(y2);
    return { applied: true, r1: r1, p: m2.p, Z: m2.Z, S: m2.S };
  }

  /* Pettitt: punto de cambio más probable */
  function pettitt(y) {
    var n = y.length, U = 0, K = 0, kt = 0, t, j;
    for (t = 0; t < n; t++) {
      var V = 0; for (j = 0; j < n; j++) { var d = y[t] - y[j]; V += d > 0 ? 1 : d < 0 ? -1 : 0; }
      U += V; if (Math.abs(U) > K) { K = Math.abs(U); kt = t; }
    }
    return { K: K, index: kt, p: Math.min(1, 2 * Math.exp(-6 * K * K / (Math.pow(n, 3) + n * n))) };
  }

  /* pts: [{year, month(0-11), x, v}] */
  function deseason(pts) {
    var sum = new Array(12).fill(0), cnt = new Array(12).fill(0), i;
    for (i = 0; i < pts.length; i++) { sum[pts[i].month] += pts[i].v; cnt[pts[i].month]++; }
    return pts.map(function (p) { return p.v - sum[p.month] / cnt[p.month]; });
  }
  function annual(pts, series) {
    var by = {}, i;
    for (i = 0; i < pts.length; i++) { (by[pts[i].year] = by[pts[i].year] || { y: [], r: [] }); by[pts[i].year].y.push(series[i]); by[pts[i].year].r.push(pts[i].v); }
    var years = [], ya = [], raw = [];
    Object.keys(by).map(Number).sort(function (a, b) { return a - b; }).forEach(function (yr) {
      if (by[yr].y.length >= 9) { years.push(yr); ya.push(mean(by[yr].y)); raw.push(mean(by[yr].r)); }
    });
    return { years: years, y: ya, raw: raw };
  }
  function rolling(y, w) { var out = [], s = 0; for (var i = 0; i < y.length; i++) { s += y[i]; if (i >= w) s -= y[i - w]; out.push(i >= w - 1 ? s / w : null); } return out; }

  function analyze(pts, opts) {
    opts = opts || {};
    var ds = opts.deseason !== false, n = pts.length;
    if (n < 24) throw new Error('short');
    var x = pts.map(function (p) { return p.x; });
    var y = ds ? deseason(pts) : pts.map(function (p) { return p.v; });
    var mk = mannKendall(y), sen = senSlope(x, y, mk.varS), o = ols(x, y), tf = tfpw(x, y);
    var pm = tf.applied ? tf.p : mk.p;
    var ann = annual(pts, y), A = null;
    if (ann.years.length >= 8) {
      var amk = mannKendall(ann.y), asn = senSlope(ann.years, ann.y, amk.varS), aol = ols(ann.years, ann.y);
      A = { years: ann.years, y: ann.y, raw: ann.raw, mk: amk, sen: asn, ols: aol };
    }
    var pet = null;
    if (A && A.years.length >= 10) {
      var pe = pettitt(A.y), k = pe.index + 1;
      pet = { p: pe.p, year: A.years[pe.index], before: mean(A.raw.slice(0, k)), after: mean(A.raw.slice(k)), sig: pe.p < 0.05 };
    }
    var dir = sen.slope >= 0 ? 1 : -1, tests = [
      { id: 'mk', p: pm, sign: Math.sign(mk.S) },
      { id: 'mkAnnual', p: A ? A.mk.p : NaN, sign: A ? Math.sign(A.mk.S) : 0 },
      { id: 'ols', p: o.p, sign: Math.sign(o.slope) }
    ];
    var count = 0, valid = 0;
    tests.forEach(function (t) { if (!isNaN(t.p)) { valid++; t.sig = t.p < 0.05 && t.sign === dir; if (t.sig) count++; } else t.sig = false; });
    var level = count >= 3 ? 'strong' : count === 2 ? 'likely' : count === 1 ? 'weak' : 'none';
    if (valid < 3 && count === valid && count > 0) level = count >= 2 ? 'likely' : 'weak';
    return {
      n: n, x: x, y: y, v: pts.map(function (p) { return p.v; }), pts: pts, deseason: ds,
      mk: mk, sen: sen, ols: o, tfpw: tf, p: pm, Z: tf.applied ? tf.Z : mk.Z,
      annual: A, pettitt: pet, tests: tests, count: count, level: level, dir: dir,
      slope: sen.slope, perDec: sen.slope * 10, mean: mean(pts.map(function (p) { return p.v; })),
      span: x[n - 1] - x[0], roll: rolling(y, 12)
    };
  }


export { analyze, mannKendall, senSlope, ols, tfpw, pettitt, lag1, pT, pZ, deseason, mean };
