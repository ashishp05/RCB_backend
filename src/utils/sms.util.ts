import { env } from '../config/env-config';
import { toE164India } from './phone.util';

export interface SmsPayload {
  to: string;
  body: string;
  // MSG91 flow template id (DLT) and its variables. Ignored by other providers.
  templateId?: string;
  variables?: Record<string, string>;
}

export interface SmsResult {
  provider: string;
  status: 'sent' | 'failed' | 'simulated';
  providerId?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(payload: SmsPayload): Promise<SmsResult>;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// MSG91 Flow API: DLT template + variables. https://docs.msg91.com/reference/send-sms
class Msg91Provider implements SmsProvider {
  readonly name = 'msg91';

  async send(payload: SmsPayload): Promise<SmsResult> {
    if (!env.MSG91_AUTH_KEY || !payload.templateId) {
      return { provider: this.name, status: 'failed', error: 'MSG91 auth key or template missing' };
    }
    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY },
        body: JSON.stringify({
          template_id: payload.templateId,
          sender: env.MSG91_SENDER_ID,
          short_url: '0',
          recipients: [{ mobiles: toE164India(payload.to).slice(1), ...payload.variables }],
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        type?: string;
        message?: string;
      };
      if (!response.ok || json.type !== 'success') {
        return {
          provider: this.name,
          status: 'failed',
          error: json.message || response.statusText,
        };
      }
      return { provider: this.name, status: 'sent', providerId: json.message };
    } catch (error) {
      return { provider: this.name, status: 'failed', error: errorMessage(error) };
    }
  }
}

class TwilioProvider implements SmsProvider {
  readonly name = 'twilio';

  async send(payload: SmsPayload): Promise<SmsResult> {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = env;
    if (!sid || !token || !from) {
      return { provider: this.name, status: 'failed', error: 'Twilio credentials missing' };
    }
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            To: toE164India(payload.to),
            From: from,
            Body: payload.body,
          }),
        },
      );
      const json = (await response.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!response.ok) {
        return {
          provider: this.name,
          status: 'failed',
          error: json.message || response.statusText,
        };
      }
      return { provider: this.name, status: 'sent', providerId: json.sid };
    } catch (error) {
      return { provider: this.name, status: 'failed', error: errorMessage(error) };
    }
  }
}

// Development provider: prints the message and records it as simulated.
class ConsoleProvider implements SmsProvider {
  readonly name = 'console';

  async send(payload: SmsPayload): Promise<SmsResult> {
    console.info(`[sms] to ${payload.to}: ${payload.body}`);
    return { provider: this.name, status: 'simulated' };
  }
}

export const createSmsProvider = (): SmsProvider => {
  switch (env.SMS_PROVIDER) {
    case 'msg91':
      return new Msg91Provider();
    case 'twilio':
      return new TwilioProvider();
    default:
      return new ConsoleProvider();
  }
};
