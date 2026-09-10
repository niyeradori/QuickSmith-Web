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

The solver, the chart and the tests were rebuilt through 2026. Nothing about how
the program is used has changed, and there is still no build step: it is static
files, served as-is. No jQuery, no math.js, no Chart.js, no bundler. Open
`index.html` and it runs.

### Under the hood

- **`engine.js`**: the whole of QuickSmith's mathematics as pure functions over
  plain data. No DOM and no external library; it runs on `Math` plus about forty
  lines of complex arithmetic. Everything cascades as ABCD matrices, so a lumped
  part, a stub and a transmission line share one code path.
- **`smith.js`**: the chart, as SVG. Crisp at any zoom, pinch and pan, two
  palettes (dark by default, light on the toggle), and one coloured arc per
  component so the path from the load to Zin is attributable element by element.
- **`plot.js`, `symbols.js`, `ui.js`**: the response graph, the component
  artwork and the dialogs, all written here rather than pulled in. The component
  symbols are vectors now instead of bitmaps. FileSaver.js is the one library
  left, and only because saving a file from a page is still awkward.

### Using it

- **Drag tuning**: grab a node on the chart and pull it. A part can only move
  its node along its own locus, so a series element slides round its constant
  resistance circle and a shunt element round its constant conductance circle.
  The engine solves for the value that puts the node under your finger.
- **The next move**: a live hint under the chart naming the one or two parts
  that would take the current Zin to Z0, updated as you edit.
- **Automatic matching**: the `Auto-match to 50 Ω` button lists every
  two-element network that takes the load to Z0, with its loaded Q, and applies
  the one you choose. Ask for a particular Q and you get Pi and T networks too,
  which have the third element needed to hit it.
- **Guided examples**: `Help → Guided examples` rebuilds one of the worked
  designs a part at a time, saying what each part does and why. Every number in
  the narration is re-solved by the test suite, so the prose cannot drift away
  from what the tool computes.
- **Undo and redo**: `Cmd/Ctrl+Z` and `Shift+Cmd/Ctrl+Z`, over the whole design.
  A drag is one undo, not one per pointer move, and a guided example is one undo
  for the whole tour.
- **Microstrip and coax**: `Data → Microstrip and coax` reads the ladder back as
  board dimensions. Give it the substrate and every transmission line is listed
  with its track width and its physical length, which are the two numbers you
  need to actually build the thing.

### Getting data in and out

- **Touchstone**: `.s1p` and `.s2p` import and export, so measurements from a
  network analyser go straight in. Samples in `touchstone/`.
- **Share links**: `File → Copy Share Link` puts the whole design in a URL, so
  an answer on a forum can be the working circuit instead of a screenshot.
- **Export**: the chart as PNG or as vector SVG, `Print Chart` for a light copy
  on paper whatever the screen is set to, and the sweep as CSV with impedance,
  VSWR and return loss worked out per point.

### Running the tests

```sh
./tests/run.sh
```

No toolchain required: it uses Node if you have it, and otherwise the
JavaScriptCore shell that ships with macOS.

The main suite comes from the worked examples in `help/examples/examples/`, and
its expected values were derived from an independent model of the ladder rather
than captured from this program's own output. Alongside it are suites for the
chart geometry, the response plot, the component symbols, Touchstone parsing,
share links, drag tuning, the guided examples, undo and redo, and the microstrip
and coax models. Published 50 Ω track widths for FR-4, RO4350B, RT/duroid 5880
and alumina are pinned there, so a wrong formula fails rather than merely
disagreeing with itself. See `tests/README.md`.

`tests/index.html` runs the main suite in a browser and shows every check.
Serve the repo over HTTP for it (`python3 -m http.server 8000`, then open
`http://localhost:8000/tests/`), since it fetches the `.sch` fixtures. The
smaller suites listed above are headless only, so `./tests/run.sh` is the one
that covers everything.

Nathan Iyer

KJ6FOJ

July 31st, 2017

email: niyer@sbcglobal.net


