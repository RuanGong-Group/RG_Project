import type { TodayPlanResponse } from '../../../types/api';

interface ReviewCardProps {
  plan: TodayPlanResponse;
}

export default function ReviewCard({ plan }: ReviewCardProps) {
  if (plan.review.dueCount <= 0) return null;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
        🔄 待复习（{plan.review.dueCount} 个单词）
      </h2>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {plan.review.words.slice(0, 10).map((word) => (
          <div
            key={word.wordId}
            style={{
              padding: '12px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontWeight: '500' }}>{word.word}</span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {word.dueMeanings}/{word.totalMeanings} 个词义待复习
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
