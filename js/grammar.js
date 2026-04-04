// =============================================================
//  CFG ENGINE — SCIgen-inspired weighted productions
//
//  Generates coherent short-story-style brainrot prose with:
//    - Recurring characters (referenced across sentences)
//    - Paragraph structure with topic shifts
//    - Narrative arc: setup → development → consequence
//    - SCIgen-style attribution and aside injection
// =============================================================

import { lexicon as B } from './lexicon.js';

// ---- Core utilities ----

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function maybe(fn, p = 0.4) { return Math.random() < p ? fn() : ''; }
function oneOf(...fns) {
    const weights = fns.map(f => f.w || 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < fns.length; i++) {
        r -= weights[i];
        if (r <= 0) return fns[i]();
    }
    return fns[fns.length - 1]();
}
function w(fn, weight) { fn.w = weight; return fn; }

// ---- Story context ----
// Tracks recurring characters and themes for coherent cross-references

class StoryContext {
    constructor() {
        // Pick 3-5 recurring characters for this generation
        this.cast = this._pickUnique(B.ENTITY, 3 + Math.floor(Math.random() * 3));
        // Track which characters have been introduced
        this.introduced = new Set();
        // Pick a recurring location (used sparingly for cohesion)
        this.location = pick(B.PP);
        this.sentenceCount = 0;
    }

    _pickUnique(arr, n) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(n, arr.length));
    }

    // Get a character — biased toward recurring cast members
    character() {
        if (Math.random() < 0.6 && this.cast.length > 0) {
            const c = pick(this.cast);
            this.introduced.add(c);
            return c;
        }
        return pick(B.ENTITY);
    }

    // Get the protagonist (first cast member)
    protagonist() {
        const p = this.cast[0];
        this.introduced.add(p);
        return p;
    }

    // Get a secondary character (not the protagonist)
    secondary() {
        if (this.cast.length > 1) {
            const s = this.cast[1 + Math.floor(Math.random() * (this.cast.length - 1))];
            this.introduced.add(s);
            return s;
        }
        return pick(B.ENTITY);
    }

    // Reference an already-introduced character
    callback() {
        if (this.introduced.size > 0) {
            return pick([...this.introduced]);
        }
        return this.character();
    }

    // Get the recurring location (sometimes)
    place() {
        return Math.random() < 0.2 ? this.location : pick(B.PP);
    }

    tick() { this.sentenceCount++; }
}

// ---- NP with article handling ----

function NP_raw(entity) {
    const adj = maybe(() => pick(B.ADJ), 0.25);
    if (!adj) return entity;
    const articleMatch = entity.match(/^(the |a |an )/i);
    if (articleMatch) {
        const article = articleMatch[1];
        const rest = entity.slice(article.length);
        return `${article}${adj} ${rest}`;
    }
    return `${adj} ${entity}`;
}

function NP(ctx) {
    return NP_raw(ctx.character());
}

// ---- Clause builders ----

function TRANS_CLAUSE(ctx) {
    const s = NP(ctx), v = pick(B.TV), o = NP(ctx);
    const pp = maybe(() => ctx.place(), 0.3);
    return pp ? `${s} ${v} ${o} ${pp}` : `${s} ${v} ${o}`;
}

function INTRANS_CLAUSE(ctx) {
    const s = NP(ctx), v = pick(B.IV);
    const pp = maybe(() => ctx.place(), 0.35);
    return pp ? `${s} ${v} ${pp}` : `${s} ${v}`;
}

function CLAUSE(ctx) {
    return oneOf(w(() => TRANS_CLAUSE(ctx), 3), w(() => INTRANS_CLAUSE(ctx), 2));
}

function VP_FRAG_TRANS(ctx) {
    const v = pick(B.TV), o = NP(ctx);
    const pp = maybe(() => ctx.place(), 0.25);
    return pp ? `${v} ${o} ${pp}` : `${v} ${o}`;
}

function VP_FRAG_INTRANS(ctx) {
    const v = pick(B.IV);
    const pp = maybe(() => ctx.place(), 0.3);
    return pp ? `${v} ${pp}` : v;
}

function VP_FRAG(ctx) {
    return oneOf(w(() => VP_FRAG_TRANS(ctx), 3), w(() => VP_FRAG_INTRANS(ctx), 2));
}

// ---- Question helpers ----

const Q_IS = [
    "Why is", "How is", "Bro why is", "Chat why is",
    "Nah why is", "Ayo how is", "Chat is", "Dawg why is",
    "Fam how is", "Wait why is", "Hold up why is",
    "What the sigma is", "What in the Ohio is",
    "What in the Skibidi Toilet is", "Why on god is",
    "Bro what in the actual brainrot is",
    "Why is no one talking about how",
];

const Q_DID = [
    "When did", "Who let", "Why did", "Where did",
    "Fr why did", "Since when did", "Bro who let",
    "Nah who let", "Ayo who let", "Bruh how did",
    "Nah fr why did", "How in the Bombardiro Crocodilo did",
    "Why in the Italian brainrot did",
    "Since when could",
];

const Q_RHETORICAL = [
    "Does anyone else think", "Can we talk about how",
    "Chat am I tweaking or is", "Is it just me or is",
    "Nah because why is", "Not gonna lie why is",
    "Chat can someone explain why",
];

function IV_BARE_IS() {
    let v = pick(B.IV);
    if (v.startsWith('is ')) return v.slice(3);
    return v;
}

function deconjWord(wd) {
    if (wd.length < 3) return wd;
    if (wd.endsWith('ies') && wd.length > 4) return wd.slice(0, -3) + 'y';
    if (wd.endsWith('es') && wd.length > 3) {
        const stripS = wd.slice(0, -1);
        const stripES = wd.slice(0, -2);
        if (/[aeiou][^aeiou]e$/i.test(stripS)) return stripS;
        return stripES;
    }
    if (wd.endsWith('s') && !wd.endsWith('ss') && !wd.endsWith('us')) {
        return wd.slice(0, -1);
    }
    return wd;
}

function deconjugateTV() {
    let tv = pick(B.TV);
    let attempts = 0;
    while (tv.startsWith('is ') && attempts++ < 5) tv = pick(B.TV);
    if (tv.startsWith('is ')) return 'mog';
    tv = tv.replace(/'[ds]\b/g, '');
    const words = tv.split(' ');
    for (let i = 0; i < words.length; i++) {
        const wd = words[i];
        if (wd.length < 3) continue;
        if (wd.endsWith('s') && !wd.endsWith('ss') && !wd.endsWith('us')) {
            words[i] = deconjWord(wd);
            break;
        }
    }
    return words.join(' ').trim();
}

// ---- Sentence-level productions ----

function S_SIMPLE(ctx) {
    const c = CLAUSE(ctx);
    const adv = maybe(() => pick(B.ADV), 0.18);
    const aside = maybe(() => pick(B.ASIDE), 0.12);
    let s = c;
    if (adv) s += `, ${adv}`;
    if (aside) s += ` ${aside}`;
    return s;
}

function S_COMPOUND(ctx) {
    const c1 = CLAUSE(ctx);
    const conj = pick(B.CONJ);
    const c2 = CLAUSE(ctx);
    const conseq = maybe(() => pick(B.CONSEQ), 0.22);
    let s = `${c1}, ${conj} ${c2}`;
    if (conseq) s += `, ${conseq}`;
    return s;
}

function S_COMPLEX_SUBJ(ctx) {
    const subj = NP(ctx);
    const rel = pick(B.REL);
    const relVP = VP_FRAG(ctx);
    const mainVP = VP_FRAG(ctx);
    return `${subj}, ${rel} ${relVP}, ${mainVP}`;
}

function S_COMPLEX_OBJ(ctx) {
    const subj = NP(ctx);
    const tv = pick(B.TV);
    const obj = NP(ctx);
    const rel = pick(B.REL);
    const relVP = VP_FRAG(ctx);
    return `${subj} ${tv} ${obj}, ${rel} ${relVP}`;
}

function S_QUESTION_IS(ctx) {
    const q = pick(Q_IS);
    const subj = NP(ctx);
    const vp = IV_BARE_IS();
    const pp = maybe(() => ctx.place(), 0.3);
    const aside = maybe(() => pick(B.ASIDE), 0.15);
    let s = `${q} ${subj} ${vp}`;
    if (pp) s += ` ${pp}`;
    if (aside) s += ` ${aside}`;
    return s + '?';
}

function S_QUESTION_DID(ctx) {
    const q = pick(Q_DID);
    const subj = NP(ctx);
    const tv = deconjugateTV();
    const obj = NP(ctx);
    const pp = maybe(() => ctx.place(), 0.25);
    let s = `${q} ${subj} ${tv} ${obj}`;
    if (pp) s += ` ${pp}`;
    return s + '?';
}

function S_QUESTION_RHET(ctx) {
    const q = pick(Q_RHETORICAL);
    const subj = NP(ctx);
    const vp = IV_BARE_IS();
    const pp = maybe(() => ctx.place(), 0.3);
    let s = `${q} ${subj} ${vp}`;
    if (pp) s += ` ${pp}`;
    return s + '?';
}

function S_ATTRIBUTED(ctx) {
    const attr = pick(B.ATTRIB);
    const clause = CLAUSE(ctx);
    const aside = maybe(() => pick(B.ASIDE), 0.18);
    return aside ? `${attr} ${clause} ${aside}` : `${attr} ${clause}`;
}

function S_INTERJECTED(ctx) {
    const interj = pick(B.INTERJ);
    const clause = CLAUSE(ctx);
    const conseq = maybe(() => pick(B.CONSEQ), 0.2);
    return conseq ? `${interj} ${clause}, ${conseq}` : `${interj} ${clause}`;
}

function S_COMPOUND_COMPLEX(ctx) {
    const c1 = CLAUSE(ctx);
    const conj = pick(B.CONJ);
    const subj2 = NP(ctx);
    const rel = pick(B.REL);
    const relVP = VP_FRAG(ctx);
    const mainVP = VP_FRAG(ctx);
    return `${c1}, ${conj} ${subj2}, ${rel} ${relVP}, ${mainVP}`;
}

function S_NESTED(ctx) {
    const c1 = CLAUSE(ctx);
    const conj = pick(B.CONJ);
    const c2 = CLAUSE(ctx);
    const conseq = pick(B.CONSEQ);
    return `${c1}, ${conj} ${c2}, ${conseq}`;
}

// ---- Sophisticated sentence types ----

// Conditional: "If X, then Y"
function S_CONDITIONAL(ctx) {
    const cond = CLAUSE(ctx);
    const result = CLAUSE(ctx);
    const opener = pick(["If", "Assuming", "In the event that", "Should it be the case that", "Given that"]);
    return `${opener} ${cond}, then ${result}`;
}

// Comparative: "X is more Y than Z"
function S_COMPARATIVE(ctx) {
    const a = NP(ctx), b = NP(ctx);
    const adj = pick(B.ADJ);
    const templates = [
        () => `${a} is objectively more ${adj} than ${b}`,
        () => `${a} clears ${b} in terms of being ${adj}`,
        () => `${a} and ${b} are both ${adj}, but ${a} is on a different level`,
        () => `experts agree that ${a} is far more ${adj} than ${b} could ever hope to be`,
        () => `the gap between ${a} and ${b} in ${adj} energy is astronomical`,
    ];
    return pick(templates)();
}

// List/enumeration: "X, Y, and Z all..."
function S_ENUMERATION(ctx) {
    const a = NP_raw(ctx.character());
    const b = NP_raw(ctx.character());
    const c = NP_raw(ctx.character());
    const vp = pick(B.IV);
    return `${a}, ${b}, and ${c} all ${vp.replace(/^is /, 'are ').replace(/^has /, 'have ')}`;
}

// Despite/contrast: "Despite X, Y"
function S_CONCESSIVE(ctx) {
    const despite = CLAUSE(ctx);
    const result = CLAUSE(ctx);
    const opener = pick([
        "Despite the fact that", "Even though", "Although",
        "In spite of the clearly documented evidence that",
        "Notwithstanding the reality that", "Regardless of the fact that",
    ]);
    return `${opener} ${despite}, ${result}`;
}

// Temporal sequence: "After X, Y happened"
function S_TEMPORAL(ctx) {
    const first = CLAUSE(ctx);
    const second = CLAUSE(ctx);
    const opener = pick([
        "After", "Shortly after", "Moments after", "In the aftermath of",
        "Following the incident where", "Not long after",
        "In the hours following the moment when",
    ]);
    return `${opener} ${first}, ${second}`;
}

// Academic/citation style: "Studies show... furthermore..."
function S_ACADEMIC(ctx) {
    const attr = pick(B.ATTRIB);
    const claim1 = CLAUSE(ctx);
    const bridge = pick([
        "Furthermore,", "Moreover,", "Additionally,", "It should also be noted that",
        "Corroborating this,", "In a related finding,", "Expanding on this discovery,",
    ]);
    const claim2 = CLAUSE(ctx);
    return `${attr} ${claim1}. ${bridge} ${claim2}`;
}

// ---- Narrative-aware sentence types ----

// Introduction: establishes the protagonist
function S_INTRO(ctx) {
    const protag = NP_raw(ctx.protagonist());
    const state = pick(B.IV);
    const place = ctx.location;
    const aside = maybe(() => pick(B.ASIDE), 0.2);
    const templates = [
        () => `${protag} ${state} ${place}`,
        () => `It all started when ${protag} ${state} ${place}`,
        () => `${place}, ${protag} ${state}`,
        () => `The story of ${protag} begins ${place}, where they ${state.replace(/^is /, 'are ')}`,
        () => `${protag} — ${pick(B.ADJ)}, ${pick(B.ADJ)}, and ${pick(B.ADJ)} — ${state} ${place}`,
    ];
    let s = pick(templates)();
    if (aside) s += ` ${aside}`;
    return s;
}

// Callback: references a previously mentioned character
function S_CALLBACK(ctx) {
    const prev = NP_raw(ctx.callback());
    return oneOf(
        w(() => {
            const v = pick(B.TV);
            const target = NP(ctx);
            return `${prev} ${v} ${target}`;
        }, 3),
        w(() => {
            const v = pick(B.IV);
            return `${prev} ${v}`;
        }, 2),
        w(() => {
            const conj = pick([
                "Meanwhile,", "At the same time,", "Elsewhere,",
                "Not to be outdone,", "In response,",
                "Sensing an opportunity,", "Having witnessed all of this,",
                "Unfazed by the previous events,",
                "In what can only be described as a power move,",
            ]);
            const v = pick(B.IV);
            const pp = maybe(() => ctx.place(), 0.3);
            return pp ? `${conj} ${prev} ${v} ${pp}` : `${conj} ${prev} ${v}`;
        }, 3),
        w(() => {
            // Reaction callback
            const reaction = pick([
                "could not believe what just happened",
                "entered their villain arc immediately",
                "started mewing aggressively",
                "simply chose violence",
                "activated goblin mode",
                "began farming aura at an unprecedented rate",
                "reconsidered their entire existence",
                "called an emergency meeting",
                "posted a cryptic Instagram story",
                "went private on all platforms",
                "started a thread about it",
                "updated their bio to reflect the trauma",
            ]);
            return `${prev} ${reaction}`;
        }, 2),
    );
}

// Consequence: wraps up a paragraph
function S_CONSEQUENCE(ctx) {
    const subj = NP_raw(ctx.callback());
    const conseq = pick(B.CONSEQ);
    const aside = maybe(() => pick(B.ASIDE), 0.25);
    const templates = [
        () => `This caused ${subj} to ${pick(["reconsider everything", "question their entire existence", "enter a new era", "lose all remaining aura", "gain unprecedented aura", "start a villain arc", "achieve final form", "unlock a hidden achievement", "file for aura bankruptcy", "invoke the sigma clause", "activate their trap card", "post a notes app apology"])}`,
        () => `The consequences for ${subj} were ${pick(B.ADJ)}, ${conseq}`,
        () => `${pick(B.ATTRIB)} ${subj} ${pick(B.IV)}, ${conseq}`,
        () => `${subj} was never the same after this, ${conseq}`,
        () => `To this day, ${subj} ${pick(B.IV)}, and historians believe it is a direct result of this incident`,
        () => `The ripple effects on ${subj} were immeasurable, ${conseq}`,
    ];
    let s = pick(templates)();
    if (aside) s += ` ${aside}`;
    return s;
}

// Transition: bridges paragraphs
function S_TRANSITION(ctx) {
    const protag = ctx.callback();
    const transitions = [
        "But the brainrot doesn't stop there.",
        "The situation was about to get significantly more unhinged.",
        "What happened next would change the timeline forever.",
        "Little did they know, the aura shift was just beginning.",
        "The plot, as they say, thickened considerably.",
        "But wait — there's more.",
        "This was merely the prologue.",
        "The lore deepened.",
        "Chapter two began without warning.",
        "The foreshadowing was about to pay off.",
        "Sources close to the situation say what followed was even worse.",
        "The group chat was not prepared for what came next.",
        "At this point the narrator considered giving up.",
        "Meanwhile, in a parallel timeline of equal brainrot —",
        "The sequel nobody asked for was already in production.",
        `But ${protag} was far from finished.`,
        `What ${protag} did next would be studied for generations.`,
        `The lore surrounding ${protag} was about to get exponentially deeper.`,
        "Scholars will debate what happened next for centuries.",
        "The following events have been reconstructed from group chat logs and security footage.",
        "What follows has been verified by multiple independent sources (trust me bro).",
    ];
    return pick(transitions);
}

// ---- Paragraph generation ----
// A paragraph is 3-6 sentences with narrative structure

function generateParagraph(ctx, type) {
    const sentences = [];

    if (type === 'opening') {
        // Opening paragraph: introduce protagonist and setting
        sentences.push(S_INTRO(ctx));
        sentences.push(oneOf(
            w(() => S_ATTRIBUTED(ctx), 3),
            w(() => S_ACADEMIC(ctx), 2),
            w(() => S_COMPOUND(ctx), 2),
        ));
        sentences.push(oneOf(
            w(() => S_COMPARATIVE(ctx), 2),
            w(() => S_COMPLEX_SUBJ(ctx), 2),
            w(() => S_SIMPLE(ctx), 2),
        ));
        if (Math.random() < 0.6) {
            sentences.push(oneOf(
                w(() => S_CALLBACK(ctx), 2),
                w(() => S_QUESTION_IS(ctx), 1),
            ));
        }
    } else if (type === 'development') {
        // Development: expand the story with callbacks and complications
        sentences.push(oneOf(
            w(() => S_CALLBACK(ctx), 3),
            w(() => S_TEMPORAL(ctx), 2),
            w(() => S_INTERJECTED(ctx), 2),
        ));
        sentences.push(oneOf(
            w(() => S_COMPOUND(ctx), 3),
            w(() => S_CONCESSIVE(ctx), 2),
            w(() => S_COMPLEX_OBJ(ctx), 2),
            w(() => S_CONDITIONAL(ctx), 1),
        ));
        sentences.push(oneOf(
            w(() => S_CALLBACK(ctx), 2),
            w(() => S_ACADEMIC(ctx), 1),
            w(() => S_SIMPLE(ctx), 2),
            w(() => S_QUESTION_DID(ctx), 1),
        ));
        if (Math.random() < 0.6) {
            sentences.push(oneOf(
                w(() => S_ENUMERATION(ctx), 2),
                w(() => S_NESTED(ctx), 2),
                w(() => S_INTERJECTED(ctx), 2),
                w(() => S_QUESTION_RHET(ctx), 1),
            ));
        }
    } else if (type === 'climax') {
        // Climax: high drama, consequences, exclamations
        sentences.push(S_INTERJECTED(ctx));
        sentences.push(oneOf(
            w(() => S_TEMPORAL(ctx), 2),
            w(() => S_COMPOUND(ctx), 2),
            w(() => S_COMPOUND_COMPLEX(ctx), 2),
            w(() => S_CONCESSIVE(ctx), 1),
        ));
        sentences.push(S_CONSEQUENCE(ctx));
        if (Math.random() < 0.5) {
            sentences.push(oneOf(
                w(() => S_QUESTION_RHET(ctx), 2),
                w(() => S_COMPARATIVE(ctx), 1),
                w(() => S_QUESTION_IS(ctx), 1),
            ));
        }
    } else {
        // Generic: mixed bag
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            sentences.push(generateSentenceRaw(ctx));
        }
    }

    return sentences.map(s => finishSentence(s));
}

// ---- Single sentence generation ----

function generateSentenceRaw(ctx) {
    // After a few sentences, bias toward callbacks for coherence
    const useCallback = ctx.sentenceCount > 2 && Math.random() < 0.3;

    ctx.tick();

    if (useCallback) {
        return S_CALLBACK(ctx);
    }

    return oneOf(
        w(() => S_SIMPLE(ctx), 14),
        w(() => S_COMPOUND(ctx), 12),
        w(() => S_COMPLEX_SUBJ(ctx), 7),
        w(() => S_COMPLEX_OBJ(ctx), 7),
        w(() => S_ATTRIBUTED(ctx), 7),
        w(() => S_INTERJECTED(ctx), 9),
        w(() => S_QUESTION_IS(ctx), 5),
        w(() => S_QUESTION_DID(ctx), 4),
        w(() => S_QUESTION_RHET(ctx), 3),
        w(() => S_COMPOUND_COMPLEX(ctx), 4),
        w(() => S_NESTED(ctx), 4),
        w(() => S_CALLBACK(ctx), 6),
        w(() => S_CONSEQUENCE(ctx), 3),
        w(() => S_CONDITIONAL(ctx), 4),
        w(() => S_COMPARATIVE(ctx), 4),
        w(() => S_CONCESSIVE(ctx), 3),
        w(() => S_TEMPORAL(ctx), 4),
        w(() => S_ACADEMIC(ctx), 3),
        w(() => S_ENUMERATION(ctx), 2),
    );
}

function finishSentence(s) {
    s = s.replace(/\s+/g, ' ').trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
}

// ---- Public API ----

// Generate a single sentence (for backward compatibility / simple mode)
export function generateSentence() {
    const ctx = new StoryContext();
    return finishSentence(generateSentenceRaw(ctx));
}

// Generate a structured story with paragraphs
// Returns an array of paragraphs, each an array of sentences
export function generateStory(targetSentences = 20) {
    const ctx = new StoryContext();
    const paragraphs = [];

    // Opening paragraph
    paragraphs.push(generateParagraph(ctx, 'opening'));

    // Development paragraphs
    let sentencesSoFar = paragraphs[0].length;
    while (sentencesSoFar < targetSentences - 5) {
        // Add transition between paragraphs sometimes
        if (Math.random() < 0.4) {
            paragraphs.push([finishSentence(S_TRANSITION(ctx))]);
            sentencesSoFar += 1;
        }

        const para = generateParagraph(ctx, 'development');
        paragraphs.push(para);
        sentencesSoFar += para.length;
    }

    // Climax paragraph
    paragraphs.push(generateParagraph(ctx, 'climax'));

    return paragraphs;
}
