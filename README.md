# BrainRotter

A context-free grammar powered brainrot text generator. Produces coherent short-story-style prose from 2,100+ brainrot terms — grammatically structured yet completely unhinged.

Inspired by [SCIgen](https://pdos.csail.mit.edu/archive/scigen/), the academic paper generator, but for internet brainrot.

## How it works

Stories are generated using a **weighted CFG** with a **story context** that tracks recurring characters, locations, and narrative arc across paragraphs.

### Grammar

The engine produces 17 sentence types:

- **Basic**: simple, compound, complex (subject/object relative clauses), nested, compound-complex
- **Narrative**: introductions, character callbacks, consequences, transitions
- **Rhetorical**: three question forms (is/did/rhetorical), interjected, attributed
- **Sophisticated**: conditionals, comparatives, concessives, temporals, academic citations, enumerations

Each generation picks 3-5 recurring cast members and a setting, then builds paragraphs with narrative structure (opening, development, climax) so the output reads like a coherent (if deranged) short story rather than random sentences.

### Lexicon

2,100+ terms across 13 grammatical categories:

| Category | Count | Examples |
|----------|-------|---------|
| ENTITY | 347 | Skibidi Toilet, Bombardiro Crocodilo, the aura auditor |
| TV | 195 | rizzes up, mogs, catches in 4K |
| IV | 204 | is bussin, is cooked beyond repair, is aura bankrupt |
| ADJ | 330 | sigma, skibidi-coded, interdimensionally sus |
| ADV | 139 | fr fr, with surgical precision, unconstitutionally |
| PP | 165 | in Ohio, at the rizz academy, in a Google Doc with 47 editors |
| INTERJ | 196 | Sheesh!, BOMBARDIRO!, Narrator: they were cooked. |
| QWORD | 78 | What the sigma is, How in the Bombardiro Crocodilo did |
| CONJ | 59 | but wait it gets worse, because the algorithm willed it |
| REL | 55 | who canonically, which the mods deleted but we all saw |
| ASIDE | 135 | (not clickbait), (aura: DESTROYED), (bad ending) |
| ATTRIB | 85 | The Council of Sigma has determined that, NASA's Brainrot Division detected that |
| CONSEQ | 118 | and the simulation crashed, and the anime opening started playing |

The lexicon covers Skibidi Toilet, Italian brainrot, streamers, anime, looksmaxxing, aura economy, W/L culture, and general internet slang.

### Morphology

The engine handles English morphology for question formation (deconjugation of 3rd-person verbs: "rizzes" -> "rizz", "bodies" -> "body"), proper article-adjective ordering ("the goated Rizzler" not "goated the Rizzler"), and punctuation around relative clauses.

## Usage

Serve the directory with any static file server:

```
npx serve .
```

Then open in a browser. Click the button or press Space/Enter to generate. The story auto-fills to fit the viewport.

> **Note**: This uses ES modules, so opening `index.html` directly via `file://` won't work. Use any HTTP server.

## Project structure

```
index.html              HTML shell
css/style.css           Styles
js/
  lexicon.js            Barrel export
  lexicon/
    entities.js         Noun phrases (characters, archetypes)
    verbs.js            Transitive + intransitive verb phrases
    adjectives.js       Adjective modifiers
    modifiers.js        Adverbs, locations, conjunctions, relative clauses
    discourse.js        Interjections, questions, asides, attributions, consequences
  grammar.js            CFG engine + story context
  main.js               UI wiring
assets/                 Favicons
```

## Stack

Vanilla HTML/CSS/JS with ES modules. No dependencies, no build step.
