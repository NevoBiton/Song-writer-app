import { Injectable } from '@nestjs/common';

interface Skill {
  keywords: string[];
  promptInjection: string;
}

const SKILLS: Skill[] = [
  {
    keywords: ['write a song', 'create a song', 'new song', 'compose', 'help me write', 'start a song'],
    promptInjection:
      'The user wants to create a song. Guide them step by step: suggest a title if they don\'t have one, ask for the key (or suggest one based on their mood/genre), pick a structure (verse-chorus, AABA), then help write the first section. Ask one question at a time.',
  },
  {
    keywords: ['chord progression', 'what chords', 'chords for', 'chord sequence', 'chord changes'],
    promptInjection:
      'The user is asking about chord progressions. Suggest 2-3 progressions that fit their genre and key. Name the chords, show the roman numeral function (I, IV, V etc.), and briefly explain why they work together.',
  },
  {
    keywords: ['capo', 'capo on', 'capo fret', 'using capo'],
    promptInjection:
      'The user is asking about capo. Explain how placing a capo raises the key, suggest the ideal fret for their target key, and show the resulting open chord shapes they can use.',
  },
  {
    keywords: ['verse', 'chorus', 'bridge', 'song structure', 'song form', 'pre-chorus', 'outro', 'intro'],
    promptInjection:
      'The user is asking about song structure. Explain the common forms (Verse-Chorus, AABA, Through-Composed) and help them decide which fits their song idea. Give concrete examples from well-known songs.',
  },
  {
    keywords: ['lyrics', 'write lyrics', 'lyric', 'rhyme', 'rhyming'],
    promptInjection:
      'The user wants help with lyrics. Focus on: theme and emotion first, then suggest a rhyme scheme (ABAB, AABB, ABCB), and offer a sample first line or couplet to get them started.',
  },
];

@Injectable()
export class SkillsService {
  detect(message: string): string {
    const lower = message.toLowerCase();
    const matched = SKILLS.find(skill => skill.keywords.some(kw => lower.includes(kw)));
    return matched?.promptInjection ?? '';
  }
}
