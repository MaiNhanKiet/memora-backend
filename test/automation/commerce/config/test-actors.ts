export interface TestActor {
  role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER' | 'GUEST';
  email: string;
  password?: string;
  token?: string;
  customerId?: string;
  guestSessionId?: string;
}

export const TEST_ACTORS: Record<string, TestActor> = {
  admin: {
    role: 'ADMIN',
    email: process.env.TEST_ADMIN_EMAIL || 'admin@memora.vn',
    password: process.env.TEST_ADMIN_PASSWORD || 'MemoraAdmin123!',
  },
  manager: {
    role: 'MANAGER',
    email: process.env.TEST_MANAGER_EMAIL || 'manager@memora.vn',
    password: process.env.TEST_MANAGER_PASSWORD || 'MemoraManager123!',
  },
  staff: {
    role: 'STAFF',
    email: process.env.TEST_STAFF_EMAIL || 'staff@memora.vn',
    password: process.env.TEST_STAFF_PASSWORD || 'MemoraStaff123!',
  },
  customer: {
    role: 'CUSTOMER',
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@memora.vn',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'MemoraCustomer123!',
  },
  guest: {
    role: 'GUEST',
    email: 'guest@memora.vn',
  },
};
