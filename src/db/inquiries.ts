import { db } from './index.ts';
import { inquiries } from './schema.ts';

export async function saveInquiry(name: string, email: string, subject: string, message: string) {
  try {
    const result = await db
      .insert(inquiries)
      .values({
        name,
        email,
        subject,
        message,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in saveInquiry:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getInquiries() {
  try {
    return await db.select().from(inquiries);
  } catch (error) {
    console.error('Database query failed in getInquiries:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
