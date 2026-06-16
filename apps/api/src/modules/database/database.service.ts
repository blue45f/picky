import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Poll } from '@picky/shared';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private filePath = path.resolve(process.cwd(), 'db.json');
  private data: { polls: Poll[] } = { polls: [] };

  onModuleInit() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        // Seed default template question for onboarding
        this.data = {
          polls: [
            {
              id: 'seed-onboarding-poll',
              question:
                'WebstormProjects 개인 프로젝트들 중 어떤 것을 가장 먼저 상용 서비스화 시킬까요?',
              description:
                '일상에서 고민되는 것들을 지인들에게 쉽게 물어보는 pickflow(피키) 서비스 출시를 축하하며, 다음 개인 프로젝트 중 하나를 상용 런칭하고 싶습니다. 여러분의 선택은?',
              options: [
                {
                  id: 1,
                  text: 'PromptMarket (프롬프트/에이전트 마켓)',
                  voteCount: 15,
                  imageUrl:
                    'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=400&q=80',
                },
                {
                  id: 2,
                  text: 'proto-live (바이브코딩 코드 공유 플랫폼)',
                  voteCount: 12,
                  imageUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80',
                },
                {
                  id: 3,
                  text: 'family-care-platform (실버 케어 매칭 서비스)',
                  voteCount: 8,
                  imageUrl:
                    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80',
                },
                {
                  id: 4,
                  text: 'orbit-ui (유려한 글라스모피즘 컴포넌트 킷)',
                  voteCount: 19,
                  imageUrl:
                    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80',
                },
              ],
              comments: [
                {
                  id: 1,
                  voterName: '시니어FE',
                  comment:
                    'PromptMarket이 요즘 AI 트렌드에 가장 정합해서 비즈니스 잠재력이 큽니다!',
                  createdAt: new Date().toISOString(),
                  selectedOptionId: 1,
                  selectedOptionText: 'PromptMarket (프롬프트/에이전트 마켓)',
                },
                {
                  id: 2,
                  voterName: '김희준',
                  comment:
                    '역시 Orbit UI 가 유려한 컴포넌트 킷이라 디자이너들에게 인기가 많을 것 같네요.',
                  createdAt: new Date().toISOString(),
                  selectedOptionId: 4,
                  selectedOptionText: 'orbit-ui (유려한 글라스모피즘 컴포넌트 킷)',
                },
              ],
              createdAt: new Date().toISOString(),
              totalVotes: 54,
            },
          ],
        };
        this.save();
      }
    } catch (error) {
      console.error('Failed to load JSON database, resetting in memory:', error);
      this.data = { polls: [] };
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save JSON database:', error);
    }
  }

  getPolls(): Poll[] {
    return this.data.polls;
  }

  getPollById(id: string): Poll | undefined {
    return this.data.polls.find((p) => p.id === id);
  }

  createPoll(poll: Poll) {
    this.data.polls.unshift(poll);
    this.save();
  }

  updatePoll(poll: Poll) {
    const idx = this.data.polls.findIndex((p) => p.id === poll.id);
    if (idx !== -1) {
      this.data.polls[idx] = poll;
      this.save();
    }
  }
}
