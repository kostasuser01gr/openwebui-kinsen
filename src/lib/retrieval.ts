import type { KnowledgeNote, ChatMessage } from './types';

export interface ScoredNote {
  note: KnowledgeNote;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  matchedChunks?: string[];
}

// ── Synonym map for car rental domain ───────────────────────
const SYNONYMS: Record<string, string[]> = {
  deposit: ['hold', 'preauth', 'authorization', 'block', 'security deposit'],
  late: ['overdue', 'delayed', 'past due'],
  fuel: ['gas', 'petrol', 'diesel', 'gasoline'],
  damage: ['scratch', 'dent', 'broken', 'cracked', 'chipped'],
  accident: ['crash', 'collision', 'wreck', 'incident'],
  insurance: ['coverage', 'protection', 'waiver', 'cdw', 'scdw'],
  cancel: ['cancellation', 'cancelled', 'canceled'],
  child: ['baby', 'infant', 'toddler', 'kid', 'booster'],
  mileage: ['km', 'kilometre', 'kilometer', 'odometer', 'distance'],
  price: ['pricing', 'rate', 'cost', 'fee', 'charge'],
  discount: ['coupon', 'promo', 'offer', 'deal'],
  clean: ['cleaning', 'dirty', 'stain', 'smoke', 'smoking'],
  border: ['cross-border', 'international', 'country', 'abroad'],
  return: ['drop-off', 'dropoff', 'bring back'],
  book: ['booking', 'reservation', 'reserve'],
  verify: ['verification', 'identity', 'document', 'licence', 'license'],
  loyalty: ['rewards', 'points', 'member', 'membership', 'vip'],
};

// ── Abbreviation expansion ──────────────────────────────────
const ABBREVIATIONS: Record<string, string> = {
  cdw: 'collision damage waiver',
  scdw: 'super collision damage waiver',
  tp: 'theft protection',
  pai: 'personal accident insurance',
  ldw: 'loss damage waiver',
  gps: 'navigation device',
  suv: 'sport utility vehicle',
  mpv: 'multi purpose vehicle',
  ev: 'electric vehicle',
  roi: 'return on investment',
  sla: 'service level agreement',
  eta: 'estimated time arrival',
  asap: 'as soon as possible',
  id: 'identification',
  dl: 'driver license',
};

// ── Stop words to strip from queries ────────────────────────
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'must',
  'can',
  'could',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'about',
  'like',
  'through',
  'after',
  'over',
  'between',
  'out',
  'up',
  'down',
  'if',
  'or',
  'and',
  'but',
  'not',
  'no',
  'nor',
  'so',
  'yet',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'me',
  'my',
  'we',
  'our',
  'you',
  'your',
  'he',
  'she',
  'they',
  'them',
  'their',
  'what',
  'which',
  'who',
  'whom',
  'how',
  'when',
  'where',
  'why',
  'am',
  'just',
  'also',
  'very',
  'much',
  'more',
  'most',
  'some',
  'any',
  'all',
  'each',
  'every',
  'both',
  'few',
  'than',
  'too',
  'other',
  'please',
  'tell',
  'know',
  'need',
  'want',
  'get',
  'got',
  'help',
]);

/**
 * Rewrite query: expand abbreviations, strip stop words, normalize.
 */
export function rewriteQuery(query: string): string {
  let q = query.toLowerCase().trim();
  // Expand abbreviations
  for (const [abbr, expansion] of Object.entries(ABBREVIATIONS)) {
    const re = new RegExp(`\\b${abbr}\\b`, 'gi');
    q = q.replace(re, `${abbr} ${expansion}`);
  }
  return q;
}

/**
 * Tokenize and filter a string into meaningful terms.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;:.!?()[\]{}"'`/\\|]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Expand a query with synonyms — returns expanded set of tokens.
 */
function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (SYNONYMS[token]) {
      for (const syn of SYNONYMS[token]) expanded.add(syn);
    }
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(token)) {
        expanded.add(key);
        for (const syn of syns) expanded.add(syn);
      }
    }
  }
  return Array.from(expanded);
}

/**
 * Generate bigrams from tokens.
 */
function bigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return result;
}

// ── Levenshtein distance for fuzzy matching ─────────────────
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Short-circuit for very different lengths
  if (Math.abs(a.length - b.length) > 3) return Math.abs(a.length - b.length);

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Check if two words are a fuzzy match (Levenshtein distance ≤ maxDist).
 */
export function fuzzyMatch(a: string, b: string, maxDist: number = 2): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return a === b; // No fuzzy for very short words
  return levenshtein(a, b) <= maxDist;
}

// ── TF-IDF Engine ───────────────────────────────────────────

interface DocumentTerms {
  noteId: string;
  tf: Map<string, number>; // term frequency (normalized)
  rawTerms: string[];
}

/**
 * Build a document's term frequency map.
 * TF = (count of term in doc) / (total terms in doc)
 */
function buildTF(text: string): Map<string, number> {
  const terms = tokenize(text);
  const counts = new Map<string, number>();
  for (const t of terms) {
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const total = terms.length || 1;
  const tf = new Map<string, number>();
  for (const [term, count] of counts) {
    tf.set(term, count / total);
  }
  return tf;
}

/**
 * Compute IDF for a term across the corpus.
 * IDF = log(N / (1 + df)) where df = docs containing term
 */
function computeIDF(term: string, docs: DocumentTerms[]): number {
  const df = docs.filter((d) => d.tf.has(term)).length;
  return Math.log((docs.length + 1) / (1 + df)) + 1; // Smoothed IDF
}

/**
 * Build the TF-IDF index for the corpus.
 */
export function buildCorpusIndex(notes: KnowledgeNote[]): {
  docs: DocumentTerms[];
  idf: Map<string, number>;
} {
  const docs: DocumentTerms[] = notes.map((note) => {
    // Combine title (3x weight), keywords (4x weight), content (1x), category (2x)
    const weightedText = [
      ...Array(3).fill(note.title),
      ...Array(4).fill(note.keywords.join(' ')),
      note.content,
      ...Array(2).fill(note.category),
    ].join(' ');
    const tf = buildTF(weightedText);
    return { noteId: note.id, tf, rawTerms: tokenize(weightedText) };
  });

  // Build IDF for all terms in corpus
  const allTerms = new Set<string>();
  for (const doc of docs) {
    for (const term of doc.tf.keys()) allTerms.add(term);
  }
  const idf = new Map<string, number>();
  for (const term of allTerms) {
    idf.set(term, computeIDF(term, docs));
  }

  return { docs, idf };
}

/**
 * Score a note using TF-IDF with synonym expansion, bigrams, and fuzzy matching.
 */
export function scoreNote(
  query: string,
  note: KnowledgeNote,
  corpus?: { docs: DocumentTerms[]; idf: Map<string, number> },
): number {
  const rewritten = rewriteQuery(query);
  const rawTokens = tokenize(rewritten);
  const expandedTokens = expandWithSynonyms(rawTokens);
  const queryBigrams = bigrams(rawTokens);
  let score = 0;

  // ── TF-IDF scoring (if corpus available) ──
  if (corpus) {
    const doc = corpus.docs.find((d) => d.noteId === note.id);
    if (doc) {
      for (const qTerm of expandedTokens) {
        const tf = doc.tf.get(qTerm) || 0;
        const idf = corpus.idf.get(qTerm) || 1;
        score += tf * idf * 10; // Scale up

        // Fuzzy: check if any doc term is within edit distance 2
        if (tf === 0 && qTerm.length >= 4) {
          for (const docTerm of doc.tf.keys()) {
            if (fuzzyMatch(qTerm, docTerm, 2)) {
              const fuzzyTf = doc.tf.get(docTerm) || 0;
              const fuzzyIdf = corpus.idf.get(docTerm) || 1;
              score += fuzzyTf * fuzzyIdf * 5; // Half weight for fuzzy
              break; // Only count best fuzzy match
            }
          }
        }
      }
    }
  }

  // ── Legacy keyword/bigram boosting (still useful for precision) ──
  for (const kw of note.keywords) {
    const kwLower = kw.toLowerCase();
    if (rewritten.includes(kwLower)) {
      score += 10;
    } else {
      for (const token of expandedTokens) {
        if (kwLower.includes(token) || token.includes(kwLower)) {
          score += 4;
        } else if (token.length >= 4 && fuzzyMatch(token, kwLower, 2)) {
          score += 2; // Fuzzy keyword match
        }
      }
    }
  }

  for (const bg of queryBigrams) {
    for (const kw of note.keywords) {
      if (kw.toLowerCase().includes(bg) || bg.includes(kw.toLowerCase())) {
        score += 8;
      }
    }
  }

  // Title match with fuzzy
  const titleTokens = tokenize(note.title);
  for (const token of expandedTokens) {
    for (const tt of titleTokens) {
      if (tt === token) {
        score += 6;
      } else if (token.length >= 4 && fuzzyMatch(token, tt, 2)) {
        score += 3;
      }
    }
  }

  // Content body match (diminishing returns)
  const contentLower = note.content.toLowerCase();
  let contentHits = 0;
  for (const token of expandedTokens) {
    if (contentLower.includes(token)) contentHits++;
  }
  score += Math.min(contentHits, 3) + Math.max(0, contentHits - 3) * 0.5;

  // Category match
  if (rewritten.includes(note.category.toLowerCase())) {
    score += 3;
  }

  return score;
}

/**
 * Determine confidence level based on match quality.
 */
export function getConfidence(scoredNotes: ScoredNote[]): 'high' | 'medium' | 'low' {
  if (scoredNotes.length === 0) return 'low';
  const topScore = scoredNotes[0].score;
  if (topScore >= 25 && scoredNotes.length >= 2) return 'high';
  if (topScore >= 12) return 'medium';
  return 'low';
}

/**
 * Retrieve top-N relevant notes with TF-IDF, fuzzy, and confidence.
 */
export function retrieveNotes(
  query: string,
  notes: KnowledgeNote[],
  topN: number = 3,
): ScoredNote[] {
  const corpus = buildCorpusIndex(notes);

  const scored = notes
    .map((note) => {
      const s = scoreNote(query, note, corpus);
      return { note, score: s, confidence: 'low' as const };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  // Assign confidence levels
  const confidence = getConfidence(scored);
  return scored.map((s, i) => ({
    ...s,
    confidence: i === 0 ? confidence : s.score >= 12 ? 'medium' : 'low',
  }));
}

/**
 * Build context-aware query by incorporating recent conversation history.
 */
export function buildContextualQuery(
  currentMessage: string,
  history: ChatMessage[],
  maxTurns: number = 3,
): string {
  if (history.length === 0) return currentMessage;

  const recentUserMsgs = history
    .filter((m) => m.role === 'user')
    .slice(-maxTurns)
    .map((m) => m.content);

  if (currentMessage.split(/\s+/).length <= 5 && recentUserMsgs.length > 0) {
    return `${recentUserMsgs.join(' ')} ${currentMessage}`;
  }

  return currentMessage;
}

/**
 * Generate suggested follow-up questions based on matched notes.
 */
export function generateFollowups(
  query: string,
  matchedNotes: ScoredNote[],
  allNotes: KnowledgeNote[],
): string[] {
  const followups: string[] = [];
  const matchedIds = new Set(matchedNotes.map((s) => s.note.id));

  for (const { note } of matchedNotes) {
    if (note.relatedNotes) {
      for (const relId of note.relatedNotes) {
        if (!matchedIds.has(relId)) {
          const relNote = allNotes.find((n) => n.id === relId);
          if (relNote) {
            followups.push(`What about ${relNote.title.toLowerCase()}?`);
          }
        }
      }
    }
  }

  const matchedCategories = new Set(matchedNotes.map((s) => s.note.category));
  const FOLLOW_UP_MAP: Record<string, string[]> = {
    billing: [
      'What discounts can I offer?',
      'How do I process a refund?',
      'What is the cancellation policy?',
    ],
    operations: [
      'How do I handle a damage report?',
      'What is the accident procedure?',
      'How does the cleaning fee work?',
    ],
    sales: [
      'How do I upsell insurance?',
      'What are the loyalty program tiers?',
      'How do I check fleet availability?',
    ],
    safety: ['What is the damage inspection procedure?', 'How do I contact emergency services?'],
    compliance: ['What documents do I need to verify?', 'What is the minimum age requirement?'],
  };

  for (const cat of matchedCategories) {
    const catFollowups = FOLLOW_UP_MAP[cat] || [];
    for (const f of catFollowups) {
      if (!f.toLowerCase().includes(query.toLowerCase().slice(0, 10))) {
        followups.push(f);
      }
    }
  }

  return [...new Set(followups)].slice(0, 3);
}

/**
 * Build a composite response from matched notes with confidence badge.
 */
export function buildResponse(query: string, scoredNotes: ScoredNote[]): string {
  if (scoredNotes.length === 0) {
    return `I couldn't find a specific policy or procedure matching your question. Here are some things I can help with:

• Deposit & hold rules
• Late return / fuel / mileage policies
• Cross-border & one-way rentals
• Damage inspection & accident workflow
• Insurance upsell scripts
• Customer verification checklist
• Fleet availability templates
• Pricing exceptions & discounts
• Cancellation & no-show procedures
• Cleaning fees
• Child seat & accessories
• Loyalty program

💡 **Tip:** You can also use /macros for templates and calculators, or /checklist for operational checklists.

Please try rephrasing your question or ask about one of these topics.`;
  }

  const confidence = scoredNotes[0].confidence;
  const badge = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴';

  let reply = '';

  if (scoredNotes.length === 1) {
    const note = scoredNotes[0].note;
    reply = `${badge} **${note.title}**\n\n${note.content}`;
  } else {
    // Composite answer: synthesize with section headers
    reply = `${badge} I found ${scoredNotes.length} relevant policies:\n\n`;
    for (const { note, confidence: noteConf } of scoredNotes) {
      const noteBadge = noteConf === 'high' ? '🟢' : noteConf === 'medium' ? '🟡' : '🔴';
      reply += `---\n${noteBadge} **${note.title}**\n\n${note.content}\n\n`;
    }
  }

  reply += `\n\n_Last updated: ${scoredNotes.map((s) => s.note.updatedAt).join(', ')}_`;
  return reply;
}

/**
 * Detect the primary "intent" category from a query for analytics.
 */
export function detectIntent(query: string): string {
  const q = query.toLowerCase();
  const intentMap: Record<string, string[]> = {
    deposit: ['deposit', 'hold', 'preauth', 'security'],
    'late-return': ['late', 'overdue', 'grace period'],
    fuel: ['fuel', 'gas', 'petrol', 'diesel', 'tank', 'refuel'],
    mileage: ['mileage', 'km', 'kilometre', 'odometer'],
    'cross-border': ['cross-border', 'border', 'country', 'international', 'one-way'],
    damage: ['damage', 'scratch', 'dent', 'inspection'],
    accident: ['accident', 'crash', 'collision', 'emergency', 'tow'],
    insurance: ['insurance', 'cdw', 'protection', 'waiver', 'coverage'],
    verification: ['verification', 'id', 'license', 'licence', 'passport', 'age'],
    availability: ['availability', 'available', 'fleet', 'book'],
    pricing: ['pricing', 'discount', 'rate', 'coupon', 'corporate'],
    cancellation: ['cancel', 'refund', 'modify', 'reschedule'],
    'no-show': ['no-show', 'no show', 'missed pickup'],
    cleaning: ['cleaning', 'dirty', 'smoke', 'pet', 'stain'],
    'child-seat': ['child seat', 'baby', 'booster', 'gps', 'accessory'],
    loyalty: ['loyalty', 'points', 'gold', 'platinum', 'member'],
    macro: ['macro', 'template', 'calculator', 'calculate'],
    checklist: ['checklist', 'inspection', 'pickup checklist', 'return checklist'],
  };

  for (const [intent, keywords] of Object.entries(intentMap)) {
    for (const kw of keywords) {
      if (q.includes(kw)) return intent;
    }
  }
  return 'general';
}

/**
 * Get auto-suggest results for typeahead.
 */
export function getAutoSuggestions(
  prefix: string,
  notes: KnowledgeNote[],
  recentSearches: string[] = [],
  limit: number = 8,
): { type: 'note' | 'recent' | 'intent'; text: string; id?: string }[] {
  const p = prefix.toLowerCase().trim();
  if (p.length < 2) return [];

  const results: { type: 'note' | 'recent' | 'intent'; text: string; id?: string }[] = [];

  // Match knowledge note titles
  for (const note of notes) {
    if (note.title.toLowerCase().includes(p)) {
      results.push({ type: 'note', text: note.title, id: note.id });
    }
  }

  // Match recent searches
  for (const s of recentSearches) {
    if (s.toLowerCase().includes(p)) {
      results.push({ type: 'recent', text: s });
    }
  }

  // Common intent suggestions
  const commonQueries = [
    'What is the late return policy?',
    'How much is the deposit?',
    'Cross-border rental rules',
    'Fuel policy and charges',
    'Insurance packages available',
    'Customer verification checklist',
    'Damage inspection procedure',
    'Cancellation and refund policy',
    'Child seat and accessories',
    'Loyalty program benefits',
    'Mileage limits and overage',
    'Cleaning fee policy',
    'No-show policy',
    'Accident response procedure',
    'Fleet availability check',
    'Pricing and discounts',
    'One-way rental options',
    'Age requirements',
    'Payment methods accepted',
    'Upsell insurance script',
  ];
  for (const cq of commonQueries) {
    if (cq.toLowerCase().includes(p) && !results.find((r) => r.text === cq)) {
      results.push({ type: 'intent', text: cq });
    }
  }

  return results.slice(0, limit);
}
