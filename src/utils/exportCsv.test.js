import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCsv } from './exportCsv'

describe('exportToCsv', () => {
  let mockLink
  let mockUrl

  beforeEach(() => {
    mockUrl = 'blob:test-url'
    mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }

    global.Blob = vi.fn()

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should warn and return early for empty data', () => {
    exportToCsv([], 'test')

    expect(console.warn).toHaveBeenCalledWith('No data to export')
    expect(mockLink.click).not.toHaveBeenCalled()
  })

  it('should warn and return early for null data', () => {
    exportToCsv(null, 'test')

    expect(console.warn).toHaveBeenCalledWith('No data to export')
  })

  it('should create blob with CSV content', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ]

    exportToCsv(data, 'users')

    expect(global.Blob).toHaveBeenCalled()
    expect(mockLink.click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('should set correct download filename', () => {
    const data = [{ id: 1 }]

    exportToCsv(data, 'export')

    expect(mockLink.download).toMatch(/^export_\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
