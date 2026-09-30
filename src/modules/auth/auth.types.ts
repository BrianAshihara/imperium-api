export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUserPublic = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

export type AuthTokenResponse = {
  accessToken: string;
};

export type RegisterResponse = {
  user: AuthUserPublic;
  accessToken: string;
};
