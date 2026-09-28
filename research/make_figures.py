#!/usr/bin/env python3
"""
Generate the article's figures from the measured files.

    pip install matplotlib numpy necpp
    python3 make_figures.py

Written for print: every series is distinguished by line style as well as
colour, so the figures survive being reproduced in greyscale.
"""
import os, cmath, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
MEAS = os.path.join(HERE, "..", "touchstone")   # the sample files live there
FIGS = os.path.join(HERE, "figures")
os.makedirs(FIGS, exist_ok=True)

plt.rcParams.update({
    "font.size": 9, "axes.labelsize": 9, "axes.titlesize": 10,
    "legend.fontsize": 8, "xtick.labelsize": 8, "ytick.labelsize": 8,
    "axes.grid": True, "grid.alpha": 0.3, "grid.linewidth": 0.5,
    "figure.dpi": 110, "savefig.dpi": 300, "savefig.bbox": "tight",
})

def read_s1p(path):
    fs, gs = [], []
    unit, fmt = 1.0, "RI"
    for line in open(path):
        s = line.strip()
        if not s or s.startswith("!"): continue
        if s.startswith("#"):
            t = s.upper().split()
            unit = {"HZ":1e-6,"KHZ":1e-3,"MHZ":1.0,"GHZ":1e3}[t[1]]
            fmt = t[3]; continue
        p = s.split()
        f = float(p[0])*unit
        a, b = float(p[1]), float(p[2])
        g = complex(a,b) if fmt=="RI" else a*cmath.exp(1j*b*math.pi/180)
        fs.append(f); gs.append(g)
    return np.array(fs), np.array(gs)

def Z(g):  return 50*(1+g)/(1-g)
def vswr(g):
    m = np.minimum(np.abs(g), 0.9995)
    return (1+m)/(1-m)

hp_f, hp_g = read_s1p(os.path.join(MEAS, "75mm_HP8753.s1p"))
nv_f, nv_g = read_s1p(os.path.join(MEAS, "75MM_NanoVNA.s1p"))
hp_z, nv_z = Z(hp_g), Z(nv_g)

# ---- NEC prediction of the same antenna, for the validation figure
def nec_curve():
    try:
        import necpp
    except ImportError:
        return None, None
    fs = np.arange(300, 1501, 5.0); zs = []
    for f in fs:
        ctx = necpp.nec_create()
        necpp.nec_wire(ctx,1,21,0,0,0,0,0,0.075,0.0005,1.0,1.0)
        necpp.nec_geometry_complete(ctx,1)
        necpp.nec_gn_card(ctx,1,0,0,0,0,0,0,0)
        necpp.nec_fr_card(ctx,0,1,float(f),0)
        necpp.nec_ex_card(ctx,0,1,1,0,1.0,0,0,0,0,0)
        necpp.nec_xq_card(ctx,0)
        zs.append(complex(necpp.nec_impedance_real(ctx,0),
                          necpp.nec_impedance_imag(ctx,0)))
        necpp.nec_delete(ctx)
    return fs, np.array(zs)
nec_f, nec_z = nec_curve()

# ============================================ Figure 1: model against object
fig, ax = plt.subplots(2, 1, figsize=(6.0, 5.4), sharex=True)
if nec_f is not None:
    ax[0].plot(nec_f, nec_z.real, "k:",  lw=1.6, label="NEC model")
    ax[1].plot(nec_f, nec_z.imag, "k:",  lw=1.6, label="NEC model")
ax[0].plot(hp_f, hp_z.real, "-",  color="#1f5fbf", lw=1.3, label="HP 8753C")
ax[0].plot(nv_f, nv_z.real, "--", color="#b5342b", lw=1.1, label="NanoVNA")
ax[1].plot(hp_f, hp_z.imag, "-",  color="#1f5fbf", lw=1.3)
ax[1].plot(nv_f, nv_z.imag, "--", color="#b5342b", lw=1.1)
ax[1].axhline(0, color="0.4", lw=0.8)
for a in ax: a.axvspan(900, 1500, color="0.85", alpha=0.45, zorder=0)
ax[0].set_ylabel("Resistance, ohms"); ax[0].set_ylim(0, 260)
ax[1].set_ylabel("Reactance, ohms");  ax[1].set_ylim(-400, 400)
ax[1].set_xlabel("Frequency, MHz");   ax[1].set_xlim(300, 1500)
ax[0].legend(loc="upper left", framealpha=0.95)
ax[0].set_title("75 mm monopole: an idealised model against two real instruments\n"
                "(all three agree closely until about 1 GHz, shaded thereafter)")
fig.savefig(os.path.join(FIGS, "fig1_model_vs_measured.png"))
plt.close(fig)

# ============ Figure 2: the instruments differ steadily, and why it matters
fig, ax = plt.subplots(2, 1, figsize=(6.0, 5.4),
                       gridspec_kw={"height_ratios":[3,2]}, sharex=True)
ax[0].semilogy(hp_f, vswr(hp_g), "-",  color="#1f5fbf", lw=1.4, label="HP 8753C")
ax[0].semilogy(nv_f, vswr(nv_g), "--", color="#b5342b", lw=1.2, label="NanoVNA")
ax[0].axvspan(850, 1000, color="#1f7a52", alpha=0.13, zorder=0)
ax[0].annotate("850 to 1000 MHz, the band matched below:\nthe two designs agree to 0.5%",
               xy=(925, 2.0), xytext=(1090, 1.35), fontsize=7.5, color="#1f7a52",
               arrowprops=dict(arrowstyle="->", color="#1f7a52", lw=0.8))
ax[0].set_ylabel("VSWR"); ax[0].set_ylim(1, 60)
ax[0].legend(loc="upper center", ncol=2, framealpha=0.95)
ax[0].set_title("Same antenna, two instruments")

nvg = np.interp(hp_f, nv_f, nv_g.real) + 1j*np.interp(hp_f, nv_f, nv_g.imag)
dg  = np.abs(nvg - hp_g)
ax[1].plot(hp_f, dg, "-", color="#8d3a9b", lw=1.3)
ax[1].fill_between(hp_f, 0, dg, color="#8d3a9b", alpha=0.15)
ax[1].axvspan(850, 1000, color="#1f7a52", alpha=0.13, zorder=0)
ax[1].set_ylabel("difference in\n|gamma| between them")
ax[1].set_xlabel("Frequency, MHz"); ax[1].set_xlim(650, 1500)
ax[1].set_ylim(0, 0.42)
ax[1].annotate("no cliff: the disagreement\ngrows steadily with frequency",
               xy=(1250, 0.22), xytext=(950, 0.33), fontsize=7.5, color="#8d3a9b",
               arrowprops=dict(arrowstyle="->", color="#8d3a9b", lw=0.8))
fig.savefig(os.path.join(FIGS, "fig2_instrument_divergence.png"))
plt.close(fig)

# ========== Figure 3: why the same error matters more at high VSWR
fig, ax = plt.subplots(figsize=(5.6, 3.4))
g = np.linspace(0.05, 0.93, 400)
v = (1+g)/(1-g)
err = 0.08                                   # typical difference between the two
v_hi = (1+np.minimum(g+err,0.999))/(1-np.minimum(g+err,0.999))
ax.semilogy(v, v_hi-v, "-", color="#b5342b", lw=1.6)
ax.set_xlabel("VSWR being measured")
ax.set_ylabel("error in VSWR produced by\na 0.08 error in |gamma|")
ax.set_xlim(1, 20); ax.set_ylim(0.1, 100)
for mark, lab in ((2.58,"870 to 960 MHz"), (3.66,"850 to 1000 MHz"),
                  (7.46,"800 to 1100 MHz")):
    ax.axvline(mark, color="0.45", ls=":", lw=1.0)
    ax.annotate(lab, xy=(mark, 0.14), rotation=90, fontsize=7.2,
                color="0.35", ha="right", va="bottom")
ax.text(2.1, 42, "614 to 1500 MHz sits at VSWR 668,\nfar off the right of this plot",
        fontsize=7.2, color="0.35", ha="left", va="center")
ax.set_title("The same measurement error, judged at different mismatches")
fig.savefig(os.path.join(FIGS, "fig3_vswr_sensitivity.png"))
plt.close(fig)
print("figures 1, 2 and 3 written")

# ================= Figure 4: what the optimised network does to the antenna
def stubY(Zs, th, f, f0): return 1/(1j*Zs*np.tan(th*(f/f0)*np.pi/180))
def rot(z, Zl, th, f, f0):
    b = th*(f/f0)*np.pi/180
    return Zl*(z + 1j*Zl*np.tan(b))/(Zl + 1j*z*np.tan(b))
def W(f): return 2*np.pi*f*1e6

F0 = 925.0                                  # band centre, and the length reference
band = (hp_f >= 850) & (hp_f <= 1000)
fb, zb = hp_f[band], hp_z[band]

# the two designs the optimiser returned from the 8753 data
# Both from QuickSmith's own search, impedances constrained to 20-150 ohms so
# that the answer is something you could fabricate.
def net_Lstub(f, za):                       # 1.000 nH; stub 20.00 ohm / 87.77 deg
    return 1/(1/(za + 1j*W(f)*1.0000e-9) + stubY(20.0000, 87.7718, f, F0))
def net_line(f, za):                        # 1.035 nH; 32.53/110.92; 25.46/135.20; 73.63/129.80
    z1 = 1/(1/(za + 1j*W(f)*1.0348e-9) + stubY(32.5349, 110.9239, f, F0))
    return 1/(1/rot(z1, 25.4614, 135.1990, f, F0) + stubY(73.6296, 129.7956, f, F0))

def v_of(z):
    g = np.abs((z-50)/(z+50)); g = np.minimum(g, 0.9995)
    return (1+g)/(1-g)

fig, ax = plt.subplots(figsize=(6.0, 3.8))
ax.plot(fb, v_of(zb),            "-",  color="0.35",    lw=1.6, label="bare antenna")
ax.plot(fb, v_of(net_Lstub(fb, zb)), "--", color="#b26a00", lw=1.5,
        label="L + stub (worst 2.29)")
ax.plot(fb, v_of(net_line(fb, zb)),  "-",  color="#1f5fbf", lw=1.8,
        label="L + stub + line + stub (worst 1.74)")
ax.axhline(2.0, color="#b5342b", ls=":", lw=1.2)
ax.annotate("VSWR 2", xy=(855, 2.06), fontsize=7.5, color="#b5342b")
ax.set_xlabel("Frequency, MHz"); ax.set_ylabel("VSWR")
ax.set_xlim(850, 1000); ax.set_ylim(1, 6)
ax.legend(loc="upper center", framealpha=0.95)
ax.set_title("Measured 75 mm monopole, matched across 850 to 1000 MHz\n"
             "(networks designed from the 8753C data)")
fig.savefig(os.path.join(FIGS, "fig4_matched_result.png"))
plt.close(fig)

# ========== Figure 5: new planes against more parts, the simulation study
labels = ["shunt C at\nthe stub's node", "second stub at\nthe stub's node",
          "series L after\nthe stub", "line, then\na second stub"]
means  = [-0.2, -0.0, 52.5, 60.5]
colors = ["0.65", "0.65", "#1f5fbf", "#1f7a52"]
fig, ax = plt.subplots(figsize=(6.0, 3.6))
bars = ax.bar(range(4), means, color=colors, width=0.62, edgecolor="0.25", lw=0.7)
for i, (b, m) in enumerate(zip(bars, means)):
    ax.annotate(f"{m:+.1f}%", xy=(i, m + (2.5 if m > 0 else 2.5)),
                ha="center", fontsize=9, weight="bold")
ax.axhline(0, color="0.2", lw=1.0)
ax.set_xticks(range(4)); ax.set_xticklabels(labels, fontsize=7.8)
ax.set_ylabel("mean improvement over\nthe two-element network")
ax.set_ylim(-8, 84)
ax.plot([-0.35, 1.35], [72, 72], color="0.45", lw=1.2)
ax.text(0.5, 74, "SAME PLANE as the existing stub\nno gain at all",
        ha="center", fontsize=8.5, color="0.45", style="italic")
ax.plot([1.65, 3.35], [72, 72], color="#1f5fbf", lw=1.2)
ax.text(2.5, 74, "A NEW PLANE\nlarge gain", ha="center", fontsize=8.5,
        color="#1f5fbf", weight="bold")
ax.set_title("Twelve simulated antennas: where a third component earns its place")
fig.savefig(os.path.join(FIGS, "fig5_new_planes.png"))
plt.close(fig)
print("figures 4 and 5 written")
