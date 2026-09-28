#!/usr/bin/env python3
"""
Run the topology comparison across the generated antenna library.

    python3 generate_antennas.py     # first
    python3 run_comparison.py

For each antenna it optimises every topology to minimise the WORST VSWR in the
band, then reports which topology wins and by how much. The question under test
is whether adding a transmission line, which rotates you about the chart, beats
adding more lumped reactance at the same plane, which does not.

The Bode-Fano column is the theoretical floor for that antenna's Q and
bandwidth. It assumes infinitely many elements, so nothing here will reach it;
it is there to show how much is still on the table.
"""
import os, math, cmath, random, glob, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "antenna_library")

def read_case(path):
    fs, zs, meta = [], [], {}
    for line in open(path):
        line = line.strip()
        if line.startswith("!"):
            m = re.search(r"antenna Q ([\d.]+)", line)
            if m: meta["Q"] = float(m.group(1))
            m = re.search(r"fractional bandwidth (\d+)%", line)
            if m: meta["fbw"] = float(m.group(1))/100
            m = re.search(r"resonance ([\d.]+) MHz", line)
            if m: meta["f0"] = float(m.group(1))
            continue
        if line.startswith("#") or not line: continue
        f, mag, ang = (float(x) for x in line.split()[:3])
        g = mag*cmath.exp(1j*ang*math.pi/180)
        fs.append(f); zs.append(50*(1+g)/(1-g))
    return fs, zs, meta

def vswr(z):
    g = abs((z-50)/(z+50))
    return (1+g)/(1-g) if g < 1 else 999.0

def bode_fano_vswr(Q, fbw):
    """Floor on worst VSWR, assuming infinitely many matching elements."""
    gmin = math.exp(-math.pi/(Q*fbw))
    return (1+gmin)/(1-gmin)

# --------------------------------------------------------------- topologies
# Each takes (parameters, frequency in MHz, antenna Z) and returns input Z.
def W(f): return 2*math.pi*f*1e6
def stubY(Zs, th, f, f0): return 1/(1j*Zs*math.tan(th*(f/f0)*math.pi/180))
def rotate(z, Zl, th, f, f0):
    b = th*(f/f0)*math.pi/180
    return Zl*(z + 1j*Zl*math.tan(b))/(Zl + 1j*z*math.tan(b))

def T_L_stub(p, f, za, f0):
    L, Zs, th = p
    return 1/(1/(za + 1j*W(f)*L*1e-9) + stubY(Zs, th, f, f0))
def T_L_stub_L(p, f, za, f0):
    L, Zs, th, L2 = p
    return 1/(1/(za + 1j*W(f)*L*1e-9) + stubY(Zs, th, f, f0)) + 1j*W(f)*L2*1e-9
def T_L_stub_C(p, f, za, f0):
    L, Zs, th, C = p
    y = 1/(za + 1j*W(f)*L*1e-9) + stubY(Zs, th, f, f0)
    return 1/(y + 1j*W(f)*C*1e-12)
def T_L_stub_stub(p, f, za, f0):
    L, Zs1, th1, Zs2, th2 = p
    return 1/(1/(za + 1j*W(f)*L*1e-9) + stubY(Zs1,th1,f,f0) + stubY(Zs2,th2,f,f0))
def T_L_stub_line_stub(p, f, za, f0):
    L, Zs1, th1, Zl, thl, Zs2, th2 = p
    z1 = 1/(1/(za + 1j*W(f)*L*1e-9) + stubY(Zs1, th1, f, f0))
    return 1/(1/rotate(z1, Zl, thl, f, f0) + stubY(Zs2, th2, f, f0))
def T_L_C(p, f, za, f0):
    L, C = p
    return 1/(1/(za + 1j*W(f)*L*1e-9) + 1j*W(f)*C*1e-12)

L_B, Z_B, TH_B, C_B, LN_B = (1,400), (5,200), (20,170), (0.5,400), (10,150)
TOPOLOGIES = [
  ("L + shunt C (lumped)",   T_L_C,              [L_B, C_B]),
  ("L + stub",               T_L_stub,           [L_B, Z_B, TH_B]),
  ("L + stub + series L",    T_L_stub_L,         [L_B, Z_B, TH_B, (0,400)]),
  ("L + stub + shunt C",     T_L_stub_C,         [L_B, Z_B, TH_B, C_B]),
  ("L + stub + stub",        T_L_stub_stub,      [L_B, Z_B, TH_B, Z_B, TH_B]),
  ("L + stub + LINE + stub", T_L_stub_line_stub, [L_B, Z_B, TH_B, LN_B, (5,170), Z_B, TH_B]),
]

# ------------------------------------------------------------------- search
def nelder(cost, x0, step, iters=1500):
    n=len(x0)
    pts=[list(x0)]+[[x0[j]+(step[i] if i==j else 0) for j in range(n)] for i in range(n)]
    vals=[cost(p) for p in pts]
    for _ in range(iters):
        o=sorted(range(len(pts)), key=lambda i: vals[i])
        pts=[pts[i] for i in o]; vals=[vals[i] for i in o]
        if abs(vals[-1]-vals[0])<1e-7: break
        cen=[sum(p[i] for p in pts[:-1])/n for i in range(n)]
        ref=[cen[i]+(cen[i]-pts[-1][i]) for i in range(n)]; fr=cost(ref)
        if fr<vals[0]:
            ex=[cen[i]+2*(cen[i]-pts[-1][i]) for i in range(n)]; fe=cost(ex)
            pts[-1],vals[-1]=(ex,fe) if fe<fr else (ref,fr)
        elif fr<vals[-2]: pts[-1],vals[-1]=ref,fr
        else:
            co=[cen[i]+0.5*(pts[-1][i]-cen[i]) for i in range(n)]; fc=cost(co)
            if fc<vals[-1]: pts[-1],vals[-1]=co,fc
            else:
                for i in range(1,len(pts)):
                    pts[i]=[(pts[i][j]+pts[0][j])/2 for j in range(n)]; vals[i]=cost(pts[i])
    b=min(range(len(pts)), key=lambda i: vals[i])
    return pts[b], vals[b]

def optimise(fn, bounds, fs, zs, f0, restarts=18, seed=5):
    rng = random.Random(seed)
    def cost(p):
        if any(v<lo or v>hi for v,(lo,hi) in zip(p,bounds)): return 999.0
        try:
            w=0.0
            for f,za in zip(fs,zs):
                v=vswr(fn(p,f,za,f0))
                if v>w: w=v
                if w>=999: break
            return w
        except (ZeroDivisionError, OverflowError, ValueError):
            return 999.0
    step=[(hi-lo)*0.12 for lo,hi in bounds]
    best=None
    for _ in range(restarts):
        x0=[rng.uniform(lo,hi) for lo,hi in bounds]
        p,v=nelder(cost,x0,step)
        if best is None or v<best[1]: best=(p,v)
    return best

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(OUT, "*.s1p")))
    print("Worst VSWR in band after optimisation. Lower is better.\n")
    hdr = f"{'antenna':22} {'Q':>5} {'FBW':>5} {'bare':>7} " + \
          " ".join(f"{n.split('(')[0].strip()[:13]:>14}" for n,_,_ in TOPOLOGIES) + \
          f" {'Bode-Fano':>10}"
    print(hdr); print("-"*len(hdr))
    rows=[]
    for path in files:
        fs, zs, meta = read_case(path)
        f0 = meta.get("f0", sum(fs)/len(fs))
        bare = max(vswr(z) for z in zs)
        res=[]
        for name, fn, bounds in TOPOLOGIES:
            p, v = optimise(fn, bounds, fs, zs, f0)
            res.append(v)
        bf = bode_fano_vswr(meta["Q"], meta["fbw"])
        rows.append((os.path.basename(path), meta, bare, res, bf))
        print(f"{os.path.basename(path)[:22]:22} {meta['Q']:5.1f} {meta['fbw']:5.0%} "
              f"{bare:7.2f} " + " ".join(f"{v:14.3f}" for v in res) + f" {bf:10.3f}")

    print("\n" + "="*70)
    print("Does a LINE beat extra lumped reactance at the same plane?\n")
    wins = 0
    for name, meta, bare, res, bf in rows:
        best_lumped = min(res[2], res[3], res[4])     # +series L, +shunt C, +stub
        line = res[5]
        gain = (best_lumped-line)/best_lumped*100
        if line < best_lumped - 1e-6: wins += 1
        print(f"  {name[:26]:26} best lumped 3rd {best_lumped:7.3f}   "
              f"with a line {line:7.3f}   {gain:+6.1f}%")
    print(f"\n  the line wins in {wins} of {len(rows)} cases")
