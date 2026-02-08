import { describe, it, expect } from 'vitest'
import { ROLES, PERMISSIONS, hasPermission, hasMinRole } from './permissions'

describe('Permissions Service', () => {
  describe('ROLES', () => {
    it('should define 5 roles', () => {
      expect(Object.keys(ROLES)).toHaveLength(5)
    })

    it('should have correct role hierarchy levels', () => {
      expect(ROLES.owner.level).toBe(100)
      expect(ROLES.admin.level).toBe(80)
      expect(ROLES.manager.level).toBe(60)
      expect(ROLES.member.level).toBe(40)
      expect(ROLES.viewer.level).toBe(20)
    })

    it('should have labels for each role', () => {
      expect(ROLES.owner.label).toBe('Proprietaire')
      expect(ROLES.admin.label).toBe('Administrateur')
      expect(ROLES.viewer.label).toBe('Observateur')
    })
  })

  describe('PERMISSIONS', () => {
    it('should define prospect permissions', () => {
      expect(PERMISSIONS['prospects:read']).toBeDefined()
      expect(PERMISSIONS['prospects:create']).toBeDefined()
      expect(PERMISSIONS['prospects:delete']).toBeDefined()
    })

    it('should have minRole for each permission', () => {
      expect(PERMISSIONS['prospects:read'].minRole).toBe('viewer')
      expect(PERMISSIONS['prospects:create'].minRole).toBe('member')
      expect(PERMISSIONS['prospects:delete'].minRole).toBe('manager')
    })
  })

  describe('hasPermission', () => {
    it('should grant owner all permissions', () => {
      expect(hasPermission('owner', 'prospects:delete')).toBe(true)
      expect(hasPermission('owner', 'team:manage')).toBe(true)
      expect(hasPermission('owner', 'org:billing')).toBe(true)
    })

    it('should restrict viewer to read-only', () => {
      expect(hasPermission('viewer', 'prospects:read')).toBe(true)
      expect(hasPermission('viewer', 'prospects:create')).toBe(false)
      expect(hasPermission('viewer', 'prospects:delete')).toBe(false)
    })

    it('should allow member to create but not delete', () => {
      expect(hasPermission('member', 'prospects:create')).toBe(true)
      expect(hasPermission('member', 'prospects:delete')).toBe(false)
    })

    it('should return false for unknown role', () => {
      expect(hasPermission('unknown', 'prospects:read')).toBe(false)
    })

    it('should return false for unknown permission', () => {
      expect(hasPermission('owner', 'unknown:action')).toBe(false)
    })
  })

  describe('hasMinRole', () => {
    it('should correctly compare roles', () => {
      expect(hasMinRole('owner', 'admin')).toBe(true)
      expect(hasMinRole('admin', 'admin')).toBe(true)
      expect(hasMinRole('member', 'admin')).toBe(false)
      expect(hasMinRole('viewer', 'member')).toBe(false)
    })

    it('should return false for unknown roles', () => {
      expect(hasMinRole('unknown', 'admin')).toBe(false)
      expect(hasMinRole('admin', 'unknown')).toBe(false)
    })
  })
})
