import { Visitor } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { toRupees } from '../../../utils/money.util';
import { VisitorRepository } from '../repositories/visitor.repository';
import {
  CustomerDto,
  CustomersQuery,
  UpsertVisitorInput,
  VisitorDto,
} from '../types/visitor.types';

const toVisitorDto = (visitor: Visitor): VisitorDto => ({
  id: visitor.id,
  name: visitor.name,
  phone: visitor.phone,
  createdAt: visitor.createdAt,
  lastSeenAt: visitor.lastSeenAt,
});

type BookingStat = Awaited<ReturnType<VisitorRepository['bookingStatsForPhones']>>[number];

const toCustomerDto = (visitor: Visitor, stat?: BookingStat): CustomerDto => ({
  id: visitor.id,
  name: visitor.name,
  phone: visitor.phone,
  count: stat?._count._all ?? 0,
  totalSpent: toRupees(stat?._sum.totalPaise ?? 0),
  firstSeen: visitor.createdAt,
  lastSeen: visitor.lastSeenAt,
  lastBookingAt: stat?._max.createdAt ?? null,
});

export class VisitorService {
  constructor(private readonly visitorRepository: VisitorRepository) {}

  async upsert(input: UpsertVisitorInput): Promise<VisitorDto> {
    return toVisitorDto(await this.visitorRepository.upsert(input.name, input.phone));
  }

  async getByPhone(phone: string): Promise<VisitorDto> {
    const visitor = await this.visitorRepository.findByPhone(phone);
    if (!visitor) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.VISITOR_NOT_FOUND);
    }
    return toVisitorDto(visitor);
  }

  async getCustomer(phone: string): Promise<CustomerDto> {
    const visitor = await this.visitorRepository.findByPhone(phone);
    if (!visitor) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.VISITOR_NOT_FOUND);
    }
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
      records: records.map(visitor => {
        const stat = statsByPhone.get(visitor.phone);
        return toCustomerDto(visitor, stat);
      }),
    };
  }
}
