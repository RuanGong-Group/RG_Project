
interface HighlightedSentenceProps {
  sentence: string;
  highlight: string;
}

export default function HighlightedSentence({ sentence, highlight }: HighlightedSentenceProps) {
  if (!highlight || !sentence || typeof sentence !== 'string') {
    return <span>{sentence}</span>;
  }
  const parts = sentence.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="font-bold text-blue-600 bg-yellow-100 px-1 rounded">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}
