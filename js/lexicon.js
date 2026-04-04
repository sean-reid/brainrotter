// Barrel export — assembles all lexicon categories into one object

import { ENTITY } from './lexicon/entities.js';
import { TV, IV } from './lexicon/verbs.js';
import { ADJ } from './lexicon/adjectives.js';
import { ADV, PP, CONJ, REL } from './lexicon/modifiers.js';
import { INTERJ, QWORD, ASIDE, ATTRIB, CONSEQ } from './lexicon/discourse.js';

export const lexicon = {
    ENTITY, TV, IV, ADJ, ADV, PP, INTERJ, QWORD, CONJ, REL, ASIDE, ATTRIB, CONSEQ,
};
