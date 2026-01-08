import { describe, it, expect } from 'vitest';
import { hasPermission, getRolePermissions, hasPermissionWithScope } from '@/lib/permissions/matrix';

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should grant ADMIN full access', () => {
      expect(hasPermission('ADMIN', 'jobs', 'create')).toBe(true);
      expect(hasPermission('ADMIN', 'jobs', 'delete')).toBe(true);
      expect(hasPermission('ADMIN', 'users', 'update')).toBe(true);
      expect(hasPermission('ADMIN', 'audit', 'read')).toBe(true);
    });

    it('should allow REPORTER to create and manage own jobs', () => {
      expect(hasPermission('REPORTER', 'jobs', 'create')).toBe(true);
      expect(hasPermission('REPORTER', 'jobs', 'read')).toBe(true);
      expect(hasPermission('REPORTER', 'jobs', 'assign')).toBe(true);
    });

    it('should restrict SCOPIST to assigned jobs only', () => {
      expect(hasPermission('SCOPIST', 'jobs', 'read')).toBe(true);
      expect(hasPermission('SCOPIST', 'jobs', 'create')).toBe(false);
      expect(hasPermission('SCOPIST', 'jobs', 'delete')).toBe(false);
    });

    it('should restrict ATTORNEY to shared transcripts', () => {
      expect(hasPermission('ATTORNEY', 'transcripts', 'read')).toBe(true);
      expect(hasPermission('ATTORNEY', 'transcripts', 'export')).toBe(true);
      expect(hasPermission('ATTORNEY', 'transcripts', 'update')).toBe(false);
    });

    it('should deny access for non-existent permissions', () => {
      expect(hasPermission('SCOPIST', 'admin', 'read')).toBe(false);
      expect(hasPermission('ATTORNEY', 'users', 'update')).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for a role', () => {
      const permissions = getRolePermissions('REPORTER');
      
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.every(p => p.resource === 'jobs' || p.resource === 'transcripts' || p.resource === 'files' || p.resource === 'calendar')).toBe(true);
    });

    it('should return empty array for invalid role', () => {
      // TypeScript will prevent this, but test runtime behavior
      const permissions = getRolePermissions('INVALID_ROLE' as any);
      expect(permissions).toHaveLength(0);
    });
  });

  describe('hasPermissionWithScope', () => {
    it('should check scope correctly', () => {
      expect(hasPermissionWithScope('REPORTER', 'jobs', 'create', 'own')).toBe(true);
      expect(hasPermissionWithScope('REPORTER', 'jobs', 'create', 'all')).toBe(false);
      expect(hasPermissionWithScope('ADMIN', 'jobs', 'create', 'all')).toBe(true);
    });
  });
});
