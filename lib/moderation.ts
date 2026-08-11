import dictionary from './badwords.json'

const badWordsList: string[] = dictionary.badWords.bad || []

export function containsInappropriateContent(text: string): boolean {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase().trim();
  const wordsInText = normalizedText.split(/[\s,.;!?]+/);
  
  return wordsInText.some(word => badWordsList.includes(word));
}