#!/usr/bin/env python3
"""
Generate a controlled library of dipoles with NEC, as Touchstone files.

    pip install necpp
    python3 generate_antennas.py

Experimental design. Two things govern how hard an antenna is to match across
a band, and they are confounded if you are careless:

  Q            set here by wire radius. A thin wire is a high-Q antenna and
               the Bode-Fano bound punishes it. Radius is swept over 100:1.
  bandwidth    set here as a fraction of centre frequency.

To stop "how far off resonance is it" contaminating the comparison, every band
is centred on that antenna's own resonance, found by bisection. So each cell of
the grid is the same question asked of a different antenna: match me over this
fractional bandwidth, centred where I resonate.

The NEC model was validated first: a 1 m free-space dipole of 1 mm radius
resonates at 143.42 MHz, 0.956 of the half-wave frequency, showing 71.85 ohms.
Textbook values for a thin half-wave dipole are about 0.95 and 73 ohms.
"""
import os, cmath, necpp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "antenna_library")
LENGTH = 1.0                      # metres; only sets the frequency scale
RADII  = [0.0002, 0.001, 0.005, 0.020]          # metres, 100:1 span
FBWS   = [0.10, 0.25, 0.50]                     # fraction of centre frequency
POINTS = 61

def dipole_Z(f_mhz, radius_m, length_m=LENGTH, segs=21):
    ctx = necpp.nec_create()
    h = length_m/2.0
    necpp.nec_wire(ctx, 1, segs, -h,0,0, h,0,0, radius_m, 1.0, 1.0)
    necpp.nec_geometry_complete(ctx, 0)
    necpp.nec_fr_card(ctx, 0, 1, f_mhz, 0)
    necpp.nec_ex_card(ctx, 0, 1, (segs+1)//2, 0, 1.0, 0,0,0,0,0)
    necpp.nec_xq_card(ctx, 0)
    z = complex(necpp.nec_impedance_real(ctx,0), necpp.nec_impedance_imag(ctx,0))
    necpp.nec_delete(ctx)
    return z

def resonance(radius_m, lo=80.0, hi=220.0):
    """Lowest frequency where the reactance crosses zero."""
    for _ in range(50):
        mid = (lo+hi)/2
        if dipole_Z(mid, radius_m).imag < 0: lo = mid
        else: hi = mid
    return (lo+hi)/2

def antenna_Q(radius_m, f0):
    """Q from the reactance slope at resonance: Q = (f0/2R) dX/df."""
    h = f0*0.005
    z0 = dipole_Z(f0, radius_m)
    slope = (dipole_Z(f0+h, radius_m).imag - dipole_Z(f0-h, radius_m).imag)/(2*h)
    return (f0/(2*z0.real))*slope

def vswr(z):
    g = abs((z-50)/(z+50))
    return (1+g)/(1-g) if g < 1 else 999

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        if old.endswith(".s1p"): os.remove(os.path.join(OUT, old))

    print("Controlled dipole library. Band centred on each antenna's resonance.\n")
    print(f"  {'file':34} {'radius':>8} {'f0 MHz':>8} {'Q':>7} {'FBW':>6} {'bare worst':>11}")
    index = []
    for a in RADII:
        f0 = resonance(a)
        Q  = antenna_Q(a, f0)
        for fbw in FBWS:
            lo, hi = f0*(1-fbw/2), f0*(1+fbw/2)
            step = (hi-lo)/(POINTS-1)
            rows = [(lo+i*step, dipole_Z(lo+i*step, a)) for i in range(POINTS)]
            worst = max(vswr(z) for _, z in rows)
            name = f"dipole_r{int(a*1e4):03d}_fbw{int(fbw*100):02d}.s1p"
            with open(os.path.join(OUT, name), "w") as fh:
                fh.write(f"! Free-space dipole, {LENGTH} m, {a*1000:.1f} mm radius\n")
                fh.write(f"! resonance {f0:.2f} MHz, antenna Q {Q:.1f}, "
                         f"fractional bandwidth {fbw:.0%}\n")
                fh.write("! generated with NEC via necpp\n# MHZ S MA R 50\n")
                for fr, z in rows:
                    g = (z-50)/(z+50)
                    fh.write(f"  {fr:9.4f}  {abs(g):.6f}  "
                             f"{cmath.phase(g)*180/cmath.pi:9.4f}\n")
            index.append((name, a, f0, Q, fbw, worst))
            print(f"  {name:34} {a*1000:6.1f}mm {f0:8.2f} {Q:7.1f} {fbw:6.0%} {worst:11.2f}")
    print(f"\n{len(index)} cases written to {OUT}")
