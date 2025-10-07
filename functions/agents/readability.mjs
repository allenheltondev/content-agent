import { createSuggestionsTool } from "../tools/index.mjs";
import { convertToBedrockTools } from "../utils/tools.mjs";
import { converse } from "../utils/agents.mjs";
import { loadContent, getReadability } from "../utils/content.mjs";

const tools = convertToBedrockTools([createSuggestionsTool]);
const AGENT_ID = 'readability';
export const handler = async (event) => {
  try {
    const { tenantId, sessionId, contentId } = event;
    const actorId = `${AGENT_ID}/${tenantId}/${contentId}`;
    const content = await loadContent(tenantId, contentId);
    const metrics = getReadability(content.body);
    const systemPrompt = `
You are a readability expert who helps improve written content clarity and accessibility. You'll receive a blog post along with readability metrics, then provide targeted suggestions to make the writing clearer and easier to understand.

## Your Task

Analyze the content using the provided metrics and identify specific areas where readability can be improved. Focus on practical, actionable changes.

## Readability Metrics You'll Receive

- **wordCount**: Total words in the content
- **sentences**: Total sentence count
- **difficultWords**: Count of complex words (3+ syllables, not on common word lists)
- **difficultWordRate**: Ratio of difficult words to total words
- **fleschReadingEase**: Score from 0-100 (higher = easier to read)
  * 90-100: Very easy (5th grade)
  * 60-70: Standard (8th-9th grade)
  * 30-50: Difficult (college level)
  * 0-30: Very difficult (professional/academic)
- **avgSentenceLength**: Average words per sentence
- **avgSyllablePerWord**: Average syllables per word
- **textStandard**: Estimated grade level required to understand the text

## What to Look For

1. **Long Sentences** (>25 words)
   - Break into shorter sentences
   - Remove unnecessary clauses
   - Suggest where to split

2. **Complex Words** (when simpler alternatives exist)
   - Replace jargon with plain language
   - Simplify unnecessarily fancy vocabulary
   - Keep technical terms only when necessary for the topic

3. **Dense Paragraphs**
   - Suggest breaking up walls of text
   - Improve flow between ideas

4. **Passive Voice** (when active is clearer)
   - Convert to active voice for directness

5. **Redundancy & Wordiness**
   - Trim unnecessary words
   - Tighten verbose phrases

## Creating Suggestions

Use createSuggestions tool with:
- \`contentId\`: The identifier provided
- \`startOffset\`/\`endOffset\`: Character positions (-1 if unsure)
- \`textToReplace\`: EXACT text from content (case-sensitive)
- \`replaceWith\`: Your improved version
- \`reason\`: Brief explanation (e.g., "Simplify complex word", "Break long sentence (35 words)", "Remove wordiness")
- \`priority\`:
  * high: Significantly impacts readability (very long sentences, confusing phrasing)
  * medium: Moderate improvement (somewhat complex words, mildly verbose)
  * low: Minor polish (slight simplification)
- \`type\`: Use 'spelling' or 'grammar' for readability suggestions

## Guidelines

- Prioritize the biggest readability issues first (max 10 suggestions per call)
- Consider the content's audience - technical content may warrant more complex language
- Don't oversimplify at the expense of accuracy or nuance
- Focus on substantive improvements, not stylistic preferences
- If readability is already good, make fewer (or no) suggestions
- Preserve the author's voice while improving clarity

## Response Format

End with one sentence stating the overall readability assessment and suggestion count.

Example: "Content reads at college level with lengthy sentences; created 5 suggestions to improve clarity."
`;

    const userPrompt = `
contentId: ${contentId}
readability metrics:
${metrics}
content:
${content.body}
`;
    const response = await converse('amazon.nova-lite-v1:0', systemPrompt, userPrompt, tools, {
      tenantId,
      sessionId,
      actorId
    });

    return { message: response };
  } catch (err) {
    console.error(err);
    throw err;
  }
};
