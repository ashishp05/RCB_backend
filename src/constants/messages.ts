export const ResponseMessages = Object.freeze({
  // Generic & Helper Responses
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  FETCHED: 'Fetched successfully',

  // Auth & User Responses
  LOGIN_SUCCESSFUL: 'Logged in successfully',
  LOGOUT_SUCCESSFUL: 'Logged out successfully',
  REGISTRATION_SUCCESSFUL: 'Registered successfully',
  PROFILE_FETCH_SUCCESS: 'Profile fetched successfully',
  PROFILE_UPDATED_SUCCESS: 'Profile updated successfully',
  STATUS_UPDATED_SUCCESS: 'Status updated successfully',
  PASSWORD_CHANGED_SUCCESS: 'Password changed successfully',
});

export const ValidationMessages = Object.freeze({
  // Generic / System errors
  SOMETHING_WENT_WRONG: 'Something went wrong',
  INVALID_DATA: 'Received data is not valid',
  RECORD_NOT_FOUND: 'Record not found',
  DUPLICATE_RECORD: 'A record with these details already exists',
  UNAUTHORIZED: 'Unauthorized request',
  NOT_ALLOWED: 'You are not allowed to perform this action',
  BAD_REQUEST: 'Bad request',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  ROUTE_NOT_FOUND: 'Route not found or wrong API method',
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  ORIGIN_HEADER_IS_MISSING: 'Origin header is missing',
  ACCESS_FORBIDDEN: 'Access Forbidden',

  // Auth Errors
  INVALID_CREDENTIALS: 'Invalid credentials',
  OLD_PASSWORD_INCORRECT: 'Current password is incorrect',
  ACCOUNT_INACTIVE: 'Account is inactive or suspended',

  // Admin Errors
  ADMIN_NOT_FOUND: 'Admin not found',
  ADMIN_EXISTS_WITH_EMAIL: 'Admin already exists with the provided Email',

  // Dynamic field helper functions
  required: (field: string) => `${field} is required`,
  invalid: (field: string) => `Invalid ${field}`,
  min: (field: string, length: number) => `${field} must be at least ${length} characters`,
  max: (field: string, length: number) => `${field} cannot exceed ${length} characters`,
  alreadyExists: (field: string) => `${field} already exists`,
  invalidFileType: (field: string, allowed: string) =>
    `Invalid file type for '${field}'. Allowed types: ${allowed}`,
  fileSizeExceeded: (field: string, limitMB: string) =>
    `File size for '${field}' exceeds maximum limit of ${limitMB}MB`,
  uploadError: (msg: string) => `File upload failed: ${msg}`,
});
