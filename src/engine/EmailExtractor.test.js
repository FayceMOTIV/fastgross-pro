import { describe, it, expect } from 'vitest'
import {
  isJunkEmail,
  getEmailPriority,
  prioritizeEmails,
  extractEmailsFromHtml,
  extractPhoneFromHtml,
  validateEmail,
} from './EmailExtractor'

describe('EmailExtractor', () => {
  describe('isJunkEmail', () => {
    it('should identify noreply emails as junk', () => {
      expect(isJunkEmail('noreply@example.com')).toBe(true)
      expect(isJunkEmail('no-reply@company.com')).toBe(true)
    })

    it('should identify platform emails as junk', () => {
      expect(isJunkEmail('test@wordpress.com')).toBe(true)
      expect(isJunkEmail('shop@wixpress.com')).toBe(true)
      expect(isJunkEmail('site@squarespace.com')).toBe(true)
    })

    it('should identify example.com as junk', () => {
      expect(isJunkEmail('contact@example.com')).toBe(true)
    })

    it('should allow valid business emails', () => {
      expect(isJunkEmail('contact@business.com')).toBe(false)
      expect(isJunkEmail('jean.dupont@company.fr')).toBe(false)
      expect(isJunkEmail('support@monsite.fr')).toBe(false)
    })
  })

  describe('getEmailPriority', () => {
    it('should give highest priority to personal emails', () => {
      const priority = getEmailPriority('jean.dupont@company.fr')
      expect(priority).toBe(100)
    })

    it('should recognize contact emails', () => {
      const priority = getEmailPriority('contact@company.fr')
      expect(priority).toBe(60)
    })

    it('should recognize info emails', () => {
      const priority = getEmailPriority('info@company.fr')
      expect(priority).toBe(50)
    })

    it('should recognize commercial emails', () => {
      const priority = getEmailPriority('commercial@company.fr')
      expect(priority).toBe(70)
    })

    it('should give default priority to unknown prefixes', () => {
      const priority = getEmailPriority('xyz@company.fr')
      expect(priority).toBeGreaterThanOrEqual(30)
    })
  })

  describe('prioritizeEmails', () => {
    it('should sort emails by priority', () => {
      const emails = ['info@test.com', 'contact@test.com', 'jean.dupont@test.com']
      const sorted = prioritizeEmails(emails)

      expect(sorted[0]).toBe('jean.dupont@test.com')
      expect(sorted[1]).toBe('contact@test.com')
      expect(sorted[2]).toBe('info@test.com')
    })
  })

  describe('extractEmailsFromHtml', () => {
    it('should extract standard emails from HTML', () => {
      const html = '<p>Contact us at contact@mysite.com or info@test.fr</p>'
      const emails = extractEmailsFromHtml(html)

      expect(emails).toContain('contact@mysite.com')
      expect(emails).toContain('info@test.fr')
    })

    it('should extract obfuscated emails', () => {
      const html = '<p>Email: contact [at] mysite [dot] com</p>'
      const emails = extractEmailsFromHtml(html)

      expect(emails.length).toBeGreaterThan(0)
    })

    it('should filter out junk emails', () => {
      const html = '<p>noreply@site.com and contact@business.com</p>'
      const emails = extractEmailsFromHtml(html)

      expect(emails).not.toContain('noreply@site.com')
      expect(emails).toContain('contact@business.com')
    })

    it('should deduplicate emails', () => {
      const html = '<p>contact@site.com and contact@site.com again</p>'
      const emails = extractEmailsFromHtml(html)

      expect(emails.filter((e) => e === 'contact@site.com')).toHaveLength(1)
    })
  })

  describe('extractPhoneFromHtml', () => {
    it('should extract French phone numbers', () => {
      const html = '<p>Appelez-nous au 06 12 34 56 78</p>'
      const phone = extractPhoneFromHtml(html)

      expect(phone).toBe('0612345678')
    })

    it('should handle +33 format', () => {
      const html = '<p>Tel: +33 6 12 34 56 78</p>'
      const phone = extractPhoneFromHtml(html)

      expect(phone).toBe('0612345678')
    })

    it('should return empty string if no phone found', () => {
      const html = '<p>No phone here</p>'
      const phone = extractPhoneFromHtml(html)

      expect(phone).toBe('')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const result = validateEmail('contact@monsite.fr')
      expect(result.valid).toBe(true)
    })

    it('should reject invalid email format', () => {
      const result = validateEmail('not-an-email')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('format_invalid')
    })

    it('should reject junk emails', () => {
      const result = validateEmail('noreply@company.com')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('junk_email')
    })

    it('should reject example.com domain', () => {
      const result = validateEmail('contact@example.com')
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('junk_email')
    })
  })
})
