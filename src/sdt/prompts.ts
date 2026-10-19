/**
 * SDT (D40): the five paragraphs the SSB asks for, in its order, written in
 * fifteen minutes. The same five every time, so there is no bank and nothing
 * to seed: a sitting is a plain `start_session('sdt')`.
 */
export const PROMPTS = [
  { key: 'parents', text: 'What do your parents think of you?' },
  { key: 'teachers', text: 'What do your teachers (or employers) think of you?' },
  { key: 'friends', text: 'What do your friends and colleagues think of you?' },
  { key: 'self', text: 'What do you think of yourself?' },
  { key: 'become', text: 'What kind of person would you like to become, and what qualities would you like to develop?' },
] as const;

export type PromptKey = (typeof PROMPTS)[number]['key'];
