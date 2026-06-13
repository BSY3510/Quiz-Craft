// Gemini 구조 강제 출력 스키마 (responseSchema 용)

import { SchemaType, type ResponseSchema } from '@google/generative-ai'

// 생성 결과(배열) 스키마. responseSchema 로 넘기면 모델이 따옴표 누락·
// 이스케이프 깨짐 같은 무효 JSON을 만들지 못하도록 생성 자체를 제약한다(오류 #2/#3 예방).
export const QUESTION_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      type: { type: SchemaType.STRING },
      question_text: { type: SchemaType.STRING },
      code_snippet: { type: SchemaType.STRING, nullable: true },
      options: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            text: { type: SchemaType.STRING },
          },
          required: ['id', 'text'],
        },
      },
      answer_id: { type: SchemaType.STRING },
      explanation: { type: SchemaType.STRING },
      difficulty: { type: SchemaType.STRING },
    },
    required: ['question_text', 'options', 'answer_id', 'explanation', 'difficulty'],
  },
}

// AI 2차 검증 응답용 스키마. [{ index, valid, reason }]
export const VALIDATION_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      index: { type: SchemaType.INTEGER },
      valid: { type: SchemaType.BOOLEAN },
      reason: { type: SchemaType.STRING, nullable: true },
    },
    required: ['index', 'valid'],
  },
}
