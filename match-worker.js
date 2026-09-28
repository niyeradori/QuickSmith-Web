/*
 * The broadband search, off the main thread.
 *
 * optimise() solves the ladder a few hundred thousand times for a six
 * topology run, which is a second or two. On the main thread that is a second
 * or two of frozen page, no progress and no way to give up. Here the page
 * stays live and the search can be abandoned by terminating the worker.
 *
 * This works only because engine.js and match.js touch neither the DOM nor
 * window; there is a test whose whole job is to keep that true.
 */
importScripts("engine.js", "match.js");

onmessage = function (e) {
    var job = e.data;
    try {
        var out = QSMatch.optimise({
            network: job.network,
            band: job.band,
            topologies: job.topologies,
            bounds: job.bounds,
            restarts: job.restarts,
            onProgress: function (p) { postMessage({ progress: p }); }
        });
        // what no network of any complexity could beat, for context
        out.feasibility = QSMatch.feasibility(job.network, job.band);
        postMessage({ done: out });
    } catch (err) {
        postMessage({ error: (err && err.message) || String(err) });
    }
};
