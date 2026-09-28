import cmath, math, random, os

HERE = os.path.dirname(os.path.abspath(__file__))
MEAS = os.path.join(HERE, "measured")

def read(path):
    out=[]; unit=1.0; fmt='RI'
    for line in open(os.path.join(MEAS, path) if not os.path.isabs(path)
                     and not os.path.exists(path) else path):
        s=line.strip()
        if not s or s.startswith('!'): continue
        if s.startswith('#'):
            t=s.upper().split(); unit={'HZ':1e-6,'KHZ':1e-3,'MHZ':1.0,'GHZ':1e3}[t[1]]; fmt=t[3]; continue
        p=s.split(); f=float(p[0])*unit; a,b=float(p[1]),float(p[2])
        g = complex(a,b) if fmt=='RI' else a*cmath.exp(1j*b*math.pi/180)
        if abs(g) >= 1.0: g = g/abs(g)*0.9995      # measurement noise, clamp to passive
        out.append((f, 50*(1+g)/(1-g)))
    return out

def band_of(data, fc, fbw, n=41):
    lo,hi = fc*(1-fbw/2), fc*(1+fbw/2)
    fs=[lo+(hi-lo)*i/(n-1) for i in range(n)]
    xs=[f for f,_ in data]
    out=[]
    for f in fs:                                   # linear interpolation on Z
        k=max(i for i in range(len(xs)-1) if xs[i]<=f)
        t=(f-xs[k])/(xs[k+1]-xs[k])
        out.append((f, data[k][1]+(data[k+1][1]-data[k][1])*t))
    return out

def vswr(z):
    g=abs((z-50)/(z+50)); return (1+g)/(1-g) if g<1 else 999.0
def W(f): return 2*math.pi*f*1e6
def stubY(Zs,th,f,f0): return 1/(1j*Zs*math.tan(th*(f/f0)*math.pi/180))
def rot(z,Zl,th,f,f0):
    b=th*(f/f0)*math.pi/180
    return Zl*(z+1j*Zl*math.tan(b))/(Zl+1j*z*math.tan(b))

def T1(p,f,za,f0):
    L,Zs,th=p; return 1/(1/(za+1j*W(f)*L*1e-9)+stubY(Zs,th,f,f0))
def T2(p,f,za,f0):
    L,Zs,th,L2=p
    return 1/(1/(za+1j*W(f)*L*1e-9)+stubY(Zs,th,f,f0))+1j*W(f)*L2*1e-9
def T3(p,f,za,f0):
    L,Zs1,th1,Zl,thl,Zs2,th2=p
    z1=1/(1/(za+1j*W(f)*L*1e-9)+stubY(Zs1,th1,f,f0))
    return 1/(1/rot(z1,Zl,thl,f,f0)+stubY(Zs2,th2,f,f0))
TOP=[("L + stub",T1,[(1,150),(5,200),(20,170)]),
     ("L + stub + series L",T2,[(1,150),(5,200),(20,170),(0,150)]),
     ("L + stub + LINE + stub",T3,[(1,150),(5,200),(20,170),(10,150),(5,170),(5,200),(20,170)])]

def nelder(cost,x0,step,it=1200):
    n=len(x0); pts=[list(x0)]+[[x0[j]+(step[i] if i==j else 0) for j in range(n)] for i in range(n)]
    vals=[cost(p) for p in pts]
    for _ in range(it):
        o=sorted(range(len(pts)),key=lambda i:vals[i]); pts=[pts[i] for i in o]; vals=[vals[i] for i in o]
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
    b=min(range(len(pts)),key=lambda i:vals[i]); return pts[b],vals[b]

def optimise(fn,bounds,pts,f0,restarts=25,seed=3):
    rng=random.Random(seed)
    def cost(p):
        if any(v<lo or v>hi for v,(lo,hi) in zip(p,bounds)): return 999.0
        try:
            w=0.0
            for f,za in pts:
                v=vswr(fn(p,f,za,f0))
                if v>w: w=v
                if w>=999: break
            return w
        except Exception: return 999.0
    step=[(hi-lo)*0.12 for lo,hi in bounds]; best=None
    for _ in range(restarts):
        x0=[rng.uniform(lo,hi) for lo,hi in bounds]
        p,v=nelder(cost,x0,step)
        if best is None or v<best[1]: best=(p,v)
    return best

HP=read("75mm_HP8753.s1p"); NV=read("75MM_NanoVNA.s1p")
for fc,fbw in ((916,0.20),(916,0.40)):
    print(f"\n=== band {fc} MHz, {fbw:.0%} wide "
          f"({fc*(1-fbw/2):.0f} to {fc*(1+fbw/2):.0f} MHz)")
    for label,data in (("HP 8753",HP),("NanoVNA",NV)):
        pts=band_of(data,fc,fbw)
        bare=max(vswr(z) for _,z in pts)
        print(f"  {label}   bare worst VSWR {bare:.3f}")
        for name,fn,b in TOP:
            p,v=optimise(fn,b,pts,fc)
            vals=", ".join(f"{x:.2f}" for x in p)
            print(f"      {name:24} {v:7.3f}   {vals}")
