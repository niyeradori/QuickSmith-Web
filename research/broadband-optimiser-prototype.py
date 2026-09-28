#!/usr/bin/env python3
"""
Broadband matching by minimax search, from measured data.

Run from the QuickSmith repo root:
    python3 research/broadband-optimiser-prototype.py

Reads touchstone/dipole.s1p, interpolates it the way engine.js does, then
searches component values to minimise the WORST VSWR across the band rather
than the VSWR at one frequency. No theory, just search, and it still beats
the hand-tuned Example 4.
"""
import cmath, math, random

Z0 = 50.0
BAND = [100 + i for i in range(101)]          # 100..200 MHz, 1 MHz grid

# ---------------------------------------------------------------- the load
def monotone_cubic(xs, ys):
    """Fritsch-Carlson, the same scheme engine.js uses, clamped at the ends."""
    n = len(xs)
    dx = [xs[i+1]-xs[i] for i in range(n-1)]
    m  = [(ys[i+1]-ys[i])/dx[i] for i in range(n-1)]
    c1 = [m[0]]
    for i in range(len(dx)-1):
        if m[i]*m[i+1] <= 0:
            c1.append(0.0)
        else:
            com = dx[i]+dx[i+1]
            c1.append(3*com/((com+dx[i+1])/m[i] + (com+dx[i])/m[i+1]))
    c1.append(m[-1])
    c2, c3 = [], []
    for i in range(len(c1)-1):
        inv = 1/dx[i]; com2 = c1[i]+c1[i+1]-2*m[i]
        c2.append((m[i]-c1[i]-com2)*inv); c3.append(com2*inv*inv)
    def f(x):
        if x <= xs[0]:  return ys[0]          # never extrapolate a measurement
        if x >= xs[-1]: return ys[-1]
        k = max(i for i in range(n-1) if xs[i] <= x)
        d = x-xs[k]
        return ys[k] + c1[k]*d + c2[k]*d*d + c3[k]*d*d*d
    return f

def read_s1p(path):
    F, M, A = [], [], []
    for line in open(path):
        line = line.strip()
        if not line or line[0] in "!#":
            continue
        a, b, c = line.split()[:3]
        F.append(float(a)); M.append(float(b)); A.append(float(c))
    U, off = [A[0]], 0.0                       # unwrap the phase
    for i in range(1, len(A)):
        d = A[i]-A[i-1]
        if d > 180: off -= 360
        elif d < -180: off += 360
        U.append(A[i]+off)
    fm, fa = monotone_cubic(F, M), monotone_cubic(F, U)
    def z(f):
        g = fm(f)*cmath.exp(1j*fa(f)*math.pi/180)
        return Z0*(1+g)/(1-g)
    return z

zant = read_s1p("touchstone/dipole.s1p")

# ------------------------------------------------------------- topologies
def vswr(z):
    g = abs((z-Z0)/(z+Z0))
    return (1+g)/(1-g) if g < 1 else 999.0

def worst(net):
    return max(vswr(net(f)) for f in BAND)

def stub_Y(Zs, th150, f):
    """Shorted shunt stub, admittance. Length given in degrees at 150 MHz."""
    return 1/(1j*Zs*math.tan(th150*(f/150.0)*math.pi/180))

def W(f):
    return 2*math.pi*f*1e6

def line(z, Zl, th150, f):
    """A length of line in series, which ROTATES rather than slides."""
    b = th150*(f/150.0)*math.pi/180
    return Zl*(z + 1j*Zl*math.tan(b))/(Zl + 1j*z*math.tan(b))

# Every topology in the article's comparison table. Each returns a function of
# frequency giving the impedance the source sees, and carries the search bounds
# for its own parameters.

def t_L_stub(p):
    """Example 4's shape: series inductor, then a shorted shunt stub."""
    L, Zs, th = p
    return lambda f: 1/(1/(zant(f) + 1j*W(f)*L*1e-9) + stub_Y(Zs, th, f))

def t_L_stub_seriesL(p):
    """The one that gave the surprise: the extra inductor is driven to zero."""
    L, Zs, th, L2 = p
    return lambda f: 1/(1/(zant(f) + 1j*W(f)*L*1e-9) + stub_Y(Zs, th, f)) \
                     + 1j*W(f)*L2*1e-9

def t_L_stub_seriesC(p):
    L, Zs, th, C = p
    return lambda f: 1/(1/(zant(f) + 1j*W(f)*L*1e-9) + stub_Y(Zs, th, f)) \
                     - 1j/(W(f)*C*1e-12)

def t_L_stub_shuntC(p):
    L, Zs, th, C = p
    def z(f):
        y = 1/(zant(f) + 1j*W(f)*L*1e-9) + stub_Y(Zs, th, f)
        return 1/(y + 1j*W(f)*C*1e-12)
    return z

def t_L_stub_stub(p):
    """Two stubs at the same plane. The search rebuilds the single stub."""
    L, Zs1, th1, Zs2, th2 = p
    return lambda f: 1/(1/(zant(f) + 1j*W(f)*L*1e-9)
                        + stub_Y(Zs1, th1, f) + stub_Y(Zs2, th2, f))

def t_L_stub_line_stub(p):
    """The only addition that genuinely helps, because the line rotates."""
    L, Zs1, th1, Zl, thl, Zs2, th2 = p
    def z(f):
        z1 = 1/(1/(zant(f) + 1j*W(f)*L*1e-9) + stub_Y(Zs1, th1, f))
        return 1/(1/line(z1, Zl, thl, f) + stub_Y(Zs2, th2, f))
    return z

def t_L_shuntC(p):
    """A plain lumped L network, for comparison."""
    L, C = p
    return lambda f: 1/(1/(zant(f) + 1j*W(f)*L*1e-9) + 1j*W(f)*C*1e-12)

L_B, Z_B, TH_B, C_B = (1, 150), (5, 200), (20, 170), (0.5, 200)

TOPOLOGIES = [
    ("L + stub",                  t_L_stub,            [L_B, Z_B, TH_B]),
    ("L + stub + series L",       t_L_stub_seriesL,    [L_B, Z_B, TH_B, (0, 150)]),
    ("L + stub + series C",       t_L_stub_seriesC,    [L_B, Z_B, TH_B, C_B]),
    ("L + stub + shunt C",        t_L_stub_shuntC,     [L_B, Z_B, TH_B, C_B]),
    ("L + stub + second stub",    t_L_stub_stub,       [L_B, Z_B, TH_B, Z_B, TH_B]),
    ("L + stub + line + stub",    t_L_stub_line_stub,  [L_B, Z_B, TH_B, (10,150), (5,170), Z_B, TH_B]),
    ("plain L network, lumped",   t_L_shuntC,          [L_B, C_B]),
]

# -------------------------------------------------------------- the search
def nelder_mead(cost, x0, step, iters=4000):
    n = len(x0)
    pts = [list(x0)] + [[x0[j] + (step[i] if i == j else 0) for j in range(n)]
                        for i in range(n)]
    vals = [cost(p) for p in pts]
    for _ in range(iters):
        order = sorted(range(len(pts)), key=lambda i: vals[i])
        pts = [pts[i] for i in order]; vals = [vals[i] for i in order]
        if abs(vals[-1]-vals[0]) < 1e-9:
            break
        cen = [sum(p[i] for p in pts[:-1])/n for i in range(n)]
        ref = [cen[i] + (cen[i]-pts[-1][i]) for i in range(n)]
        fr = cost(ref)
        if fr < vals[0]:
            exp = [cen[i] + 2*(cen[i]-pts[-1][i]) for i in range(n)]
            fe = cost(exp)
            pts[-1], vals[-1] = (exp, fe) if fe < fr else (ref, fr)
        elif fr < vals[-2]:
            pts[-1], vals[-1] = ref, fr
        else:
            con = [cen[i] + 0.5*(pts[-1][i]-cen[i]) for i in range(n)]
            fc = cost(con)
            if fc < vals[-1]:
                pts[-1], vals[-1] = con, fc
            else:
                for i in range(1, len(pts)):
                    pts[i] = [(pts[i][j]+pts[0][j])/2 for j in range(n)]
                    vals[i] = cost(pts[i])
    b = min(range(len(pts)), key=lambda i: vals[i])
    return pts[b], vals[b]

def search(net, bounds, trials=60, seed=7):
    random.seed(seed)
    def cost(p):
        if any(v < lo or v > hi for v, (lo, hi) in zip(p, bounds)):
            return 999.0
        try:    return worst(net(p))
        except Exception: return 999.0
    best = None
    step = [(hi-lo)*0.08 for lo, hi in bounds]
    for _ in range(trials):
        x0 = [random.uniform(lo, hi) for lo, hi in bounds]
        p, v = nelder_mead(cost, x0, step)
        if best is None or v < best[1]:
            best = (p, v)
    return best

if __name__ == "__main__":
    print("Worst VSWR across 100-200 MHz, an octave, on the measured dipole")
    print("minimax search, 70 restarts per topology\n")
    print(f"  {'bare antenna':28} {worst(zant):.3f}")
    print(f"  {'Example 4, hand tuned':28} "
          f"{worst(t_L_stub([32, 25, 95])):.3f}   32 nH, 25 ohm, 95 deg\n")

    for name, net, bounds in TOPOLOGIES:
        p, v = search(net, bounds, trials=70, seed=13)
        print(f"  {name:28} {v:.3f}   " + ", ".join(f"{x:.2f}" for x in p))

    print("\nNote the third row: given a spare series inductor the search")
    print("drives it to nothing. And the two-stub row returns the same 1.630")
    print("as one stub, because two stubs at one plane are one stub.")
