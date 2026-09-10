# Blog plan for the QuickSmith launch

Thirteen posts, grouped by what each is worth for launch SEO. The ranking comes
from reasoning about search intent, not from measured volume, so treat it as a
starting order rather than data. Check the terms against a keyword tool before
committing to the tier.

Two rules for every post:

1. **End with a live circuit.** `File > Copy Share Link` puts a whole design in
   a URL, so each post can close with "open this exact circuit in QuickSmith".
   That is the thing no PDF app note can do, and it is what will make people
   link back.
2. **Every number gets solved first.** The same rule the guided tours follow.
   If a post claims 3.08 mm or 53 dB, put it through the solver and, where it
   matters, pin it in `tests/`. Prose drifts away from code otherwise.

---

## Tier 1: before the announcement

### 1. How to match an antenna to 50 ohms on a Smith chart
Target: "how to use a smith chart", "impedance matching smith chart".
The flagship explainer. Load, get onto the constant-R circle through the
centre, use the last element to slide to the middle. Shows the next-move hint
and Auto-match. Evergreen, and the post other people link to.

### 2. 50 ohm trace width on FR-4, and where that number comes from
Target: "50 ohm trace width calculator", "microstrip impedance calculator".
Probably the highest-volume query on this list, and there is now a real answer:
3.079 mm on 1.6 mm FR-4, with RO4350B, RT/duroid 5880 and alumina alongside.
All four are pinned in `tests/line.js`. Shows Data > Microstrip and coax, and
ends by turning a matching network into millimetres.

### 3. Reading a nanoVNA .s1p into a Smith chart and matching a real antenna
Target: "nanovna impedance matching", "touchstone s1p viewer".
Large hobbyist audience actively looking for a free tool that does this. Shows
Touchstone import, the frequency-dependent load, a band sweep, and CSV out.
Sample files already in `touchstone/`.

### 4. Insertion loss, return loss and mismatch loss are three different things
Target: "insertion loss vs return loss".
Perennial confusion, high intent. QuickSmith can be unusually straight here
because its insertion loss is an honest transducer loss from a Z0 source, so a
lossless network that matches its load reads exactly 0 dB. Show that check.

---

## Tier 2: strong and differentiating

### 5. L, Pi or T: choosing a matching network and what it costs in bandwidth
Target: "L network vs pi network", "matching network Q bandwidth".
Auto-match with a target Q, next to the loaded Q and the VSWR < 2 bandwidth in
the readout. Few free tools let you ask for a Q, so this one is genuinely ours.

### 6. Q circles: why your match works at one frequency and nowhere else
Target: "loaded Q matching network bandwidth".
Companion to 5, more teaching than tool. The Q circle overlay plus the response
sweep, showing the same network at two different Q values.

### 7. Single stub matching, worked end to end
Target: "single stub matching smith chart", "stub matching example".
Very common coursework query. Example 3 already is this: 10 - j15 to 50 ohms at
1 GHz with a 30 ohm series line and open stub, VSWR 1.0056.

### 8. What the Smith chart is actually showing you
Target: "smith chart explained".
Constant-R and constant-G circles, and why a series part moves you along one and
a shunt part along the other. Drag tuning is the demo: the constraint you feel
when you pull a node is the physics, not the program.

### 9. Component Q: what a real inductor does to your match
Target: "inductor Q matching network loss".
Underserved. Most free calculators assume ideal parts. QuickSmith carries a Q
per element, and a shunt part lands about 1/Q off where an ideal one would.

---

## Tier 3: narrower, high intent or strategic

### 10. Matching a 2N5642: the AN721 input and output networks
Target: "AN721", "large signal transistor matching".
Small audience, very high intent, and authentic: it is already a guided tour
with solver-verified numbers (1.94 + j1.1 ohms at 175 MHz, VSWR 1.0024,
loaded Q 10.09).

### 11. Stability circles and the gain versus noise trade-off
Target: "rollett stability factor", "gain and noise circles".
Sends traffic to the amplifier page, which otherwise gets none. Example 7 has
the K and |delta| figures.

### 12. Share a working circuit instead of a screenshot
Short post about permalinks. Low search volume, but it changes behaviour:
people start posting QuickSmith links on forums and Stack Exchange, and those
are backlinks. Strategically worth more than its traffic.

### 13. A 1993 Windows program, rebuilt for the browser
The launch story. No dependencies, no build step, the solver as pure functions
over plain data, the four defects the regression suite caught, the 25 ppm
speed of light. This is the Hacker News and r/rfelectronics post. Low search
value, high link value.

---

## Where they should live

`/blog/` as static pages, sharing `docs.css` with the FAQ and the examples, so
they inherit the palette and cost nothing to maintain. Each one needs its own
title, meta description, canonical and OpenGraph tags, and an entry in
`sitemap.xml`.
