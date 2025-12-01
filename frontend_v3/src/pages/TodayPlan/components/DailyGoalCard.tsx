import type { TodayPlanResponse } from '../../../types/api';

interface DailyGoalCardProps {
  plan: TodayPlanResponse;
}

export default function DailyGoalCard({ plan }: DailyGoalCardProps) {
  // 计算总完成数和进度百分比
  const totalCompleted = plan.progress.total;
  const progressPercent = plan.dailyGoal > 0
    ? Math.round((totalCompleted / plan.dailyGoal) * 100)
    : 0;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
        📊 每日目标
      </h2>
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px'
        }}>
          <span>已完成 {totalCompleted} / {plan.dailyGoal} 个单词</span>
          <span>{progressPercent}%</span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
        <div style={{
          width: `${Math.min(progressPercent, 100)}%`,
          height: '100%',
          backgroundColor: progressPercent >= 100 ? '#B8935F' : '#D4A574',
          transition: 'width 0.3s'
        }} />
      </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        fontSize: '14px'
      }}>
        <div>
          <span style={{ color: '#8c8c8c' }}>今日新学：</span>
          <strong style={{ marginLeft: '8px', color: '#1890ff' }}>{plan.progress.learned}</strong>
        </div>
        <div>
          <span style={{ color: '#8c8c8c' }}>今日复习：</span>
          <strong style={{ marginLeft: '8px', color: '#52c41a' }}>{plan.progress.reviewed}</strong>
        </div>
        <div>
          <span style={{ color: '#8c8c8c' }}>总计：</span>
          <strong style={{ marginLeft: '8px', color: '#722ed1' }}>{totalCompleted}</strong>
        </div>
      </div>
    </div>
  );
}
