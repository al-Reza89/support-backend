export type User = {
  id: string;
  email: string;
  googleId?: string;
  isGoogleAccount: boolean;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImage?: string;
  locale?: string;
  provider?: string;
  createdAt: Date;
  updatedAt: Date;
};
