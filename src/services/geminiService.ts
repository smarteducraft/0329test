import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemInstruction = `
# 역할: 초등학교 5학년 'AI 마음 일기' 상담사 및 학급 무드보드 데이터 분석가

# 페르소나:
- 초등학교 5학년 학생의 눈높이에 맞춰 다정하고 따뜻한 말투를 사용하는 'AI 선생님'입니다.
- 학생의 이름을 다정하게 부르며(예: "민수야, 오늘 아침은 그런 기분이구나!"), 진심 어린 공감과 격려를 건넵니다.

# 주요 임무:
1. [공감 답글]: 학생이 작성한 일기 내용을 분석하여 따뜻하고 긍정적인 피드백을 생성합니다.
2. [감정 분류]: 학급 전체 무드보드 시각화를 위해 학생의 감정을 5가지(기쁨, 평온, 슬픔, 화남, 불안) 중 하나로 분류합니다.
3. [데이터 구조화]: 외부 파이어베이스(Firebase) 데이터베이스에 저장하기 적합하도록 모든 응답을 JSON 형식으로 출력합니다.

# 데이터 처리 규칙:
- 입력 데이터에 포함된 \`student_name\`을 확인하여 답글의 시작이나 끝에 반드시 이름을 언급합니다.
- 학생이 비속어를 쓰거나 위험한 감정(자해/타해 등)을 보일 경우, 공감 대신 "이 내용은 선생님과 직접 이야기해보는 게 좋겠어"라고 안내하고 \`safety_alert\`를 true로 설정합니다.
- 출력은 반드시 순수한 JSON 코드만 제공하며, 다른 설명 텍스트는 덧붙이지 않습니다.
`;

export interface DiaryAnalysisResult {
  reply: string;
  emotion: '기쁨' | '평온' | '슬픔' | '화남' | '불안';
  summary: string;
  mood_color: string;
  safety_alert: boolean;
}

export async function analyzeDiary(studentId: string, studentName: string, diaryText: string): Promise<DiaryAnalysisResult> {
  const inputData = {
    student_id: studentId,
    student_name: studentName,
    diary_text: diaryText,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-preview',
    contents: JSON.stringify(inputData),
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "학생에게 보내는 따뜻한 공감 답글 (이름 포함)",
          },
          emotion: {
            type: Type.STRING,
            enum: ["기쁨", "평온", "슬픔", "화남", "불안"],
            description: "분류된 감정",
          },
          summary: {
            type: Type.STRING,
            description: "일기 요약",
          },
          mood_color: {
            type: Type.STRING,
            description: "감정에 따른 색상 (Hex 코드, 예: #FFD700)",
          },
          safety_alert: {
            type: Type.BOOLEAN,
            description: "위험 감지 여부",
          },
        },
        required: ["reply", "emotion", "summary", "mood_color", "safety_alert"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('AI 응답이 비어있습니다.');
  }

  return JSON.parse(text) as DiaryAnalysisResult;
}
