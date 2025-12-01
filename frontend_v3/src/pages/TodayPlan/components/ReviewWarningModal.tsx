import type { TodayPlanResponse } from '../../../types/api';

interface ReviewWarningModalProps {
  plan: TodayPlanResponse;
  onClose: () => void;
  onConfirmReview: () => void;
  onConfirmNew: () => void;
}

export default function ReviewWarningModal({ 
  plan, 
  onClose, 
  onConfirmReview, 
  onConfirmNew 
}: ReviewWarningModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#333'
        }}>
          ⚠️ 温馨提示
        </h3>
        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '24px',
          textAlign: 'center',
          color: '#666'
        }}>
          您还有 <strong style={{ color: '#10b981', fontSize: '18px' }}>{plan.review.dueCount}</strong> 个单词待复习，
          建议先完成复习以巩固记忆。
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onClick={onConfirmReview}
          >
            去复习
          </button>
          <button
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onClick={onConfirmNew}
          >
            继续学习新词
          </button>
        </div>
      </div>
    </div>
  );
}
