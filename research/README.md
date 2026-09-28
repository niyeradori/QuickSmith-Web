# research

Working files behind the broadband matching work: the scripts, the antenna data
they produced, and the two bench measurements. Everything here is reproducible
from what is in this directory, and nothing in the program depends on it.

The finished feature lives in `../match.js` and is reachable from the Broadband
match button once a measurement is loaded. These files are the road there, kept
because the next question will start from them.

## Data

`../touchstone/` holds the 75 mm monopole, swept 300 MHz to 1.5 GHz on two
instruments on the same afternoon: 801 points from an HP 8753C with an
S-parameter test set, and 401 points from a NanoVNA. The antenna is 75 mm of
1 mm wire through an SMA connector on a two foot square copper ground plane.

Both files contain points where the measured reflection coefficient is slightly
above one, which is impossible for a passive antenna. Every one of them is
below 624 MHz, where the antenna is electrically tiny and returns nearly
everything, and the mean excess is 1.55 percent on the 8753 and 0.30 percent on
the NanoVNA. That is ordinary calibration error where it is hardest to avoid.
The files are kept exactly as measured. Do not "fix" them: how a tool behaves
on real data that reads slightly impossible is part of what is being studied,
and QuickSmith now names those frequencies rather than silently failing.

`antenna_library/` holds twelve NEC-simulated dipoles, a factorial of four wire
radii by three fractional bandwidths, each band centred on that antenna's own
resonance. An earlier version of this library used one fixed band for every
antenna, which gave bare VSWRs as high as 1918:1 and measured "is this
hopeless" rather than "which topology wins". If you regenerate it, keep the
bands tied to each antenna's resonance.

## Scripts

Python 3, no dependencies beyond the standard library except where noted.
Paths are relative to this directory, so run them from anywhere.

| script | needs | what it does |
|---|---|---|
| `generate_antennas.py` | `pip install necpp` | Rebuilds `antenna_library/`. About a minute. |
| `run_comparison.py` | nothing | Runs the topology comparison across the twelve antennas. Produces the "new planes, not more parts" result. |
| `compare_instruments.py` | nothing | The 8753 against the NanoVNA: electrical delay, divergence by band, and the same optimiser run on both files. |
| `make_figures.py` | matplotlib | Writes the five article figures into `figures/`. Captions are in `FIGURES.md`. |
| `broadband-optimiser-prototype.py` | nothing | The standalone optimiser, written before `match.js` existed. |

The prototype is kept deliberately. The regression values in
`../tests/match.js` were derived from it rather than captured from `match.js`,
which is the only reason those tests are worth anything: a test that records
what the code already does proves the code has not changed, not that it is
right.

## Two results worth knowing before extending any of this

**Bound the impedances.** Left unconstrained the optimiser asks for stub
impedances between 6 and 10 ohms. Electrically valid, physically awkward. The
article's conclusions were re-run inside 20 to 150 ohms and survived, which is
the only reason to trust them.

**Bound the lengths against the band, not the design frequency.** A length in
degrees is degrees at whatever reference frequency is set, so a bound of 10 to
170 degrees permits multi-wavelength lines when that reference sits well below
the band. The optimiser will take them, because a long line is dispersive and
dispersion buys bandwidth. On the 75 mm monopole over 850 to 1000 MHz that
improves the in-band worst case from 1.705 to 1.486 using a 1.77 wavelength
stub, and the same network reads 35803:1 across 800 to 1050 MHz and 5.98:1 if
the lines are cut two percent long. `match.js` searches lengths in degrees at
band centre for this reason. The prototype here does not, so watch what it
hands you.
