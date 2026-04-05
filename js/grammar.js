// =============================================================
//  CFG ENGINE — SCIgen-inspired weighted productions
//
//  Generates short-story-style brainrot prose with:
//    - Recurring characters referenced across sentences
//    - Diverse paragraph structures (not just setup/dev/climax)
//    - Sentence-type deduplication to avoid repetition
//    - Variable paragraph lengths and composition
// =============================================================

import { lexicon as B } from './lexicon.js';

// ---- Core utilities ----

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function maybe(fn, p = 0.4) { return Math.random() < p ? fn() : ''; }

function pickWeighted(options) {
    const total = options.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    for (const [fn, weight] of options) {
        r -= weight;
        if (r <= 0) return fn();
    }
    return options[options.length - 1][0]();
}

// Pick from weighted options, but skip recently used types.
// Each option is [fn, weight, typeTag]. Avoids repeating typeTag within `memory`.
function pickNoRepeat(options, memory, memorySize = 3) {
    // Filter out recently used types
    const available = options.filter(([, , tag]) => !memory.includes(tag));
    const pool = available.length > 0 ? available : options; // fallback if all filtered

    const total = pool.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    for (const [fn, weight, tag] of pool) {
        r -= weight;
        if (r <= 0) {
            memory.push(tag);
            if (memory.length > memorySize) memory.shift();
            return fn();
        }
    }
    const last = pool[pool.length - 1];
    memory.push(last[2]);
    if (memory.length > memorySize) memory.shift();
    return last[0]();
}

// ---- Story context ----

class StoryContext {
    constructor() {
        this.cast = this._pickUnique(B.ENTITY, 5 + Math.floor(Math.random() * 4));
        this.introduced = new Set();
        this.locations = this._pickUnique(B.PP, 3);
        this.sentenceCount = 0;
        this.recentTypes = [];
        this.paragraphCount = 0;
        this.recentParaTypes = [];
        // Track recently used characters to avoid back-to-back repeats
        this.recentChars = [];
    }

    _pickUnique(arr, n) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(n, arr.length));
    }

    _trackChar(c) {
        this.recentChars.push(c);
        if (this.recentChars.length > 3) this.recentChars.shift();
        return c;
    }

    character() {
        // Gradually decrease cast bias as more characters appear
        const castBias = Math.max(0.25, 0.5 - this.introduced.size * 0.03);
        if (Math.random() < castBias && this.cast.length > 0) {
            // Pick a cast member that wasn't used in the last 2 sentences
            const available = this.cast.filter(c => !this.recentChars.includes(c));
            const pool = available.length > 0 ? available : this.cast;
            const c = pick(pool);
            this.introduced.add(c);
            return this._trackChar(c);
        }
        return this._trackChar(pick(B.ENTITY));
    }

    protagonist() {
        const p = this.cast[0];
        this.introduced.add(p);
        return this._trackChar(p);
    }

    secondary() {
        if (this.cast.length > 1) {
            // Avoid the protagonist and recently used characters
            const available = this.cast.slice(1).filter(c => !this.recentChars.includes(c));
            const pool = available.length > 0 ? available : this.cast.slice(1);
            const s = pick(pool);
            this.introduced.add(s);
            return this._trackChar(s);
        }
        return this._trackChar(pick(B.ENTITY));
    }

    callback() {
        if (this.introduced.size > 0) {
            // Pick someone who wasn't just mentioned
            const all = [...this.introduced];
            const available = all.filter(c => !this.recentChars.includes(c));
            const pool = available.length > 0 ? available : all;
            return this._trackChar(pick(pool));
        }
        return this.character();
    }

    place() {
        if (Math.random() < 0.15) return pick(this.locations);
        return pick(B.PP);
    }

    tick() { this.sentenceCount++; }
}

// ---- NP with article handling ----

function NP_raw(entity) {
    const adj = maybe(() => pick(B.ADJ), 0.22);
    if (!adj) return entity;
    const m = entity.match(/^(the |a |an )/i);
    if (m) return `${m[1]}${adj} ${entity.slice(m[1].length)}`;
    return `${adj} ${entity}`;
}

function NP(ctx) { return NP_raw(ctx.character()); }

// ---- Clause builders ----

function TRANS_CLAUSE(ctx) {
    const s = NP(ctx), v = pick(B.TV), o = NP(ctx);
    const pp = maybe(() => ctx.place(), 0.25);
    return pp ? `${s} ${v} ${o} ${pp}` : `${s} ${v} ${o}`;
}

function INTRANS_CLAUSE(ctx) {
    const s = NP(ctx), v = pick(B.IV);
    const pp = maybe(() => ctx.place(), 0.3);
    return pp ? `${s} ${v} ${pp}` : `${s} ${v}`;
}

function CLAUSE(ctx) {
    return Math.random() < 0.6 ? TRANS_CLAUSE(ctx) : INTRANS_CLAUSE(ctx);
}

function VP_FRAG(ctx) {
    if (Math.random() < 0.6) {
        const v = pick(B.TV), o = NP(ctx);
        const pp = maybe(() => ctx.place(), 0.2);
        return pp ? `${v} ${o} ${pp}` : `${v} ${o}`;
    }
    const v = pick(B.IV);
    const pp = maybe(() => ctx.place(), 0.25);
    return pp ? `${v} ${pp}` : v;
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
    "Why in the Italian brainrot did", "Since when could",
];
const Q_RHETORICAL = [
    "Does anyone else think", "Can we talk about how",
    "Chat am I tweaking or is", "Is it just me or is",
    "Nah because why is", "Not gonna lie why is",
    "Chat can someone explain why",
];

function IV_BARE() {
    const v = pick(B.IV);
    return v.startsWith('is ') ? v.slice(3) : v;
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
    if (wd.endsWith('s') && !wd.endsWith('ss') && !wd.endsWith('us')) return wd.slice(0, -1);
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
        if (words[i].length < 3) continue;
        if (words[i].endsWith('s') && !words[i].endsWith('ss') && !words[i].endsWith('us')) {
            words[i] = deconjWord(words[i]);
            break;
        }
    }
    return words.join(' ').trim();
}

// =============================================================
//  SENTENCE TYPES
//  Each returns a raw string. finishSentence() handles casing/punctuation.
// =============================================================

function S_SIMPLE(ctx) {
    const c = CLAUSE(ctx);
    const adv = maybe(() => pick(B.ADV), 0.18);
    const aside = maybe(() => pick(B.ASIDE), 0.1);
    let s = c;
    if (adv) s += `, ${adv}`;
    if (aside) s += ` ${aside}`;
    return s;
}

function S_COMPOUND(ctx) {
    const c1 = CLAUSE(ctx), conj = pick(B.CONJ), c2 = CLAUSE(ctx);
    const conseq = maybe(() => pick(B.CONSEQ), 0.18);
    return conseq ? `${c1}, ${conj} ${c2}, ${conseq}` : `${c1}, ${conj} ${c2}`;
}

function S_COMPLEX_SUBJ(ctx) {
    return `${NP(ctx)}, ${pick(B.REL)} ${VP_FRAG(ctx)}, ${VP_FRAG(ctx)}`;
}

function S_COMPLEX_OBJ(ctx) {
    return `${NP(ctx)} ${pick(B.TV)} ${NP(ctx)}, ${pick(B.REL)} ${VP_FRAG(ctx)}`;
}

function S_QUESTION_IS(ctx) {
    let s = `${pick(Q_IS)} ${NP(ctx)} ${IV_BARE()}`;
    const pp = maybe(() => ctx.place(), 0.3);
    const aside = maybe(() => pick(B.ASIDE), 0.12);
    if (pp) s += ` ${pp}`;
    if (aside) s += ` ${aside}`;
    return s + '?';
}

function S_QUESTION_DID(ctx) {
    let s = `${pick(Q_DID)} ${NP(ctx)} ${deconjugateTV()} ${NP(ctx)}`;
    const pp = maybe(() => ctx.place(), 0.2);
    if (pp) s += ` ${pp}`;
    return s + '?';
}

function S_QUESTION_RHET(ctx) {
    let s = `${pick(Q_RHETORICAL)} ${NP(ctx)} ${IV_BARE()}`;
    const pp = maybe(() => ctx.place(), 0.25);
    if (pp) s += ` ${pp}`;
    return s + '?';
}

function S_ATTRIBUTED(ctx) {
    const aside = maybe(() => pick(B.ASIDE), 0.15);
    const s = `${pick(B.ATTRIB)} ${CLAUSE(ctx)}`;
    return aside ? `${s} ${aside}` : s;
}

function S_INTERJECTED(ctx) {
    const conseq = maybe(() => pick(B.CONSEQ), 0.18);
    const s = `${pick(B.INTERJ)} ${CLAUSE(ctx)}`;
    return conseq ? `${s}, ${conseq}` : s;
}

function S_COMPOUND_COMPLEX(ctx) {
    return `${CLAUSE(ctx)}, ${pick(B.CONJ)} ${NP(ctx)}, ${pick(B.REL)} ${VP_FRAG(ctx)}, ${VP_FRAG(ctx)}`;
}

function S_NESTED(ctx) {
    return `${CLAUSE(ctx)}, ${pick(B.CONJ)} ${CLAUSE(ctx)}, ${pick(B.CONSEQ)}`;
}

function S_CONDITIONAL(ctx) {
    return pick([
        () => `if ${CLAUSE(ctx)}, then ${CLAUSE(ctx)}`,
        () => `assuming ${CLAUSE(ctx)}, it follows that ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, but only if ${CLAUSE(ctx)}`,
        () => `should ${CLAUSE(ctx)}, the consequences would be that ${CLAUSE(ctx)}`,
        () => `the moment ${CLAUSE(ctx)}, ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)} — unless, of course, ${CLAUSE(ctx)}`,
        () => `in a world where ${CLAUSE(ctx)}, ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, which would only make sense if ${CLAUSE(ctx)}`,
    ])();
}

function S_COMPARATIVE(ctx) {
    const a = NP(ctx), b = NP(ctx), adj = pick(B.ADJ);
    return pick([
        () => `${a} is objectively more ${adj} than ${b}`,
        () => `${a} clears ${b} in terms of being ${adj}`,
        () => `where ${a} is ${adj}, ${b} is the exact opposite`,
        () => `${a} makes ${b} look ${pick(B.ADJ)} by comparison`,
        () => `on a scale of ${b} to ${a}, ${adj} doesn't even begin to cover it`,
        () => `${b} could never be as ${adj} as ${a}, and frankly it's not even close`,
        () => `putting ${a} next to ${b} is like comparing ${adj} to ${pick(B.ADJ)}`,
        () => `some say ${a} is ${adj}, but ${b} would beg to differ`,
        () => `${a} woke up ${adj} while ${b} has been ${pick(B.ADJ)} since birth`,
    ])();
}

function S_ENUMERATION(ctx) {
    const a = NP_raw(ctx.character()), b = NP_raw(ctx.character()), c = NP_raw(ctx.character());
    const vp = pick(B.IV);
    const pluralized = vp.replace(/^is /, 'are all ').replace(/^has /, 'have all ');
    return pick([
        () => `${a}, ${b}, and ${c} ${pluralized}`,
        () => `not just ${a}, but also ${b} and ${c} ${pluralized}`,
        () => `${a} ${pluralized}, and so do ${b} and ${c}`,
        () => `three words: ${a}, ${b}, ${c} — all of them ${pluralized}`,
    ])();
}

function S_CONCESSIVE(ctx) {
    return pick([
        () => `despite the fact that ${CLAUSE(ctx)}, ${CLAUSE(ctx)}`,
        () => `even though ${CLAUSE(ctx)}, ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, although ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, which is wild considering ${CLAUSE(ctx)}`,
        () => `you'd think that because ${CLAUSE(ctx)}, but no — ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, and yet somehow ${CLAUSE(ctx)}`,
        () => `for all the evidence that ${CLAUSE(ctx)}, ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, in direct contradiction to the fact that ${CLAUSE(ctx)}`,
    ])();
}

function S_TEMPORAL(ctx) {
    return pick([
        () => `after ${CLAUSE(ctx)}, ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, and then ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)} — moments later, ${CLAUSE(ctx)}`,
        () => `once ${CLAUSE(ctx)}, there was no stopping ${NP(ctx)} from ${IV_BARE()}`,
        () => `it wasn't until ${CLAUSE(ctx)} that ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, which directly led to ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, and within minutes, ${CLAUSE(ctx)}`,
        () => `${NP(ctx)} had barely finished ${IV_BARE()} when ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, setting off a sequence of events that culminated in ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}. then, without warning, ${CLAUSE(ctx)}`,
        () => `the exact moment ${CLAUSE(ctx)} was the moment ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, which happened right around the time ${CLAUSE(ctx)}`,
        () => `hours after ${CLAUSE(ctx)}, the full impact became clear: ${CLAUSE(ctx)}`,
    ])();
}

function S_ACADEMIC(ctx) {
    const bridge = pick(["furthermore,", "moreover,", "additionally,",
        "it should also be noted that", "corroborating this,",
        "in a related finding,", "expanding on this,",
        "peer review has confirmed that", "subsequent analysis showed that",
        "a follow-up study revealed that", "independent verification confirmed that",
        "cross-referencing the data shows that"]);
    return `${pick(B.ATTRIB)} ${CLAUSE(ctx)}. ${bridge} ${CLAUSE(ctx)}`;
}

// ---- Additional sentence types for variety ----

function S_NEGATION(ctx) {
    const subj = NP(ctx);
    return pick([
        () => `${subj} did NOT just ${deconjugateTV()} ${NP(ctx)}`,
        () => `there is absolutely no way ${CLAUSE(ctx)}`,
        () => `${subj} refuses to acknowledge that ${CLAUSE(ctx)}`,
        () => `not a single person in the group chat believed that ${CLAUSE(ctx)}`,
        () => `${subj} swore on their aura that ${CLAUSE(ctx)} would never happen`,
        () => `no amount of evidence could convince ${subj} that ${CLAUSE(ctx)}`,
        () => `${subj} looked ${NP(ctx)} dead in the eyes and said "absolutely not"`,
        () => `the idea that ${CLAUSE(ctx)} was, frankly, ${pick(B.ADJ)}`,
        () => `${CLAUSE(ctx)}, but ${subj} was having none of it`,
        () => `zero percent chance that ${CLAUSE(ctx)}, and yet`,
    ])();
}

function S_ESCALATION(ctx) {
    return pick([
        () => `not only did ${CLAUSE(ctx)}, but ${CLAUSE(ctx)}`,
        () => `${CLAUSE(ctx)}, and to make matters worse, ${CLAUSE(ctx)}`,
        () => `as if ${CLAUSE(ctx)} wasn't enough, ${CLAUSE(ctx)}`,
        () => `first ${CLAUSE(ctx)}, then ${CLAUSE(ctx)}, and now we're here`,
        () => `${CLAUSE(ctx)} — and that was just the beginning, because ${CLAUSE(ctx)}`,
    ])();
}

function S_DIALOGUE(ctx) {
    const speaker = NP_raw(ctx.callback());
    const quote = pick([
        "this changes everything", "we are so cooked", "I didn't sign up for this",
        "the aura is off the charts", "ratio", "that's not even the worst part",
        "I have proof", "the prophecy was true", "check the group chat",
        "I'm going to need a moment", "the vibes are rancid",
        "somebody hold me back", "I can explain", "no I can't actually",
        "this is exactly what they warned us about", "skill issue honestly",
        "we need to talk about this", "the algorithm did this on purpose",
        "I'm not mad I'm just disappointed", "the lore is getting too deep",
    ]);
    return pick([
        () => `${speaker} turned to ${NP(ctx)} and simply said: "${quote}"`,
        () => `"${quote}," ${speaker} whispered, ${pick(B.ADV)}`,
        () => `when asked for comment, ${speaker} replied: "${quote}"`,
        () => `${speaker} posted a single message in the group chat: "${quote}"`,
        () => `sources close to ${speaker} report they were overheard saying "${quote}"`,
    ])();
}

function S_META(ctx) {
    // Self-aware / fourth-wall-breaking sentences
    const subj = NP(ctx);
    return pick([
        () => `at this point in the narrative, even ${subj} knew something had to change`,
        () => `if this were a movie, this would be the part where ${subj} ${pick(B.IV)}`,
        () => `historians will look back on this moment and ask why ${subj} ${pick(B.IV)}`,
        () => `for context, ${subj} ${pick(B.IV)}, which explains a lot`,
        () => `let the record show that ${subj} ${pick(B.IV)}`,
        () => `the irony of ${subj} ${IV_BARE()} was not lost on anyone`,
        () => `in hindsight, the signs that ${subj} ${pick(B.IV)} were always there`,
        () => `future generations will study the moment ${subj} ${pick(B.IV)}`,
    ])();
}

// ---- Narrative sentence types ----

function S_INTRO(ctx) {
    const protag = NP_raw(ctx.protagonist());
    const state = pick(B.IV), place = pick(ctx.locations);
    const bare = state.replace(/^is /, '');
    const aside = maybe(() => pick(B.ASIDE), 0.12);
    const s = pick([
        () => `${protag} ${state} ${place}`,
        () => `it all started when ${protag} ${state} ${place}`,
        () => `${place}, ${protag} ${state}`,
        () => `${protag} — ${pick(B.ADJ)}, ${pick(B.ADJ)}, and undeniably ${pick(B.ADJ)} — ${state} ${place}`,
        () => `legend has it that ${protag} ${state} ${place}`,
        () => `somewhere ${place}, ${protag} ${state}`,
        () => `there are few things more ${pick(B.ADJ)} than ${protag} ${bare} ${place}`,
        () => `let me tell you about ${protag}, who at this very moment ${state} ${place}`,
        () => `picture this: ${protag}, ${bare} ${place}`,
        () => `they said it couldn't be done, but ${protag} ${state} ${place}`,
        () => `every great story needs a protagonist, and ours ${state} ${place} — meet ${protag}`,
        () => `long before any of this made sense, ${protag} ${state} ${place}`,
        () => `this is the story of how ${protag} ended up ${bare} ${place}`,
        () => `if you had told anyone that ${protag} would be ${bare} ${place}, nobody would have believed you`,
        () => `${protag} ${state} ${place}, and that's where this whole thing begins`,
        () => `on a day like any other, ${protag} ${state} ${place}`,
        () => `the timeline remembers the exact moment ${protag} ${state} ${place}`,
    ])();
    return aside ? `${s} ${aside}` : s;
}

function S_CALLBACK(ctx) {
    const prev = NP_raw(ctx.callback());
    return pick([
        () => `${prev} ${pick(B.TV)} ${NP(ctx)}`,
        () => `${prev} ${pick(B.IV)}`,
        () => {
            const conj = pick(["Meanwhile,", "At the same time,", "Elsewhere,",
                "Not to be outdone,", "In response,", "Sensing an opportunity,",
                "Having witnessed all of this,", "Unfazed by the previous events,",
                "In what can only be described as a power move,"]);
            const pp = maybe(() => ctx.place(), 0.25);
            return pp ? `${conj} ${prev} ${pick(B.IV)} ${pp}` : `${conj} ${prev} ${pick(B.IV)}`;
        },
        () => {
            const reaction = pick([
                "could not believe what just happened",
                "entered their villain arc immediately",
                "started mewing aggressively",
                "simply chose violence", "activated goblin mode",
                "began farming aura at an unprecedented rate",
                "reconsidered their entire existence",
                "called an emergency meeting", "posted a cryptic Instagram story",
                "went private on all platforms", "started a thread about it",
                "updated their bio to reflect the trauma",
                "left the group chat without explanation",
                "screenshot the whole thing and sent it to everyone",
                "said nothing, but the aura shift was palpable",
                "laughed, but it was clearly a coping mechanism",
            ]);
            return `${prev} ${reaction}`;
        },
        () => {
            const rel = pick(B.REL);
            return `${prev}, ${rel} ${VP_FRAG(ctx)}, ${pick(B.IV)}`;
        },
    ])();
}

function S_CONSEQUENCE(ctx) {
    const subj = NP_raw(ctx.callback());
    const aside = maybe(() => pick(B.ASIDE), 0.18);
    const action = pick(["reconsider everything", "question their entire existence",
        "enter a new era", "lose all remaining aura", "gain unprecedented aura",
        "start a villain arc", "achieve final form", "file for aura bankruptcy",
        "invoke the sigma clause", "activate their trap card", "post a notes app apology",
        "go completely silent for 72 hours", "rebrand entirely",
        "delete everything and start over", "write a memoir about it",
        "take a long walk alone", "stare at a wall for 45 minutes",
        "log off for the first time in years", "switch to a flip phone"]);
    const s = pick([
        () => `this caused ${subj} to ${action}`,
        () => `the consequences for ${subj} were ${pick(B.ADJ)}, ${pick(B.CONSEQ)}`,
        () => `${pick(B.ATTRIB)} ${subj} ${pick(B.IV)}, ${pick(B.CONSEQ)}`,
        () => `${subj} was never the same after this, ${pick(B.CONSEQ)}`,
        () => `to this day, ${subj} ${pick(B.IV)}, and most agree this is a direct result`,
        () => `${subj} would later describe this as "the moment everything changed," ${pick(B.CONSEQ)}`,
        () => `if you ask ${subj} about it now, they just ${pick(["stare into the distance", "change the subject",
            "start mewing nervously", "pretend they don't know what you're talking about",
            "show you their aura score as a deflection", "block you", "laugh nervously",
            "pull up a PowerPoint about it"])}`,
        () => `and so ${subj} had no choice but to ${action}, ${pick(B.CONSEQ)}`,
        () => `the fallout was immediate: ${subj} ${pick(B.IV)}, ${pick(B.CONSEQ)}`,
        () => `${subj} emerged from this ${pick(B.ADJ)} and ${pick(B.ADJ)}, but ultimately intact`,
        () => `the lasting impact on ${subj} cannot be overstated — ${pick(B.CONSEQ)}`,
        () => `after this, ${subj} was spotted ${IV_BARE()} ${ctx.place()}, presumably to cope`,
    ])();
    return aside ? `${s} ${aside}` : s;
}

// ---- Transition fragments (embedded in paragraphs, not standalone) ----

function transition(ctx) {
    const protag = ctx.callback();
    return pick([
        "but the brainrot doesn't stop there.",
        "the situation was about to get significantly more unhinged.",
        "little did they know, the aura shift was just beginning.",
        "the plot, as they say, thickened.",
        "but wait — there's more.",
        "the lore deepened.",
        "and then things took a turn.",
        "the narrative shifted without warning.",
        `but ${protag} was far from finished.`,
        `at this point, even ${protag} knew something was different.`,
        `what happened next was, in a word, ${pick(B.ADJ)}.`,
        "the next chapter writes itself.",
        "enter: complications.",
        "but we're getting ahead of ourselves.",
        "the tone shifted perceptibly.",
        "a new variable entered the equation.",
        `things were about to get exponentially more ${pick(B.ADJ)}.`,
        "the aura in the room changed immediately.",
        "a disturbance was felt across the timeline.",
        "the second act began.",
        `none of this, however, prepared anyone for what ${protag} would do next.`,
        "and just when everyone thought it was over —",
        "the dust hadn't even settled when",
        `${protag}, however, had other plans.`,
        "the vibes shifted so hard the algorithm noticed.",
        "but that was only the surface level.",
        "allow me to elaborate.",
        "now here's where it gets interesting.",
        "the following sequence of events has been corroborated by at least three group chats.",
    ]);
}

// =============================================================
//  PARAGRAPH GENERATION
//
//  Multiple paragraph archetypes, randomly selected per paragraph.
//  Each archetype defines a *pool* of sentence-type options for each
//  slot, not a fixed sequence. pickNoRepeat avoids back-to-back
//  repetition of the same sentence type.
// =============================================================

// Each entry: [generatorFn, weight, typeTag]
function allSentenceTypes(ctx) {
    return [
        [() => S_SIMPLE(ctx), 10, 'simple'],
        [() => S_COMPOUND(ctx), 9, 'compound'],
        [() => S_COMPLEX_SUBJ(ctx), 5, 'cplx_subj'],
        [() => S_COMPLEX_OBJ(ctx), 5, 'cplx_obj'],
        [() => S_ATTRIBUTED(ctx), 5, 'attrib'],
        [() => S_INTERJECTED(ctx), 6, 'interj'],
        [() => S_QUESTION_IS(ctx), 4, 'q_is'],
        [() => S_QUESTION_DID(ctx), 3, 'q_did'],
        [() => S_QUESTION_RHET(ctx), 3, 'q_rhet'],
        [() => S_COMPOUND_COMPLEX(ctx), 3, 'cmpd_cplx'],
        [() => S_NESTED(ctx), 3, 'nested'],
        [() => S_CONDITIONAL(ctx), 4, 'cond'],
        [() => S_COMPARATIVE(ctx), 4, 'comp'],
        [() => S_CONCESSIVE(ctx), 3, 'concess'],
        [() => S_TEMPORAL(ctx), 4, 'temp'],
        [() => S_ACADEMIC(ctx), 3, 'acad'],
        [() => S_ENUMERATION(ctx), 2, 'enum'],
        [() => S_CALLBACK(ctx), 4, 'callback'],
        [() => S_NEGATION(ctx), 3, 'negation'],
        [() => S_ESCALATION(ctx), 3, 'escalation'],
        [() => S_DIALOGUE(ctx), 3, 'dialogue'],
        [() => S_META(ctx), 3, 'meta'],
    ];
}

// Paragraph archetypes — each returns an array of sentences

function para_narrative(ctx) {
    const sentences = [];
    const types = allSentenceTypes(ctx);
    const mem = ctx.recentTypes;

    sentences.push(pickNoRepeat([
        [() => S_CALLBACK(ctx), 3, 'callback'],
        [() => S_TEMPORAL(ctx), 3, 'temp'],
        [() => S_SIMPLE(ctx), 3, 'simple'],
        [() => S_INTERJECTED(ctx), 2, 'interj'],
        [() => S_META(ctx), 2, 'meta'],
        [() => S_ESCALATION(ctx), 2, 'escalation'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_COMPOUND(ctx), 3, 'compound'],
        [() => S_COMPLEX_OBJ(ctx), 3, 'cplx_obj'],
        [() => S_CONDITIONAL(ctx), 2, 'cond'],
        [() => S_CONCESSIVE(ctx), 2, 'concess'],
        [() => S_DIALOGUE(ctx), 2, 'dialogue'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_CALLBACK(ctx), 2, 'callback'],
        [() => S_SIMPLE(ctx), 2, 'simple'],
        [() => S_NEGATION(ctx), 2, 'negation'],
        [() => S_QUESTION_DID(ctx), 2, 'q_did'],
        [() => S_TEMPORAL(ctx), 2, 'temp'],
    ], mem));

    if (Math.random() < 0.55) {
        sentences.push(pickNoRepeat(types, mem));
    }
    return sentences;
}

function para_academic(ctx) {
    // SCIgen-style: attribution → evidence → further evidence → conclusion
    const sentences = [];
    const mem = ctx.recentTypes;

    sentences.push(pickNoRepeat([
        [() => S_ACADEMIC(ctx), 4, 'acad'],
        [() => S_ATTRIBUTED(ctx), 3, 'attrib'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_COMPOUND(ctx), 3, 'compound'],
        [() => S_COMPARATIVE(ctx), 3, 'comp'],
        [() => S_CONCESSIVE(ctx), 2, 'concess'],
        [() => S_ENUMERATION(ctx), 2, 'enum'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_CONDITIONAL(ctx), 3, 'cond'],
        [() => S_TEMPORAL(ctx), 2, 'temp'],
        [() => S_COMPLEX_SUBJ(ctx), 2, 'cplx_subj'],
        [() => S_ATTRIBUTED(ctx), 2, 'attrib'],
    ], mem));

    if (Math.random() < 0.4) {
        sentences.push(pickNoRepeat([
            [() => S_CONSEQUENCE(ctx), 3, 'conseq'],
            [() => S_QUESTION_RHET(ctx), 2, 'q_rhet'],
        ], mem));
    }
    return sentences;
}

function para_interrogative(ctx) {
    // Question-driven: question → speculation → evidence → question
    const sentences = [];
    const mem = ctx.recentTypes;

    sentences.push(pickNoRepeat([
        [() => S_QUESTION_IS(ctx), 3, 'q_is'],
        [() => S_QUESTION_DID(ctx), 3, 'q_did'],
        [() => S_QUESTION_RHET(ctx), 2, 'q_rhet'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_ATTRIBUTED(ctx), 3, 'attrib'],
        [() => S_COMPOUND(ctx), 3, 'compound'],
        [() => S_SIMPLE(ctx), 2, 'simple'],
        [() => S_CONCESSIVE(ctx), 2, 'concess'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_CALLBACK(ctx), 3, 'callback'],
        [() => S_COMPARATIVE(ctx), 2, 'comp'],
        [() => S_TEMPORAL(ctx), 2, 'temp'],
    ], mem));

    if (Math.random() < 0.5) {
        sentences.push(pickNoRepeat([
            [() => S_QUESTION_RHET(ctx), 2, 'q_rhet'],
            [() => S_QUESTION_IS(ctx), 2, 'q_is'],
            [() => S_INTERJECTED(ctx), 2, 'interj'],
        ], mem));
    }
    return sentences;
}

function para_dramatic(ctx) {
    const sentences = [];
    const mem = ctx.recentTypes;

    sentences.push(pickNoRepeat([
        [() => S_INTERJECTED(ctx), 3, 'interj'],
        [() => S_NEGATION(ctx), 3, 'negation'],
        [() => S_ESCALATION(ctx), 2, 'escalation'],
        [() => S_CALLBACK(ctx), 2, 'callback'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_COMPOUND(ctx), 2, 'compound'],
        [() => S_COMPOUND_COMPLEX(ctx), 2, 'cmpd_cplx'],
        [() => S_NESTED(ctx), 2, 'nested'],
        [() => S_TEMPORAL(ctx), 2, 'temp'],
        [() => S_DIALOGUE(ctx), 2, 'dialogue'],
        [() => S_ESCALATION(ctx), 2, 'escalation'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_CONSEQUENCE(ctx), 3, 'conseq'],
        [() => S_META(ctx), 2, 'meta'],
        [() => S_CALLBACK(ctx), 2, 'callback'],
    ], mem));

    if (Math.random() < 0.45) {
        sentences.push(pickNoRepeat([
            [() => S_QUESTION_RHET(ctx), 2, 'q_rhet'],
            [() => S_DIALOGUE(ctx), 2, 'dialogue'],
            [() => S_INTERJECTED(ctx), 1, 'interj'],
        ], mem));
    }
    return sentences;
}

function para_comparison(ctx) {
    // Ranking/tier list style: compare → evidence → enumeration → verdict
    const sentences = [];
    const mem = ctx.recentTypes;

    sentences.push(pickNoRepeat([
        [() => S_COMPARATIVE(ctx), 4, 'comp'],
        [() => S_ENUMERATION(ctx), 3, 'enum'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_CONCESSIVE(ctx), 3, 'concess'],
        [() => S_ATTRIBUTED(ctx), 3, 'attrib'],
        [() => S_COMPOUND(ctx), 2, 'compound'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_SIMPLE(ctx), 3, 'simple'],
        [() => S_CALLBACK(ctx), 2, 'callback'],
        [() => S_CONDITIONAL(ctx), 2, 'cond'],
    ], mem));

    if (Math.random() < 0.5) {
        sentences.push(pickNoRepeat([
            [() => S_COMPARATIVE(ctx), 2, 'comp'],
            [() => S_CONSEQUENCE(ctx), 2, 'conseq'],
            [() => S_QUESTION_IS(ctx), 1, 'q_is'],
        ], mem));
    }
    return sentences;
}

function para_freeform(ctx) {
    // Pure variety: random sentence count and types, no fixed structure
    const count = 2 + Math.floor(Math.random() * 3);
    const sentences = [];
    const types = allSentenceTypes(ctx);
    for (let i = 0; i < count; i++) {
        sentences.push(pickNoRepeat(types, ctx.recentTypes));
    }
    return sentences;
}

function para_opening(ctx) {
    // Story opener: intro + supporting sentence + optional question/callback
    const sentences = [];
    const mem = ctx.recentTypes;

    sentences.push(S_INTRO(ctx));
    mem.push('intro');

    sentences.push(pickNoRepeat([
        [() => S_ATTRIBUTED(ctx), 3, 'attrib'],
        [() => S_ACADEMIC(ctx), 2, 'acad'],
        [() => S_COMPOUND(ctx), 3, 'compound'],
        [() => S_COMPARATIVE(ctx), 2, 'comp'],
    ], mem));

    sentences.push(pickNoRepeat([
        [() => S_SIMPLE(ctx), 3, 'simple'],
        [() => S_COMPLEX_SUBJ(ctx), 2, 'cplx_subj'],
        [() => S_CALLBACK(ctx), 2, 'callback'],
        [() => S_TEMPORAL(ctx), 2, 'temp'],
    ], mem));

    if (Math.random() < 0.5) {
        sentences.push(pickNoRepeat([
            [() => S_QUESTION_IS(ctx), 2, 'q_is'],
            [() => S_INTERJECTED(ctx), 2, 'interj'],
            [() => S_CALLBACK(ctx), 2, 'callback'],
        ], mem));
    }
    return sentences;
}

// Available paragraph types (excluding opening which is used once)
const PARA_TYPES = [
    [para_narrative, 'narrative'],
    [para_academic, 'academic'],
    [para_interrogative, 'interrogative'],
    [para_dramatic, 'dramatic'],
    [para_comparison, 'comparison'],
    [para_freeform, 'freeform'],
];

function pickParagraphType(ctx) {
    // Filter out recently used paragraph types
    const available = PARA_TYPES.filter(([, tag]) => !ctx.recentParaTypes.includes(tag));
    const pool = available.length > 0 ? available : PARA_TYPES;
    const [fn, tag] = pick(pool);
    ctx.recentParaTypes.push(tag);
    if (ctx.recentParaTypes.length > 2) ctx.recentParaTypes.shift();
    return fn;
}

// =============================================================
//  FINISHING & PUBLIC API
// =============================================================

function finishSentence(s) {
    s = s.replace(/\s+/g, ' ').trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += '.';
    return s;
}

export function generateSentence() {
    const ctx = new StoryContext();
    const types = allSentenceTypes(ctx);
    return finishSentence(pickNoRepeat(types, ctx.recentTypes));
}

export function generateStory(targetSentences = 20) {
    const ctx = new StoryContext();
    const paragraphs = [];
    let total = 0;

    // Opening paragraph
    const opening = para_opening(ctx).map(finishSentence);
    paragraphs.push(opening);
    total += opening.length;

    // Body paragraphs — varied types, with occasional transitions
    while (total < targetSentences - 4) {
        // Embed a transition sentence at the start of some paragraphs
        const needsTransition = paragraphs.length > 1 && Math.random() < 0.3;
        const paraFn = pickParagraphType(ctx);
        const raw = paraFn(ctx);

        if (needsTransition) {
            raw.unshift(transition(ctx));
        }

        const finished = raw.map(finishSentence);
        paragraphs.push(finished);
        total += finished.length;

        // Occasionally split long runs by inserting a short 1-2 sentence mini-paragraph
        if (paragraphs.length > 2 && Math.random() < 0.2) {
            const mini = [pickNoRepeat(allSentenceTypes(ctx), ctx.recentTypes)].map(finishSentence);
            paragraphs.push(mini);
            total += mini.length;
        }
    }

    // Closing paragraph — pick from all types, not just dramatic
    const closingFn = pick([para_dramatic, para_narrative, para_freeform]);
    const closing = closingFn(ctx).map(finishSentence);
    paragraphs.push(closing);

    return paragraphs;
}
