import { Visitor } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { env } from '../../../config/env-config';
import { CUSTOMER_AUTH } from '../../../constants/config.constants';
import { ResponseMessages, ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { generateToken, tokenExpiresInSeconds } from '../../../utils/generate-token.util';
import { toRupees } from '../../../utils/money.util';
import { generateOtp, hashOtp, otpMatches } from '../../../utils/otp.util';
import { SmsProvider } from '../../../utils/sms.util';
import { formatDateOnly, minutesFromNow, parseDateOnly } from '../../../utils/time.util';
import { VisitorRepository } from '../repositories/visitor.repository';
import {
  CustomerDto,
  CustomersQuery,
  OtpSentDto,
  UpdateProfileInput,
  VerifyOtpInput,
  VisitorDto,
  VisitorSessionDto,
} from '../types/visitor.types';

const HOUR_MS = 60 * 60 * 1000;

export const toVisitorDto = (visitor: Visitor): VisitorDto => ({
  id: visitor.id,
  name: visitor.name,
  phone: visitor.phone,
  email: visitor.email,
  birthday: visitor.birthday ? formatDateOnly(visitor.birthday) : null,
  createdAt: visitor.createdAt,
  lastSeenAt: visitor.lastSeenAt,
});

type BookingStat = Awaited<ReturnType<VisitorRepository['bookingStatsForPhones']>>[number];

const toCustomerDto = (visitor: Visitor, stat?: BookingStat): CustomerDto => ({
  id: visitor.id,
  name: visitor.name,
  phone: visitor.phone,
  email: visitor.email,
  count: stat?._count._all ?? 0,
  totalSpent: toRupees(stat?._sum.totalPaise ?? 0),
  firstSeen: visitor.createdAt,
  lastSeen: visitor.lastSeenAt,
  lastBookingAt: stat?._max.createdAt ?? null,
});

export class VisitorService {
  constructor(
    private readonly visitorRepository: VisitorRepository,
    private readonly smsProvider: SmsProvider,
  ) {}

  // Customer login

  async sendOtp(phone: string): Promise<OtpSentDto> {
    const now = new Date();
    const last = await this.visitorRepository.latestOtp(phone);
    if (last) {
      const waitSeconds = Math.ceil(
        CUSTOMER_AUTH.OTP_RESEND_SECONDS - (now.getTime() - last.createdAt.getTime()) / 1000,
      );
      if (waitSeconds > 0) {
        throw new ApiError(
          StatusCodes.TOO_MANY_REQUESTS,
          ValidationMessages.otpResendWait(waitSeconds),
        );
      }
    }
    const sentLastHour = await this.visitorRepository.countOtpsSince(
      phone,
      new Date(now.getTime() - HOUR_MS),
    );
    if (sentLastHour >= CUSTOMER_AUTH.OTP_MAX_SENDS_PER_HOUR) {
      throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, ValidationMessages.OTP_HOURLY_LIMIT);
    }

    const code = generateOtp(CUSTOMER_AUTH.OTP_LENGTH);
    await this.visitorRepository.createOtp(
      phone,
      hashOtp(phone, code),
      minutesFromNow(CUSTOMER_AUTH.OTP_TTL_MINUTES, now),
    );

    // OTP messages are not written to the admin SMS log, so staff never see login codes.
    const result = await this.smsProvider.send({
      to: phone,
      body: `${code} is your login code for The Riverside Cricket Box. It expires in ${CUSTOMER_AUTH.OTP_TTL_MINUTES} minutes. Do not share it.`,
      templateId: env.MSG91_TEMPLATE_OTP,
      variables: { otp: code },
    });
    if (result.status === 'failed') {
      console.error(`OTP SMS to ${phone} failed: ${result.error}`);
      throw new ApiError(StatusCodes.BAD_GATEWAY, ValidationMessages.OTP_SEND_FAILED);
    }

    const showDevCode = env.NODE_ENV !== 'production' && result.status === 'simulated';
    return {
      message: ResponseMessages.OTP_SENT,
      phone,
      expiresIn: CUSTOMER_AUTH.OTP_TTL_MINUTES * 60,
      resendAfter: CUSTOMER_AUTH.OTP_RESEND_SECONDS,
      ...(showDevCode && { devCode: code }),
    };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<VisitorSessionDto> {
    const otp = await this.visitorRepository.latestActiveOtp(input.phone);
    if (!otp) throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OTP_EXPIRED);
    if (otp.expiresAt <= new Date()) {
      await this.visitorRepository.consumeOtp(otp.id);
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OTP_EXPIRED);
    }
    if (!otpMatches(input.phone, input.code, otp.codeHash)) {
      const attempts = otp.attempts + 1;
      const burn = attempts >= CUSTOMER_AUTH.OTP_MAX_ATTEMPTS;
      await this.visitorRepository.recordOtpAttempt(otp.id, burn);
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        burn ? ValidationMessages.OTP_TOO_MANY_ATTEMPTS : ValidationMessages.OTP_INVALID,
      );
    }
    if (!(await this.visitorRepository.consumeOtp(otp.id))) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OTP_EXPIRED);
    }

    const visitor = await this.visitorRepository.touch(input.phone, input.name);
    const token = generateToken(
      visitor.id,
      CUSTOMER_AUTH.TOKEN_ROLE,
      undefined,
      env.VISITOR_JWT_EXPIRES_IN,
    );
    return {
      token,
      tokenType: 'Bearer',
      expiresIn: tokenExpiresInSeconds(token),
      visitor: toVisitorDto(visitor),
      needsName: visitor.name.trim().length < 2,
    };
  }

  // Signed-in customer

  async me(phone: string): Promise<VisitorDto> {
    return toVisitorDto(await this.getEntity(phone));
  }

  async updateProfile(phone: string, input: UpdateProfileInput): Promise<VisitorDto> {
    await this.getEntity(phone);
    const updated = await this.visitorRepository.updateProfile(phone, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.birthday !== undefined && {
        birthday: input.birthday === null ? null : parseDateOnly(input.birthday),
      }),
    });
    return toVisitorDto(updated);
  }

  async cleanupOtps(): Promise<void> {
    await this.visitorRepository.deleteOtpsBefore(new Date(Date.now() - 2 * HOUR_MS));
  }

  // Admin

  async getCustomer(phone: string): Promise<CustomerDto> {
    const visitor = await this.getEntity(phone);
    const [stat] = await this.visitorRepository.bookingStatsForPhones([phone]);
    return toCustomerDto(visitor, stat);
  }

  async listCustomers(query: CustomersQuery): Promise<{ total: number; records: CustomerDto[] }> {
    const { total, records } = await this.visitorRepository.findMany(
      query.search,
      query.limit,
      query.skip,
    );
    const stats = await this.visitorRepository.bookingStatsForPhones(records.map(v => v.phone));
    const statsByPhone = new Map(stats.map(s => [s.customerPhone, s]));

    return {
      total,
      records: records.map(visitor => toCustomerDto(visitor, statsByPhone.get(visitor.phone))),
    };
  }

  private async getEntity(phone: string): Promise<Visitor> {
    const visitor = await this.visitorRepository.findByPhone(phone);
    if (!visitor) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.VISITOR_NOT_FOUND);
    }
    return visitor;
  }
}
