import path from 'path';

import { APP_NAME } from '../constants/config.constants';
import { renderEmailTemplate, sendEmail } from './email.helper';

// Resolves to src/templates in dev and dist/templates in a build (copied by `npm run build`).
const templatesDirPath = path.join(__dirname, '..', 'templates');
const logoUrl = 'https://example.com/assets/images/logo.png';

export interface ForgotPasswordEmailOptions {
  email: string;
  name?: string;
  resetLink: string;
}

export interface NewUserInvitationEmailOptions {
  email: string;
  name: string;
  role?: string;
  loginLink: string;
}

/**
 * Send forgot password reset email with .hbs template
 */
export const sendForgotPasswordEmail = async (options: ForgotPasswordEmailOptions) => {
  const { email, name = 'User', resetLink } = options;

  const templatePath = path.join(templatesDirPath, 'admin', 'forgot_password.hbs');

  const html = renderEmailTemplate({
    templatePath,
    data: {
      name,
      resetLink,
      logoUrl,
      appName: APP_NAME,
    },
  });

  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
  });
};

/**
 * Send new user invitation email with .hbs template
 */
export const sendNewUserInvitationEmail = async (options: NewUserInvitationEmailOptions) => {
  const { email, name, role, loginLink } = options;

  const templatePath = path.join(templatesDirPath, 'admin', 'new_user_invitation.hbs');

  const html = renderEmailTemplate({
    templatePath,
    data: {
      name,
      email,
      role,
      loginLink,
      logoUrl,
      appName: APP_NAME,
    },
  });

  return sendEmail({
    to: email,
    subject: 'Welcome Aboard',
    html,
  });
};
