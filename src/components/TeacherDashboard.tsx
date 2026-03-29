import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, AlertTriangle, Activity } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Diary {
  id: string;
  uid: string;
  studentName: string;
  text: string;
  reply: string;
  emotion: string;
  summary: string;
  moodColor: string;
  safetyAlert: boolean;
  createdAt: any;
}

const EMOTION_COLORS: Record<string, string> = {
  '기쁨': '#FCD34D', // amber-300
  '평온': '#86EFAC', // green-300
  '슬픔': '#93C5FD', // blue-300
  '화남': '#FCA5A5', // red-300
  '불안': '#C4B5FD', // violet-300
};

export default function TeacherDashboard() {
  const { profile, logout } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all diaries for the class
    const q = query(
      collection(db, 'diaries'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const diaryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Diary[];
      setDiaries(diaryData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching diaries:', err);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const todayDiaries = diaries.filter(d => d.createdAt && isToday(d.createdAt.toDate()));
  
  // Aggregate emotions for today
  const emotionCounts = todayDiaries.reduce((acc, curr) => {
    acc[curr.emotion] = (acc[curr.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(emotionCounts).map(key => ({
    name: key,
    value: emotionCounts[key],
    color: EMOTION_COLORS[key] || '#CBD5E1'
  }));

  const safetyAlerts = diaries.filter(d => d.safetyAlert);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-indigo-500" />
              학급 무드보드 (선생님용)
            </h1>
            <p className="text-slate-500 text-sm mt-1">오늘 우리 반 아이들의 마음 날씨를 확인하세요.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {profile?.name} 선생님
            </span>
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Activity className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Stats & Chart */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-4">오늘의 마음 날씨 🌤️</h2>
                {chartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}명`, '학생 수']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm text-center">
                    아직 오늘 작성된 일기가 없습니다.
                  </div>
                )}
                <div className="mt-4 text-center text-slate-600 font-medium">
                  오늘 총 <span className="text-indigo-600 text-xl">{todayDiaries.length}</span>명의 학생이 일기를 썼어요.
                </div>
              </div>

              {/* Safety Alerts */}
              {safetyAlerts.length > 0 && (
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <h2 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    관심 필요 학생 ({safetyAlerts.length})
                  </h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {safetyAlerts.map(alert => (
                      <div key={alert.id} className="bg-white p-3 rounded-xl shadow-sm border border-red-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{alert.studentName}</span>
                          <span className="text-xs text-slate-500">
                            {alert.createdAt ? format(alert.createdAt.toDate(), 'M/d HH:mm') : ''}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 truncate">{alert.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Recent Diaries Feed */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
                <h2 className="text-xl font-bold text-slate-800 mb-6">최근 작성된 일기 📝</h2>
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                  {diaries.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                      작성된 일기가 없습니다.
                    </div>
                  ) : (
                    diaries.map(diary => (
                      <div key={diary.id} className="p-5 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors bg-slate-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: diary.moodColor || '#94a3b8' }}>
                              {diary.studentName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-800">{diary.studentName}</h3>
                              <p className="text-xs text-slate-500">
                                {diary.createdAt ? format(diary.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : '방금 전'}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: diary.moodColor, color: diary.moodColor, backgroundColor: `${diary.moodColor}10` }}>
                            {diary.emotion}
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-slate-700 text-sm leading-relaxed mb-2">{diary.text}</p>
                          <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                            <p className="text-xs font-semibold text-indigo-800 mb-1">AI 요약</p>
                            <p className="text-sm text-indigo-900">{diary.summary}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
