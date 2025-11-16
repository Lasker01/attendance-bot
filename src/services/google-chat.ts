import { GoogleChatMessage, WorkingHoursResult } from '../types';
import { config } from '../config/env';

class GoogleChatService {
  private attendanceWebhookUrl: string;

  constructor() {
    this.attendanceWebhookUrl = config.googleChat.attendanceWebhookUrl;
  }

  private async sendMessage(webhookUrl: string, message: GoogleChatMessage): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to send message to Google Chat: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error sending message to Google Chat: ${error.message}`);
      }
      throw error;
    }
  }

  async sendAttendanceMessage(message: GoogleChatMessage): Promise<void> {
    await this.sendMessage(this.attendanceWebhookUrl, message);
  }

  createCheckInMessage(userName: string, timestamp: Date): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const date = timestamp.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return {
      cards: [
        {
          header: {
            title: '✅ 출근 완료!',
            subtitle: `${userName}님, 좋은 하루 되세요!`,
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `🕐 <b>출근 시간</b><br>${time}`,
                  },
                },
                {
                  textParagraph: {
                    text: `📅 <b>날짜</b><br>${date}`,
                  },
                },
                {
                  textParagraph: {
                    text: `${userName}님, 오늘도 화이팅! 💪`,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  createCheckOutMessage(
    userName: string,
    timestamp: Date,
    workingHours: WorkingHoursResult
  ): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const date = timestamp.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return {
      cards: [
        {
          header: {
            title: '🔴 퇴근 완료!',
            subtitle: `${userName}님, 수고하셨습니다!`,
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `🕐 <b>퇴근 시간</b><br>${time}`,
                  },
                },
                {
                  textParagraph: {
                    text: `📅 <b>날짜</b><br>${date}`,
                  },
                },
                {
                  textParagraph: {
                    text: `⏱️ <b>근무 시간</b><br>${workingHours.workingHours}시간 ${workingHours.workingMinutes}분`,
                  },
                },
                {
                  textParagraph: {
                    text: `${userName}님, 푹 쉬세요! 🌙`,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  createBreakStartMessage(userName: string, timestamp: Date): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const date = timestamp.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return {
      cards: [
        {
          header: {
            title: '⏸️ 휴식 시작',
            subtitle: `${userName}님, 잠시 쉬어가세요!`,
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `🕐 <b>휴식 시작 시간</b><br>${time}`,
                  },
                },
                {
                  textParagraph: {
                    text: `📅 <b>날짜</b><br>${date}`,
                  },
                },
                {
                  textParagraph: {
                    text: `${userName}님, 편히 쉬세요! ☕`,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  createBreakEndMessage(userName: string, timestamp: Date): GoogleChatMessage {
    const time = timestamp.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const date = timestamp.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    return {
      cards: [
        {
          header: {
            title: '▶️ 업무 재개',
            subtitle: `${userName}님, 다시 파이팅!`,
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `🕐 <b>업무 재개 시간</b><br>${time}`,
                  },
                },
                {
                  textParagraph: {
                    text: `📅 <b>날짜</b><br>${date}`,
                  },
                },
                {
                  textParagraph: {
                    text: `${userName}님, 힘내세요! 💪`,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }
}

export const googleChatService = new GoogleChatService();
