import { Router, Request, Response } from 'express';
import { supabaseService } from '../services/supabase';
import { googleChatService } from '../services/google-chat';
import { GoogleChatEvent, AttendanceRecord } from '../types';

const router = Router();

router.post('/bot', async (req: Request, res: Response) => {
  try {
    const event: GoogleChatEvent = req.body;

    if (event.type === 'ADDED_TO_SPACE') {
      return res.status(200).json({
        text: '안녕하세요! 출퇴근 관리 봇입니다. 👋\n\n사용 가능한 명령어:\n• `/출근` - 출근 처리\n• `/퇴근` - 퇴근 처리 및 근무 시간 계산\n• `/휴식` - 휴식 시작 (다시 `/출근`으로 업무 재개)',
      });
    }

    if (event.type === 'MESSAGE' && event.message) {
      const message = (event.message.slashCommand?.commandName || event.message.text || '').trim();
      const userId = event.message.sender.name;
      const userName = event.message.sender.displayName;

      if (message === '/출근') {
        const timestamp = new Date();

        // 즉시 응답 반환 (< 10ms)
        const responseMessage = googleChatService.createCheckInMessage(
          userName,
          timestamp
        );
        res.status(200).json(responseMessage);

        // 백그라운드에서 DB 작업 수행
        setImmediate(async () => {
          try {
            const todayAttendance = await supabaseService.getTodayAttendance(userId);

            const hasCheckedInToday = todayAttendance.some(
              (record) => record.type === 'check-in'
            );

            const lastRecord = todayAttendance.length > 0
              ? todayAttendance[todayAttendance.length - 1]
              : null;
            const isOnBreak = lastRecord?.type === 'break-start';

            // 중복 출근이 아니거나 휴식 종료인 경우만 저장
            if (!hasCheckedInToday || isOnBreak) {
              const record: AttendanceRecord = {
                user_id: userId,
                user_name: userName,
                type: isOnBreak ? 'break-end' : 'check-in',
                timestamp: timestamp.toISOString(),
              };

              await supabaseService.saveAttendance(record);
            }
          } catch (error) {
            console.error('Error in background attendance processing:', error);
          }
        });

        return;
      } else if (message === '/휴식') {
        const timestamp = new Date();

        // 즉시 응답 반환
        const responseMessage = googleChatService.createBreakStartMessage(
          userName,
          timestamp
        );
        res.status(200).json(responseMessage);

        // 백그라운드에서 검증 및 저장
        setImmediate(async () => {
          try {
            const lastRecord = await supabaseService.getLastRecord(userId);

            // 유효한 상태인 경우만 저장
            if (lastRecord &&
                lastRecord.type !== 'check-out' &&
                lastRecord.type !== 'break-start') {
              const record: AttendanceRecord = {
                user_id: userId,
                user_name: userName,
                type: 'break-start',
                timestamp: timestamp.toISOString(),
              };

              await supabaseService.saveAttendance(record);
            }
          } catch (error) {
            console.error('Error in background break processing:', error);
          }
        });

        return;
      } else if (message === '/퇴근') {
        const timestamp = new Date();

        // 빠른 조회 및 계산
        const todayAttendance = await supabaseService.getTodayAttendance(userId);

        const hasCheckedIn = todayAttendance.some(
          (record) => record.type === 'check-in'
        );

        if (!hasCheckedIn) {
          return res.status(200).json({
            text: '⚠️ 출근 기록이 없습니다. 먼저 출근 처리를 해주세요.',
          });
        }

        const hasCheckedOutToday = todayAttendance.some(
          (record) => record.type === 'check-out'
        );

        if (hasCheckedOutToday) {
          return res.status(200).json({
            text: '⚠️ 이미 오늘 퇴근 처리가 되어 있습니다.',
          });
        }

        const lastRecord = todayAttendance.length > 0
          ? todayAttendance[todayAttendance.length - 1]
          : null;

        if (lastRecord?.type === 'break-start') {
          return res.status(200).json({
            text: '⚠️ 휴식 중입니다. /출근 명령어로 업무를 재개한 후 퇴근해주세요.',
          });
        }

        const record: AttendanceRecord = {
          user_id: userId,
          user_name: userName,
          type: 'check-out',
          timestamp: timestamp.toISOString(),
        };

        // 근무 시간 즉시 계산 (로컬 계산이므로 빠름)
        const allTodayRecords = [...todayAttendance, record];
        const workingHours = supabaseService.calculateWorkingHours(allTodayRecords);

        // 응답 즉시 반환
        const responseMessage = googleChatService.createCheckOutMessage(
          userName,
          timestamp,
          workingHours
        );
        res.status(200).json(responseMessage);

        // 저장만 백그라운드에서 수행
        setImmediate(async () => {
          try {
            await supabaseService.saveAttendance(record);
          } catch (error) {
            console.error('Error saving checkout record:', error);
          }
        });

        return;
      }
    }

    return res.status(200).json({});
  } catch (error) {
    return res.status(200).json({
      text: '❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

export default router;
