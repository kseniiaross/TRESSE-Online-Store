export type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;

  addressLine1: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type ProfileResponse = {
  email?: string;

  first_name?: string;
  last_name?: string;

  address_line1?: string;
  apartment?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type ProfileUpdatePayload = {
  email?: string;

  first_name: string;
  last_name: string;

  address_line1: string;
  apartment: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};