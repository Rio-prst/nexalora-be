import { Inject, Injectable } from '@nestjs/common';
import { IProfileRepository } from './interfaces/profile.repository.interface.js';
/**
 * Creates the `profiles` row the first time an authenticated account is seen.
 *
 * Identity lives in Supabase, but the twelve private tables foreign-key into
 * `profiles.user_id`. Without this, a student who has just signed up gets a
 * 404 from `GET /api/profile` and a foreign-key violation from every write
 * endpoint. Provisioning an empty row removes both failures without asking the
 * student to fill in a form first.
 *
 * The empty row holds no personal data; the student's consent is recorded
 * separately through `PATCH /api/profile`.
 */
@Injectable()
export class ProfileProvisioningService {
  private readonly ensured = new Set<string>();

  constructor(
    @Inject(IProfileRepository)
    private readonly repository: IProfileRepository,
  ) {}

  async ensure(userId: string): Promise<void> {
    if (this.ensured.has(userId)) {
      return;
    }

    await this.repository.ensureExists(userId);
    this.ensured.add(userId);
  }

  /**
   * Drops the cache entry after the account's data is deleted, so the next
   * request provisions a fresh empty profile instead of skipping straight to a
   * query that would now return null.
   */
  forget(userId: string): void {
    this.ensured.delete(userId);
  }
}
