/**
 * 打卡日历组件
 * 显示当月的打卡记录（GitHub 风格）
 */

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface CalendarDay {
  date: string;
  wordsLearned: number;
  wordsReviewed: number;
  goalCompleted: boolean;
  consecutiveDays: number;
  icon: string;
  achievements: string[];
}

interface CheckInCalendarProps {
  year?: number;
  month?: number;
}

export default function CheckInCalendar({ year, month }: CheckInCalendarProps) {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 默认显示当前月份
  const now = new Date();
  const displayYear = year || now.getFullYear();
  const displayMonth = month || now.getMonth() + 1;

  // 加载日历数据
  useEffect(() => {
    loadCalendar();
  }, [displayYear, displayMonth]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('jm_token');
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}/checkin/calendar/${displayYear}/${displayMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCalendarDays(response.data.data.days);
      }
    } catch (err: any) {
      console.error('加载打卡日历失败:', err);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 构建日历网格（包含空白占位）
  const buildCalendarGrid = () => {
    const firstDay = new Date(displayYear, displayMonth - 1, 1).getDay(); // 0=周日
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    
    // 调整：周一作为第一天
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    
    const grid: (CalendarDay | null)[] = [];
    
    // 添加空白占位
    for (let i = 0; i < firstDayAdjusted; i++) {
      grid.push(null);
    }
    
    // 添加实际日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarDays.find(d => d.date === dateStr);
      
      if (dayData) {
        grid.push(dayData);
      } else {
        // 未打卡的日期
        grid.push({
          date: dateStr,
          wordsLearned: 0,
          wordsReviewed: 0,
          goalCompleted: false,
          consecutiveDays: 0,
          icon: '',
          achievements: []
        });
      }
    }
    
    return grid;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="text-center text-gray-500">加载日历中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  const grid = buildCalendarGrid();
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
        📅 本月打卡记录
        <span className="ml-2 text-sm text-gray-500 font-normal">
          {displayYear}年{displayMonth}月
        </span>
      </h2>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, index) => {
          if (!day) {
            // 空白占位
            return <div key={`empty-${index}`} className="aspect-square"></div>;
          }

          const isToday = day.date === new Date().toISOString().split('T')[0];
          const isFuture = new Date(day.date) > new Date();
          const hasCheckedIn = day.wordsLearned > 0 || day.wordsReviewed > 0;

          return (
            <div
              key={day.date}
              className={`
                aspect-square flex items-center justify-center rounded text-2xl
                transition-all cursor-pointer relative group
                ${isToday ? 'ring-2 ring-amber-500' : ''}
                ${isFuture ? 'opacity-30 cursor-not-allowed' : ''}
                ${hasCheckedIn ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50 hover:bg-gray-100'}
              `}
              title={`${day.date}\n学习：${day.wordsLearned}词\n复习：${day.wordsReviewed}词\n连续：${day.consecutiveDays}天`}
            >
              {/* 显示图标或日期 */}
              {hasCheckedIn ? (
                <span>{day.icon || '✅'}</span>
              ) : (
                <span className="text-xs text-gray-400">
                  {parseInt(day.date.split('-')[2])}
                </span>
              )}

              {/* Hover 悬浮卡片 */}
              {hasCheckedIn && !isFuture && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    <div>{day.date}</div>
                    <div>学习 {day.wordsLearned} / 复习 {day.wordsReviewed}</div>
                    {day.consecutiveDays > 1 && <div>连续 {day.consecutiveDays} 天</div>}
                    {day.achievements.length > 0 && (
                      <div className="text-yellow-300">🏆 新成就 x{day.achievements.length}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 图例说明 */}
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-gray-50 border border-gray-200 rounded"></span>
          <span>未打卡</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-amber-50 border border-amber-200 rounded flex items-center justify-center text-xs">✅</span>
          <span>已打卡</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-amber-50 border border-amber-200 rounded flex items-center justify-center text-xs">🔥</span>
          <span>特殊成就</span>
        </div>
      </div>
    </div>
  );
}
