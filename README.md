# QuickSmith-Web
QuickSmith-Web (https://niyeradori.github.io/QuickSmith-Web/index.html) - Runs on Chrome, Safari and Firefox both in Web and Mobile.

This is a web and mobile version of the MS Windows based QuickSmith - https://github.com/niyeradori/quicksmith.
The primary motivation of this port is in response to the numerous requests from users, who are unable to run QuickSmith 
in the newer Windows Operating Systems. I hope that by making QuickSmith independent of Operating System, it can be "future proofed".

About QuickSmith:

QuickSmith is a Smith Chart based linear circuit simulation program.
Some of the features offered by this program are listed below:
- Ladder network, elements are loaded using drag drop method.
- Open and Save functions for schematic files
- Impedance matching
- Frequency/component sweep
- Load impedance interpolation/extrapolation for frequency dependent loads 
- Q factors taken into account for network components
- Amplifier design/analysis using gain/noise circles
- Insertion loss and S21 graphs
- Transmission line parameter calculations
- Constant Conductance, VSWR and Q circles
- Import and Export of data files
- Help files with solved examples of network matching and amplifier design


## Recent work

The solver, the chart and the tests were rebuilt in 2026. Nothing about how the
program is used has changed, and there is still no build step: it is static
files, served as-is.

- **`engine.js`** — the whole of QuickSmith's mathematics as pure functions over
  plain data. No DOM, no jQuery, no external library; it runs on `Math` plus
  about forty lines of complex arithmetic. Everything cascades as ABCD matrices,
  so a lumped part, a stub and a transmission line share one code path.
- **`smith.js`** — the chart, as SVG. Crisp at any zoom, pinch and pan,
  two palettes (light and dark), and one coloured arc per component so the path
  from the load to Zin is attributable element by element.
- **Touchstone** — `.s1p` / `.s2p` import and export, so measurements from a
  network analyser go straight in. Samples in `touchstone/`.
- **Share links** — `File → Copy Share Link` puts the whole design in a URL.
- **Automatic matching** — `Match` lists every two-element network that takes
  the load to Z0, with its loaded Q, and applies the one you choose.

### Running the tests

```sh
./tests/run.sh
```

No toolchain required: it uses Node if you have it, and otherwise the
JavaScriptCore shell that ships with macOS. There is a browser runner at
`tests/index.html` (serve over HTTP). Every case comes from one of the worked
examples in `help/examples/examples/`, and the expected values were derived from
an independent model of the ladder rather than captured from this program's own
output. See `tests/README.md`.

Nathan Iyer

KJ6FOJ

July 31st, 2017

email: niyer@sbcglobal.net


