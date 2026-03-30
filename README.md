# BrainRotter

A context-free grammar powered brainrot text generator. Produces grammatically structured yet completely unhinged internet brainrot prose.

## How it works

Sentences are generated using a **weighted CFG** inspired by [SCIgen](https://pdos.csail.mit.edu/archive/scigen/). The grammar produces 11 sentence types (simple, compound, complex with subject/object relative clauses, attributed, interjected, three question forms, compound-complex, and nested) from a lexicon of 1,000+ brainrot terms spanning the Among Us era through Italian brainrot.

The engine handles English morphology for question formation (smart deconjugation of 3rd-person verbs), proper article-adjective ordering, and comma placement around relative clauses and conjunctions.

## Usage

Open `index.html` in a browser. Click the button or press Space/Enter to generate. The text auto-fills to fit the viewport.

## Stack

Single-file vanilla HTML/CSS/JS. No dependencies, no build step.
