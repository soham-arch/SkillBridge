import {
  submitVerificationRequest,
  reviewVerification,
  getMarketplaceState,
} from '@/lib/store/marketplace-store';
import { VerificationRequest } from '@/types';

export async function requestStudentVerification(params: {
  userId: string;
  collegeName: string;
  collegeEmail?: string;
  documentUrl?: string;
  documentType: 'college_id_card' | 'student_email';
}): Promise<VerificationRequest> {
  return submitVerificationRequest(params);
}

export async function fetchUserVerificationStatus(userId: string): Promise<VerificationRequest | null> {
  const state = getMarketplaceState();
  const req = state.verifications.find((v) => v.user_id === userId);
  return req ?? null;
}

export async function fetchAllVerifications(): Promise<VerificationRequest[]> {
  const state = getMarketplaceState();
  return state.verifications.map((v) => {
    const user = state.profiles.find((p) => p.user_id === v.user_id);
    return {
      ...v,
      user: user
        ? {
            id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            email: user.email,
            college: user.college,
          }
        : undefined,
    };
  });
}

export async function adminReviewVerification(requestId: string, approve: boolean, notes?: string): Promise<void> {
  reviewVerification(requestId, approve, notes);
}
