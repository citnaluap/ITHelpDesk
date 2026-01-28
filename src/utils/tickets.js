export const toDisplayText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const ARTIFACT_LINE_PATTERNS = [
  /\[cid:[^\]]+\]/i,
  /^\s*-+\s*reply\b.*\bline\s*-+\s*$/i,
  /^\s*reply\b.*\bline\s*$/i,
  /^\s*-+\s*original message\s*-+\s*$/i,
  /^\s*-+\s*forwarded message\s*-+\s*$/i,
  /^\s*from:\s*/i,
  /^\s*sent:\s*/i,
  /^\s*to:\s*/i,
  /^\s*subject:\s*/i,
  /^\s*sent from my (iphone|ipad|ipod|android|phone|mobile)\b/i,
  /^\s*sent from my (windows|mobile|blackberry)\b/i,
  /^\s*sent from outlook\b/i,
  /^\s*get outlook for (ios|android)\b/i,
];

const stripArtifactLines = (lines) =>
  lines.filter((line) => !ARTIFACT_LINE_PATTERNS.some((pattern) => pattern.test(line)));

const extractDiscussionSection = (value) => {
  const text = toDisplayText(value);
  if (!text) return '';

  const lines = text.split(/\r?\n/);
  const discussionIndex = lines.findIndex((line) => /^\s*Discussion\s*[:\-]*\s*$/i.test(line));

  let targetLines = lines;
  if (discussionIndex !== -1) {
    let start = discussionIndex + 1;
    while (start < lines.length && lines[start].trim() === '') {
      start += 1;
    }

    const disclaimerIndex = lines.findIndex(
      (line, index) => index > discussionIndex && /^\s*\*{0,3}Disclaimer\b/i.test(line),
    );
    const endLimit = disclaimerIndex === -1 ? lines.length : disclaimerIndex;

    let end = endLimit;
    while (end > start && lines[end - 1].trim() === '') {
      end -= 1;
    }

    targetLines = lines.slice(start, end);
  }

  const cleaned = stripArtifactLines(targetLines).join('\n').trim();
  return cleaned;
};

export const getTicketSummary = (ticket, maxLength = 200) => {
  const raw = toDisplayText(
    ticket?.description ||
      ticket?.details ||
      ticket?.notes ||
      ticket?.body ||
      ticket?.emailBody ||
      ticket?.rawBody ||
      '',
  );
  const cleaned = extractDiscussionSection(raw);
  const normalized = cleaned.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  const sentenceEnd = normalized.slice(0, maxLength).search(/[.!?]\s/);
  if (sentenceEnd > 80) {
    return `${normalized.slice(0, sentenceEnd + 1).trim()}...`;
  }
  return `${normalized.slice(0, maxLength).trim()}...`;
};

export const getTicketDescription = (ticket) => {
  if (!ticket) return '';
  const raw =
    ticket.description ||
    ticket.details ||
    ticket.notes ||
    ticket.body ||
    ticket.emailBody ||
    ticket.rawBody ||
    '';
  return extractDiscussionSection(raw);
};
