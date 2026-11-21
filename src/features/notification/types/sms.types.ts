import { z } from 'zod';

import { smsQuerySchema } from '../schemas/sms.schema';

export type SmsQuery = z.infer<typeof smsQuerySchema>;
