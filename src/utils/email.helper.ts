import fs from 'fs';
import Handlebars from 'handlebars';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

import { env } from '../config/env-config';
import { ValidationMessages } from '../constants/messages';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: nodemailer.SendMailOptions['attachments'];
}

export interface RenderTemplateOptions {
  templatePath: string;
  data?: Record<string, unknown>;
}

export interface BulkEmailItem extends SendEmailOptions {}

export interface BulkEmailResultItem {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailOptions {
  emails: BulkEmailItem[];
  batchSize?: number;
  delayMs?: number;
}

/**
 * Create and return Nodemailer transporter instance
 */
export const getTransporter = (options: { pool?: boolean } = {}): Transporter => {
  const { pool = false } = options;

  const transportOptions: SMTPTransport.Options & {
    pool?: boolean;
    maxMessages?: number;
    maxConnections?: number;
  } = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    pool,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    ...(pool
      ? {
          maxMessages: Infinity,
          maxConnections: 5,
        }
      : {}),
  };

  return nodemailer.createTransport(transportOptions, {
    from: `${env.SMTP_SENDER_NAME} <${env.SMTP_USER || 'noreply@example.com'}>`,
  });
};

/**
 * Compile and render Handlebars (.hbs) template from file path
 */
export const renderEmailTemplate = (options: RenderTemplateOptions): string => {
  const { templatePath, data = {} } = options;

  if (!templatePath || !fs.existsSync(templatePath)) {
    console.warn(`⚠️ Email Template file not found at: ${templatePath}`);
    return '';
  }

  const rawTemplate = fs.readFileSync(templatePath, 'utf-8');
  const compiledTemplate = Handlebars.compile(rawTemplate);
  return compiledTemplate(data);
};

/**
 * Send a single email
 */
export const sendEmail = async (options: SendEmailOptions) => {
  const { to, subject, html, text, attachments = [] } = options;

  if (env.DISABLE_EMAIL) {
    return { success: true, disabled: true };
  }

  if (!to || !subject) {
    return {
      success: false,
      message: ValidationMessages.INVALID_DATA,
    };
  }

  const transporter = getTransporter({ pool: false });
  const mailOptions = {
    to,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ Error sending email to ${to}:`, errMessage);
    return { success: false, error: errMessage };
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send bulk emails in batches with rate-limiting delay
 */
export const sendBulkEmail = async (options: BulkEmailOptions) => {
  const { emails = [], batchSize = 10, delayMs = 1000 } = options;

  if (env.DISABLE_EMAIL) {
    return { success: true, disabled: true, total: emails.length };
  }

  if (!Array.isArray(emails) || emails.length === 0) {
    return { successCount: 0, failureCount: 0, results: [] };
  }

  const transporter = getTransporter({ pool: true });
  const results: BulkEmailResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const batchPromises = batch.map(async emailItem => {
      const mailOptions = {
        to: emailItem.to,
        subject: emailItem.subject,
        html: emailItem.html,
        text: emailItem.text,
        attachments: emailItem.attachments || [],
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        successCount++;
        return { to: emailItem.to, success: true, messageId: info.messageId };
      } catch (error) {
        failureCount++;
        const errMessage = error instanceof Error ? error.message : String(error);

        console.error(`❌ Bulk email failed for ${emailItem.to}:`, errMessage);
        return { to: emailItem.to, success: false, error: errMessage };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + batchSize < emails.length && delayMs > 0) {
      await delay(delayMs);
    }
  }

  return {
    total: emails.length,
    successCount,
    failureCount,
    results,
  };
};
