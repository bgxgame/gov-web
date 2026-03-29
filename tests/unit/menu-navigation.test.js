import { describe, expect, it } from 'vitest'
import { resolveMenuTargetPath } from '../../src/utils/menu-navigation'

describe('menu navigation', () => {
  it('should keep valid route paths', () => {
    expect(resolveMenuTargetPath('/project/manage')).toBe('/project/manage')
    expect(resolveMenuTargetPath(' /system/user ')).toBe('/system/user')
  })

  it('should ignore sub menu indexes and invalid values', () => {
    expect(resolveMenuTargetPath('project')).toBe('')
    expect(resolveMenuTargetPath('settings')).toBe('')
    expect(resolveMenuTargetPath('')).toBe('')
    expect(resolveMenuTargetPath(null)).toBe('')
  })
})
