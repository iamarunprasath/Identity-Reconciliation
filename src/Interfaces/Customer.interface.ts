export interface Customer {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type customerType = {
  id: number;
  phoneNumber?: string | null;
  email?: string | null;
  linkedId: number | null;
  linkPrecedence?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export interface CustomerResponseFields {
  primaryContactId: number;
  email: (string | null)[];
  phoneNumber: (string | null)[];
  secondaryContactIds: (number | null)[];
}

export interface CustomerResponse {
  contact: CustomerResponseFields;
}
