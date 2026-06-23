import type { Poll } from '../shared';

export const fixturePoll: Poll = {
  id: 'verif-fixture-1',
  question: '다음 팀 회식 장소는 어디로 할까요?',
  description: '이번 분기 실적 축하 + 신규 멤버 환영 겸 가볍게!',
  options: [
    { id: 1, text: '강남 고기집 (삼겹살)', voteCount: 14, imageUrl: null },
    { id: 2, text: '홍대 파스타 & 와인', voteCount: 7, imageUrl: null },
    { id: 3, text: '을지로 포차 (치킨+맥주)', voteCount: 11, imageUrl: null },
  ],
  comments: [
    {
      id: 101,
      voterName: '지수',
      comment: '고기집이 회식 분위기 최고예요 🔥',
      createdAt: '2026-06-20T10:05:00Z',
      selectedOptionText: '강남 고기집 (삼겹살)',
    },
    {
      id: 102,
      voterName: '민준',
      comment: '파스타도 괜찮지만 고기파가 많을 듯',
      createdAt: '2026-06-20T10:12:00Z',
      selectedOptionText: undefined,
    },
  ],
  createdAt: '2026-06-20T10:00:00Z',
  totalVotes: 32,
  resultsVisibility: 'always',
  creatorId: 'owner-1',
  endsAt: null,
};
