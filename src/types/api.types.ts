export type ApiSuccess<T> = {
  success: true;
  data: T;
  requestId?: string;
};

export type ApiPaginated<T> = {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  requestId?: string;
};

export type ApiError = {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
  requestId?: string;
};
