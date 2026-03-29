import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDiary } from '../services/geminiService';
import { PenLine, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Diary {
  id: string;
  text: string;
  reply: string;
  emotion: string;
  summary: string;
  moodColor: string;
  safetyAlert: boolean;
  createdAt: any;
}

export default function StudentDashboard() {
  const { user, profile, logout } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [newDiary, setNewDiary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'diaries'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const diaryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Diary[];
      setDiaries(diaryData);
    }, (err) => {
      console.error('Error fetching diaries:', err);
    });

    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDiary.trim() || !user || !profile) return;

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Get AI Analysis
      const analysis = await analyzeDiary(user.uid, profile.name, newDiary);

      // 2. Save to Firestore
      await addDoc(collection(db, 'diaries'), {
        uid: user.uid,
        studentName: profile.name,
        text: newDiary,
        reply: analysis.reply,
        emotion: analysis.emotion,
        summary: analysis.summary,
        moodColor: analysis.mood_color,
        safetyAlert: analysis.safety_alert,
        createdAt: serverTimestamp(),
      });

      setNewDiary('');
    } catch (err) {
      console.error('Error submitting diary:', err);
      setError('일기를 저장하는 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-amber-600">안녕, {profile?.name}아! 👋</h1>
            <p className="text-gray-500 text-sm">오늘 하루는 어땠니? 선생님한테 이야기해줘.</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Write Diary Section */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
                <PenLine size={20} className="text-amber-500" />
                새 일기 쓰기
              </h2>
              <form onSubmit={handleSubmit}>
                <textarea
                  value={newDiary}
                  onChange={(e) => setNewDiary(e.target.value)}
                  placeholder="오늘 있었던 일이나 지금 기분을 자유롭게 적어봐요..."
                  className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none mb-4 bg-gray-50"
                  disabled={isSubmitting}
                />
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting || !newDiary.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      선생님이 읽고 있어요...
                    </>
                  ) : (
                    '일기 저장하기'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Past Diaries Section */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">나의 마음 기록장 📖</h2>
            
            {diaries.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm text-center text-gray-500">
                아직 작성한 일기가 없어요. 첫 번째 일기를 써볼까요?
              </div>
            ) : (
              diaries.map((diary) => (
                <div key={diary.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div 
                    className="h-2 w-full" 
                    style={{ backgroundColor: diary.moodColor || '#fbbf24' }} 
                  />
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-sm text-gray-400">
                        {diary.createdAt ? format(diary.createdAt.toDate(), 'yyyy년 M월 d일 (EEEE) a h:mm', { locale: ko }) : '방금 전'}
                      </span>
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${diary.moodColor}20`, color: diary.moodColor }}
                      >
                        {diary.emotion}
                      </span>
                    </div>
                    
                    <p className="text-gray-800 mb-6 whitespace-pre-wrap leading-relaxed">
                      {diary.text}
                    </p>
                    
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 relative">
                      <div className="absolute -top-3 left-4 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md">
                        AI 선생님의 답장
                      </div>
                      <p className="text-amber-900 mt-2 leading-relaxed">
                        {diary.reply}
                      </p>
                      {diary.safetyAlert && (
                        <div className="mt-4 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                          <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
                          <p>선생님과 직접 이야기해보는 게 좋겠어. 언제든 선생님한테 와서 말해주렴.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
