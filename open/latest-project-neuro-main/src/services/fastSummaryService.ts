/**
 * Fast local summary service - replaces slow external API
 */

const BACKEND_URL = 'http://localhost:5001';

export interface FastSummary {
  title: string;
  duration: string;
  participants: string[];
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>;
  tags: string[];
}

/**
 * Fast text summarization using local processing
 */
export async function summarizeTextFast(text: string): Promise<FastSummary> {
  try {
    const response = await fetch(`${BACKEND_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const summary = await response.json();
    return summary;
  } catch (error) {
    console.error('❌ Fast summary error:', error);
    
    // Fallback to client-side processing if server fails
    return generateClientSideSummary(text);
  }
}

/**
 * Client-side fallback summary generation
 */
function generateClientSideSummary(text: string): FastSummary {
  const words = text.split(/\s+/);
  const wordCount = words.length;
  
  // Extract potential participants (capitalized words)
  const participants = Array.from(new Set(
    words
      .filter(word => /^[A-Z][a-z]+$/.test(word))
      .filter(word => !['The', 'This', 'That', 'And', 'But', 'For', 'With', 'From', 'To'].includes(word))
  )).slice(0, 5);

  // Generate key points from sentences
  const sentences = text
    .replace(/[!?]/g, '.')
    .split('.')
    .map(s => s.trim())
    .filter(s => s.length > 20);

  const keyPoints = sentences.slice(0, 5);

  // Simple action item detection
  const actionItems = sentences
    .filter(s => /\b(will|should|need to|must|plan to|going to|todo|task)\b/i.test(s))
    .slice(0, 3)
    .map(task => ({
      task: task.substring(0, 100),
      assignee: participants[0] || undefined
    }));

  // Generate tags based on content
  const tags = [];
  const textLower = text.toLowerCase();
  
  if (/\b(meeting|discussion|conference)\b/.test(textLower)) tags.push('meeting');
  if (/\b(project|development|build)\b/.test(textLower)) tags.push('project');
  if (/\b(plan|schedule|timeline)\b/.test(textLower)) tags.push('planning');
  if (/\b(review|feedback|evaluation)\b/.test(textLower)) tags.push('review');
  if (/\b(code|system|software|technical)\b/.test(textLower)) tags.push('technical');
  if (/\b(business|strategy|market|customer)\b/.test(textLower)) tags.push('business');

  return {
    title: `Summary (${wordCount} words)`,
    duration: `~${Math.max(1, Math.ceil(wordCount / 150))} min read`,
    participants,
    keyPoints: keyPoints.length > 0 ? keyPoints : ['No specific key points identified'],
    actionItems,
    tags: tags.length > 0 ? tags : ['general']
  };
}

/**
 * Format summary for display
 */
export function formatSummaryForDisplay(summary: FastSummary): string {
  let formatted = `# ${summary.title}\n\n`;
  
  if (summary.duration) {
    formatted += `**Duration:** ${summary.duration}\n\n`;
  }
  
  if (summary.participants.length > 0) {
    formatted += `**Participants:** ${summary.participants.join(', ')}\n\n`;
  }
  
  if (summary.keyPoints.length > 0) {
    formatted += `## Key Points\n`;
    summary.keyPoints.forEach((point, index) => {
      formatted += `${index + 1}. ${point}\n`;
    });
    formatted += '\n';
  }
  
  if (summary.actionItems.length > 0) {
    formatted += `## Action Items\n`;
    summary.actionItems.forEach((item, index) => {
      formatted += `${index + 1}. ${item.task}`;
      if (item.assignee) formatted += ` (${item.assignee})`;
      if (item.deadline) formatted += ` - Due: ${item.deadline}`;
      formatted += '\n';
    });
    formatted += '\n';
  }
  
  if (summary.tags.length > 0) {
    formatted += `**Tags:** ${summary.tags.join(', ')}\n`;
  }
  
  return formatted;
}

/**
 * Validate summary object
 */
export function validateSummary(summary: any): summary is FastSummary {
  return (
    summary &&
    typeof summary.title === 'string' &&
    typeof summary.duration === 'string' &&
    Array.isArray(summary.participants) &&
    Array.isArray(summary.keyPoints) &&
    Array.isArray(summary.actionItems) &&
    Array.isArray(summary.tags)
  );
}
